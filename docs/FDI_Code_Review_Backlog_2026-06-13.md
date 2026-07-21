# FDI — Revisión de código y backlog de mejoras (2026-06-13)

> **Autor:** Claude Release (rol: validar/empaquetar). Este documento es **solo análisis y
> propuesta**; no se modificó funcionalidad. Implementación a cargo de **Codex**.
>
> **Base de evidencia:** revisión del fuente desempaquetado del `.msapp`
> (`Src/*.pa.yaml`, componentes), el PCF (`pcf/FDIHtmlEditor/`) y el reporte oficial
> `AppCheckerResult.sarif` que Power Apps Studio dejó embebido en el `.msapp`.
>
> **Commit revisado:** `339c066` — *Corrige propiedad FontColor en Bitacora*
> **Rama:** `claude/revert-richtext-baseline`

---

## ⚠️ Caveat importante: el App Checker está desfasado

El `AppCheckerResult.sarif` embebido proviene de un **publish anterior** en Studio, no del
HEAD actual de Codex. Evidencia: el SARIF aún reporta `RichTextEditorCorreo isn't recognized`
en `scrCorreo.OnVisible`, pero ese control **ya no existe** en el código (se limpió en el
revert de richtext).

**Acción recomendada antes de atacar el backlog:** abrir la app en Power Apps Studio y
re-publicar para **regenerar el App Checker**. Algunos hallazgos High podrían estar ya
resueltos, y otros nuevos (introducidos por ediciones posteriores de Codex) podrían no estar
detectados todavía.

Resumen del SARIF embebido: **77 hallazgos** → 17 High (errores), 60 Medium.

---

## 🔴 Prioridad ALTA — Errores reales (App Checker nivel High)

Los 17 errores High se concentran en los combos del formulario de `scrFDI`.

### #1 — Combos en cascada: preselección rota al editar un FDI existente

Cliente, País, Estado y Ciudad resuelven su valor por defecto con `Parent.Default.Id` /
`Parent.Default.Value`:

| Combo | Ubicación | Fórmula |
|---|---|---|
| Cliente | `scrFDI.pa.yaml:920` | `ID = Parent.Default.Id \|\| Title = Parent.Default.Value` |
| País | `scrFDI.pa.yaml:1932-1934` | `IsBlank(Parent.Default.Id)` … `Filter(Países_List, ID = Parent.Default.Id)` |
| Estado | `scrFDI.pa.yaml:2063-2065` | `Filter(Estados_List, ID = Parent.Default.Id)` |
| Ciudad | `scrFDI.pa.yaml:2193-2195` | `Filter(Ciudades_List, ID = Parent.Default.Id)` |

Errores encadenados que reporta el checker sobre estas líneas:

- `app-ErrInvalidName` (×9): *"Name isn't valid. 'Id' isn't recognized"* / *"'Value' isn't
  recognized"* — `Parent.Default` es texto/lookup simple y **no tiene** miembro `.Id`/`.Value`.
- `app-ErrIncompatibleTypesForEquality` (×5): *"Incompatible types for comparison: Number,
  Error"* — como `.Id` evalúa a `Error`, la comparación `ID = Parent.Default.Id` nunca resuelve.
- `app-ErrInvalidArgs-Func` (×3): *"IsBlank has invalid arguments"* — `IsBlank(Parent.Default.Id)`
  sobre un miembro inválido.

**Impacto probable:** al abrir un FDI existente para **editar**, estos combos no preseleccionan
el valor guardado (quedan vacíos).

**Propuesta:** según el tipo real de cada columna del datacard, reemplazar `Parent.Default.Id`
por `Parent.Default` (si es texto), `Parent.Default.Value` (si es choice) o `Text(Parent.Default)`.
Verificar específicamente el flujo de **edición** de un FDI ya creado.

### #2 — Regenerar App Checker

Ver caveat arriba. Re-publicar en Studio para refrescar el SARIF antes de cerrar este backlog.

---

## ⚡ Prioridad MEDIA — Rendimiento

### #3 — `OnStart` secuencial sin `Concurrent`  (`App.OnStart`)

El arranque hace 4 `LookUp` a SharePoint en serie (`Cotizadores`, `Vendedores` ×2) más
`LoadData`. `Concurrent(` aparece **0 veces** en toda la app. Envolver las cargas
independientes en `Concurrent()` reduce el tiempo de arranque en frío.

### #4 — Delegación: `StartsWith` no delegable (riesgo de datos truncados)

```
scrMisCotizaciones.OnVisible:
  ClearCollect(colDocsCotizaciones,
    Filter('Carpeta cotizaciones', StartsWith('Folder path', CotizacionesGallery.Selected.FolderPath)))
```

`StartsWith` sobre columna de texto en SharePoint **no se delega** → `colDocsCotizaciones`
puede **truncar silenciosamente** a 500/2000 filas. Se repite en
`CorrecciónRequeridaGallery.SolicitarRevisiónButton.OnSelect` y otros.

Combinado con `app-DataSourceDefaultMaxRowsLimit > 500`, hay riesgo de archivos faltantes en
cotizaciones grandes. (21 advertencias `SuggestRemoteExecutionHint` en total.)

**Propuesta:** reestructurar el filtrado por carpeta para que sea delegable (p. ej. una columna
indexada de "FolderId", o filtrar por una columna de igualdad en vez de `StartsWith`).

### #5 — `ForAll` con mutación (×5)

P. ej. `scrMisCotizaciones.pa.yaml:6068` hace `Patch` dentro de `ForAll(...SelectedItems)`.
El checker (`app-ForAllWithMutation`) advierte de reevaluación excesiva. Migrar a
`Patch(fuente, tablaDeRegistros)` en lote: más rápido y transaccional.

### #6 — Pantallas sobredimensionadas

`scrFDI.pa.yaml` (≈398 KB) y `scrMisCotizaciones.pa.yaml` (≈512 KB) disparan
`app-ScreenHasManyControls` (×2) y `app-InefficientDelayLoading` (×6). Candidatas a dividir en
componentes/pantallas para acelerar el render y mejorar mantenibilidad.

---

## 🎨 Prioridad MEDIA — UI / UX

### #7 — Sistema de tema infrautilizado

En `scrFDI`: **940 literales `RGBA(...)`** frente a solo **14 referencias a `varTheme`**.
Existe un theme bien diseñado (`varTheme.PrimarioHex`, `varTheme.FondoHex`, etc., definido en
`App.OnStart`) pero casi no se usa; los colores están hardcodeados (ej. en `ClienteComboBox`:
`HoverBorderColor: =RGBA(16, 110, 190, 1)` en vez de `varTheme.PrimarioHex`).

**Impacto:** look inconsistente y rebranding costoso. **Propuesta:** migrar progresivamente los
literales a `varTheme.*`.

### #8 — Dependencias de eventos entre pantallas (×2)

`app-CrossScreenEventDependencies`: reglas que referencian controles de otra pantalla. Frágil:
si la otra pantalla aún no se renderizó, el valor es `Blank`. Pasar el dato por variable/colección.

### #9 — `varTheme` es un snapshot

`Set(varTheme, First(colTheme))` en `OnStart`. Si el usuario cambia el tema en runtime
(`colTheme`), `varTheme` queda obsoleto hasta reiniciar. Referenciar `First(colTheme)`
directamente, o re-`Set(varTheme, …)` tras cada cambio.

---

## 🧩 Prioridad MEDIA/BAJA — PCF (FDI HtmlEditor)

### #10 — Versión divergente (triple)

El incidente que advierte la skill `fdi-pcf-packaging` **sigue presente**:

| Fuente | Valor |
|---|---|
| Manifest (`ControlManifest.Input.xml:3`) | `version="1.5.1"` |
| Footer del editor (`index.ts:597`) | `ver.textContent = "v1.5.0"` |
| Mensaje de error de init (`index.ts:126`) | `"v1.2.0"` |

Las tres deberían coincidir, idealmente derivadas del manifest en build.

### #11 — Imágenes incrustadas como base64 inline

`index.ts:797` (`insertImageFile`) incrusta la imagen como data URL. Un PNG de 2 MB →
~2.7 MB de base64 dentro del HTML, que se guarda en la columna multilínea de SharePoint y
viaja en el correo. Riesgo de exceder límites de campo/tamaño de correo.

**Propuesta:** subir a biblioteca y referenciar por URL, o reducir el límite (actual: 2 MB en
`index.ts:799`).

### #12 — `document.execCommand` deprecado

API legacy (usada en `cmd()`, colores, fontSize, listas). Funciona hoy en todos los navegadores
pero sin reemplazo 1:1. No urgente; a tener en el radar para mantenibilidad a largo plazo.

---

## ✅ Fortalezas (no tocar)

- **Seguridad del PCF sólida:** allowlist de tags/atributos (`allowedTags`), `sanitizeStyle`
  bloquea `url()`/`javascript:`/`expression()`, `normalizeUrl` fuerza `rel="noopener noreferrer"`,
  validación de tipo/tamaño de imágenes.
- **Modelo de roles** centralizado y claro en `App.OnStart` (`varEsAdminFDI`,
  `varPuedeAsignarFDI`, `varPuedeVerTodoFDI`, etc.).
- **Theming responsive** por dispositivo bien pensado (Celular/Tablet/Escritorio) — aunque
  infrautilizado (ver #7).
- **Bitácora y máquina de estados** de cotizaciones bien estructuradas, con snapshots de
  usuario (`UsuarioSnapShot`, claims SP).

---

## Top 3 si hay que priorizar

1. **#1** — Preselección de combos en cascada (afecta edición de FDIs existentes).
2. **#4** — No-delegación de `StartsWith` sobre `Carpeta cotizaciones` (riesgo de datos truncados).
3. **#10** — Unificar versión del PCF (rápido; evita confusión en soporte).

---

## Apéndice — Conteo de hallazgos del App Checker (SARIF embebido)

| Regla | Nivel | Conteo |
|---|---|---|
| `app-SuggestRemoteExecutionHint` | Medium | 21 |
| `app-SuggestRemoteExecutionHint-OpNotSupportedByColumn` | Medium | 12 |
| `app-ErrInvalidName` | **High** | 9 |
| `app-CollectingReadOnlyTable` | Medium | 7 |
| `app-InefficientDelayLoading` | Medium | 6 |
| `app-ErrIncompatibleTypesForEquality-Left-Right` | **High** | 5 |
| `app-ForAllWithMutation` | Medium | 5 |
| `app-ErrInvalidArgs-Func` | **High** | 3 |
| `app-ScreenHasManyControls` | Medium | 2 |
| `app-CountRowsGalleryAllItems` | Medium | 2 |
| `app-CrossScreenEventDependencies` | Medium | 2 |
| `app-UnusedVariables` | Low | 1 |
| `app-DataSourceDefaultMaxRowsLimit` | Medium | 1 |
| `app-IndexedAccessViaCopy` | Medium | 1 |

> Reproducible: desempaquetar `CanvasApps/mapc_fdi_412ec_DocumentUri.msapp` (es un ZIP) y
> revisar `AppCheckerResult.sarif`. Recordar regenerarlo desde Studio (ver caveat).
