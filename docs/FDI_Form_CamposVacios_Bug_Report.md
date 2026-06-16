# FDI — Bug: campos del form quedan vacíos (Correo/Teléfono) y el botón Enviar no valida

> **Autor:** Claude Release. Diagnóstico sobre el **Monitor de Power Apps** (sesión del usuario
> 2026-06-16, build `f8bd8ef`, v1.0.0.16) **+ la fuente real** del `.msapp`. **Arreglo: Codex.**
> Reemplaza el diagnóstico previo del 404: ese ya está resuelto (ver abajo).

## ✅ Lo que YA quedó arreglado (no tocar)

- **Data source `Sistema selectivo` (404): RESUELTO.** El Monitor muestra `cmpCarddrp.Items`
  resolviendo `Sistema Selectivo` (GUID `49e4088a-4095-44e6-860d-fbdb57460fbc`) → **HTTP 200**
  (devuelve "Diseño / Listado de piezas / Planos/diseño de cliente / Pedido o cotización anterior").
  Ya **no hay** `'Sistema selectivo'` (minúscula) en `Src/`. Los dropdowns "Tipo de diseño" cargan.
- Rendimiento (R2 + split): vivo y ágil.

## 🔴 Causa raíz (NUEVA) — el autollenado de Contacto falla por `Selected.Id` vs `Selected.ID`

El botón **Enviar** ejecuta `SubmitForm(CotizaciónForm)` y **falla la validación** (el runtime lo
reporta, `logLevel 4`):

```
SubmitForm — validationErrors:
  ContactoLookUp        : Error de validación   (1er intento, contacto en blanco)
  Correo empresarial    : "Correo empresarial es obligatorio."
  Número de teléfono    : "Número de teléfono es obligatorio."
```

`Correo empresarial` y `Número de teléfono` son **`Required: =true`** (scrFDI líneas 2672 y 2789) y
quedan **vacíos**. Quedan vacíos porque su autollenado depende del contacto seleccionado, y **ese
autollenado se rompe**:

```powerapps
// scrFDI.pa.yaml  — ContactoLookUpComboBox.OnChange (línea 2472)
=Set(varContactoId, ContactoLookUpComboBox.Selected.Id);   // <-- .Id (minúscula) => null
 ...
 Set(varContactoFull, LookUp(Contactos, ID = varContactoId));   // ID = null  => 0 filas
 If(!varCorreoEditado, Set(varCorreoSnap, Coalesce(varContactoFull.Correo, "")));   // queda ""
 If(!varTelEditado,    Set(varTelSnap,    Coalesce(varContactoFull.Teléfono, "")));  // queda ""
```

**Evidencia Monitor:** tras seleccionar un contacto (`ContactoLookUpComboBox.SelectedItems` ≠ vacío,
ID 4), el `OnChange` dispara `getRows Contactos ?$filter=ID+eq+null` → **0 filas**. Es decir
`ContactoLookUpComboBox.Selected.Id` se evaluó a **null** → `varContactoId` = null → `varContactoFull`
en blanco → `varCorreoSnap`/`varTelSnap` = "" → los `DataCardValue` de Correo/Teléfono muestran "" →
campos requeridos vacíos → **SubmitForm no valida** → `OnSuccess` no corre → **Enviar no navega a
`scrCorreo`**.

### Por qué `.Id` da null (inconsistencia de mayúsculas)

En `scrFDI` conviven las dos formas y solo una es la correcta para cada control:

| Control | Usa | ¿Correcto? |
| --- | --- | --- |
| `ClienteComboBox` (`Items=Filter(Clientes,…)`) | `Selected.**ID**` | ✅ (la columna SP es `ID`) — su autollenado de Dirección funciona |
| `ContactoLookUpComboBox` (`Items=Choices('Cotizaciones 2026'.ContactoLookUp)`) | `Selected.**Id**` (líneas 2396 y 2472) | ❌ resuelve null en runtime |
| `VendedorComboBox` | `Selected.**Id**` (línea 1759) | ⚠️ revisar (solo guarda Id/Value, no autollena otros campos) |

Conteo en `scrFDI`: **`Selected.Id` (minúscula) ×3** vs **`Selected.ID` (Mayúscula) ×4**.

## Arreglo (Codex)

1. **Resolver bien el ID del contacto** para el autollenado. El `OnChange` debe obtener el ID que sí
   existe en `Contactos`. Opciones (Codex valida en Studio cuál compila sin X roja):
   - Releer por título: `LookUp(Contactos, Title = ContactoLookUpComboBox.Selected.Value).ID`, **o**
   - Usar la forma de ID que el `Choices(...)` realmente expone (en Studio, comprobar si es `.Id`
     mayúscula/minúscula para ese combobox) y dejar **una sola** convención.
2. Confirmar que, con el contacto seleccionado, `varCorreoSnap`/`varTelSnap` (y por ende
   `CorreoDataCardValue` / `NúmeroDeTelefonoDataCardValue`) **se llenan** → el form valida.
3. Re-probar **Enviar**: con Correo/Teléfono no vacíos, `SubmitForm` alcanza `OnSuccess` →
   `Navigate(scrCorreo)`. (En el trace, cuando el usuario tecleó valores a mano, el `PATCH` devolvió
   200 — el form **sí** envía cuando los campos requeridos tienen valor.)

## Pendiente colateral (mismo mecanismo) — "display fields vacíos en varias versiones"

El usuario reporta, desde hace varias versiones, **display fields vacíos** en el form al editar (los
combobox no muestran el valor). Es el **mismo patrón**: los `Default` dependen de variables snapshot
(`varCorreoSnap`, `varTelSnap`, `varContactoSel`, `varClienteSel`, `varCotizacionDraft.*`) que se
quedan en blanco cuando la cadena de selección/hidratación se rompe (p. ej. el `Selected.Id` null de
arriba, o `varCotizacionDraft` no sembrado en algún camino de navegación). **Codex:** auditar que al
**editar un borrador** todas las tarjetas lookup (`Cliente`, `Contacto`, `País`/`Estado`/`Ciudad`,
`Vendedor`) reciban su `DefaultSelectedItems` desde el registro hidratado, y que las convenciones
`.Selected.ID`/`.Id` sean correctas y únicas por control.

## Notas de proceso

- ⚠️ Las validaciones de empaquetado (SHA/mojibake/JSON/templates/integridad Src↔Controls) **no
  detectan errores semánticos de fórmula** como `Selected.Id`→null. Por eso el build `f8bd8ef` salió
  canónico y "limpio" pese a este bug. La lista definitiva de X rojas sale **en Studio**.
- No hay nuevo commit que empaquetar: el bug está en `f8bd8ef` (ya empaquetado). Tras el fix de Codex
  + Guardar/Publicar en Studio, se re-valida y re-empaqueta.
