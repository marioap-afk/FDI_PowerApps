# FDI — Bug: data source duplicado `Sistema selectivo` (404) rompe captura y botón Enviar

> **Autor:** Claude Release. Diagnóstico sobre el Monitor de Power Apps (sesión del usuario,
> 2026-06-16, build `31f15fb` con split + R2) + la fuente real del `.msapp`. **Arreglo: Codex
> (re-apuntar fórmulas) + usuario (limpiar data source en Studio).**

## Evidencia (Monitor)

```
getLookupResults  dataSource: "Sistema selectivo"
  table: e3e8a735-179b-4919-9994-9f30890abfcb
  entities/Tipodedise_x00f1_o   ->  HTTP 404  "List not found"

Error (logLevel 4): "Error de Sistema selectivo: List not found"
  Source: cmpCarddrp.Items   (Kind 7 — error no controlado)
```

## Causa raíz

La app declara **dos data sources casi idénticos**, diferenciados solo por mayúscula, y **usa ambos**
en `scrFDI`, `App` y las 9 pantallas `scrFDI_XXX`:

| Data source | GUID (tabla) | Estado |
| --- | --- | --- |
| `Sistema selectivo` (minúscula) | `e3e8a735-179b-4919-9994-9f30890abfcb` | ❌ **404 — la lista no existe** |
| `Sistema Selectivo` (Mayúscula) | `e3d12fc0-a6cc-4bf0-ab79-acb14b03b3ad` | ✅ (lista real, a confirmar) |

El componente reusable **`cmpCarddrp`** (dropdown "Tipo de diseño") tiene:

```powerapps
// Src/Components/cmpCarddrp.pa.yaml línea 27
Default: =Choices('Sistema selectivo'.'Tipo de diseño')   // <-- la lista MUERTA (404)
```

Como `cmpCarddrp` se instancia en **todas** las pantallas de sistema, cada dropdown "Tipo de diseño"
queda en **estado de error** (X roja).

## Por qué se rompe el botón "Enviar"

El `Navigate(scrCorreo, …)` (scrFDI línea 1706) es **la cola de un `OnSuccess`**: primero corre un
bloque grande de `Clear(...)` / `Set(...)` / `ResetForm(CotizaciónForm)` / `NewForm(...)` y **al final**
navega. Si el `SubmitForm` no llega a **éxito** (porque hay un control en error dentro del flujo del
form), `OnSuccess` no corre → **no se limpia, no se navega** → el botón parece "trabado". El data
source 404 es justo el tipo de error que impide el éxito del submit.

## Arreglo

1. **Usuario (Power Apps Studio → Datos):** confirmar el nombre EXACTO de la lista "Selectivo" en el
   sitio SharePoint *Pruebas*. Hay un data source **`Sistema selectivo` (minúscula) cuya lista
   subyacente ya no existe** (renombrada/recreada → cambió el GUID). **Quitar ese data source muerto**
   y dejar solo el que resuelve (`Sistema Selectivo`).
2. **Codex (fuente):** re-apuntar todas las referencias de `'Sistema selectivo'` →
   `'Sistema Selectivo'` (o al nombre real confirmado) en:
   `Src/Components/cmpCarddrp.pa.yaml`, `Src/App.pa.yaml`, `Src/scrFDI.pa.yaml` y las 9
   `Src/scrFDI_XXX.pa.yaml`. Que **un solo** data source de Selectivo quede referenciado.
3. Re-probar el botón **Enviar** (al quedar los dropdowns sin error, el submit alcanza `OnSuccess` y
   navega a `scrCorreo`).

## Notas

- ✅ **Rendimiento OK:** con R2 + split, el Monitor muestra `Navigate(scrFDI→scrFDI_MZL)` ágil y la
   captura "mucho más rápida" (reporte del usuario). El split **está vivo** en runtime.
- Las listas renombradas **`Hija X`** (Tarimas/Productos/Colores/…) **sí resuelven** — ese cambio
   quedó bien cableado. El único mismatch es el duplicado `Sistema selectivo` vs `Sistema Selectivo`.
- Revisar si hay otros pares duplicados por mayúscula/espacios entre los data sources declarados.
