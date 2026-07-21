# FDI — Bug: el "proceso de cotización" (Enviar) no completa aunque el form guarde

> **Autor:** Claude Release. Diagnóstico sobre la fuente real del `.msapp` (`9a6fac9`) + Monitor de la
> sesión 2026-06-16. **Arreglo: Codex.** El usuario reporta que, **aun llenando los campos requeridos
> a mano**, "hago el proceso de cotización y no funciona" → o sea, el fix de campos vacíos
> ([FDI_Form_CamposVacios_Bug_Report.md](FDI_Form_CamposVacios_Bug_Report.md)) **no es suficiente**.

## Causa raíz (arquitectura del OnSuccess)

`CotizaciónForm.OnSuccess` (scrFDI.pa.yaml, líneas **751–1633**) es **un único bloque secuencial** que
termina con `Navigate(scrCorreo, ScreenTransition.None)` **en la última línea (1633)**. Antes del
`Navigate` corren **~63 operaciones de escritura** (`Patch` / `Remove` / `Collect` / `ClearCollect`)
sobre **16 listas de SharePoint**:

- `Sistemas por cotización` (upsert del puente por cada tab)
- 7 listas **`Hija *`**: Tarimas, Productos, Colores, Elementos Seguridad, Piezas Especiales,
  Proveedores Externos, Listado Piezas (borra huérfanas + re-inserta)
- 8–9 listas **`Sistema *`**: Selectivo, Dinámico, Pushback, Drive In, Cantiliver, Mezzanine,
  Carton Flow, Mezzanine Limpio, Otro

**Consecuencia:** `Navigate(scrCorreo)` **solo se ejecuta si las 63 operaciones previas terminan sin
error**. Si **una sola** falla (lista renombrada/404, columna inexistente, nombre de campo distinto,
`Id`/lookup nulo, no-delegable), el `OnSuccess` **aborta en ese punto** y **nunca navega** ni termina
de guardar la cotización. El formulario principal sí se guarda (`patchRow` → `PATCH 200`), pero el
post-proceso muere a medias → el usuario ve "no funciona".

## Evidencia (Monitor build `f8bd8ef`)

- `SubmitForm` del form principal → `patchRow Cotizaciones/95` → **HTTP 200** (guardó).
- **Tras el 200 NO hay ninguna escritura** a `Sistemas por cotización` (tabla `b1ee600e…`) ni a las
  `Hija *` / `Sistema *`, y **no hay `Navigate(scrCorreo)`**. El `OnSuccess` se cortó casi al inicio.
- (El registro se guardó con `ContactoLookUp: {Id: null}` — coletazo del bug de `Selected.Id`.)

## Qué falta para señalar la operación exacta

Hace falta un **Monitor NUEVO del intento actual** (con el fix manual de campos puesto): abrir Monitor,
llenar la cotización, pulsar **Enviar**, y al quedarse sin avanzar **exportar el `.json`**. El **evento
de error** (logLevel 4 / 404 / validación) nombrará la **lista u operación** que rompe el `OnSuccess`
— igual que el 404 nombró `Sistema selectivo`. Sospechas iniciales a confirmar con ese trace:

1. Alguna lista `Sistema *` o `Hija *` **renombrada/recreada** (GUID nuevo → 404), como pasó con
   `Sistema selectivo`. Revisar que las 16 resuelvan.
2. Mismatch de **nombre de columna** en un `Patch` a una hija (p. ej. `SistemaCotizaciónID` con/ sin
   acento, o un campo que cambió en SharePoint).
3. Lookup con `Id` nulo dentro de los `Patch` de puente (`CotizaciónID: { Id: …, Value: … }`).

## Arreglo (Codex)

1. **Pinpoint con el trace nuevo** y corregir la lista/columna que rompe.
2. **Endurecer el `OnSuccess`** para que el `Navigate` no quede rehén de las 63 escrituras:
   - separar "guardar cabecera + navegar" de "persistir sistemas/hijas", o
   - envolver las operaciones por-sistema de forma que un fallo en una hija no aborte todo el bloque,
     o procesarlas con manejo de error y `Notify` específico (qué lista falló), dejando el `Navigate`
     alcanzable.
3. Re-probar el flujo completo end-to-end en Studio.

## Nota de proceso / empaquetado

- El build `9a6fac9` **NO es desplegable como "arreglado"**: además de este bug de `OnSuccess`, el fix
  de `Selected.Id` está en `Src/` pero **no compilado en `Controls/`** (ver
  [FDI_Form_CamposVacios_Bug_Report.md](FDI_Form_CamposVacios_Bug_Report.md) §nota). Para que cualquier
  fix quede vivo: **abrir en Studio + Guardar/Publicar**.
- Las validaciones de empaquetado (SHA/mojibake/JSON/templates) **no detectan** este tipo de fallo
  (semántico, en tiempo de ejecución sobre datos). Solo el Monitor / Studio lo revela.
