# FDI — Rendimiento de `scrFDI` (pantalla de generación de FDI/Cotización)

> **Autor:** Claude Release (rol: validar/empaquetar). **Análisis y propuesta**; la implementación
> es de **Codex**. Medido sobre la fuente real del `.msapp` de `git HEAD` (`scrFDI.pa.yaml`).
> Hermano de [FDI_MisCotizaciones_Performance.md](FDI_MisCotizaciones_Performance.md), pero para la
> pantalla de captura. **Causa de fondo: la pantalla es estructuralmente demasiado grande.**

## ⚠️ CRÍTICO — el `.msapp` está internamente inconsistente (`Src/` ≠ `Controls/`)

> **Detectado por Claude Release al empaquetar `d5691a2` (2026-06-16). Afecta a TODOS los cambios
> recientes de Codex, no solo al split. Bloquea el despliegue confiable hasta resolverse.**

Un `.msapp` válido (exportado por Studio) mantiene en sync sus dos representaciones: `Src/*.pa.yaml`
(código fuente) y `Controls/*.json` (representación compilada que consume el runtime). **En este
`.msapp` no coinciden:**

| Señal | `Src/` (lo que editó Codex) | `Controls/` (lo compilado) |
| --- | --- | --- |
| Pantallas | **18** (9 + las 9 `scrFDI_XXX`) | **9** (las nuevas **no existen**) |
| `scrFDI` | 133 controles (split) | ~2,344 controles (**mega-pantalla vieja**) |
| `DelayOutput=true` | 133 | **0** |
| People picker correo | `Destinatario`/`CC` (fix) | aún `MyPeople` (viejo) |
| `Header.LastSaved` / `AppVersion` | — | **congelados en 05:30 / 06:35** desde `9a1d298` |

**Causa raíz:** Codex edita **solo `Src/*.pa.yaml` y re-zipea**, sin regenerar `Controls/`, `Header`
ni `AppVersion`. Es el mismo motivo del `AppVersion` congelado que aparece en cada reporte de
empaquetado. **No se está guardando por Power Apps Studio.**

**Impacto:** según qué representación tome Power Apps como autoritativa al importar/reproducir, los
cambios de Codex (**split R1, DelayOutput R6, fix de correo, TipoIndex**) **podrían no surtir efecto
en la app publicada** aunque sí se vean al abrir en Studio (que lee `Src/`). El `.msapp` es, en el
mejor caso, no canónico.

**Qué hacer (Codex):** regenerar el `.msapp` **desde Power Apps Studio** — abrir la app (Studio lee
`Src/`), **Guardar/Publicar** (regenera `Controls/` + `Header` + bumpea `AppVersion`) y exportar/commitear
ese `.msapp`. El flujo actual de round-trip YAML produce `.msapp` inconsistentes.

**Prueba rápida (usuario):** importar este paquete y **reproducir** (no editar) la app. Si `scrFDI`
aparece **partido por sistema** → `Src/` es autoritativo (basta con que Codex re-guarde para limpiar).
Si `scrFDI` sigue siendo la **mega-pantalla** → `Controls/` es autoritativo y **los cambios no están
vivos**.

## Estado (tras R1) — *según `Src/`; ver advertencia crítica arriba*

Codex aplicó los **quick wins** y separó la captura por sistema **en `Src/`** (no compilado en `Controls/`):

| Ítem | Estado (en `Src/`) | Evidencia |
| --- | --- | --- |
| **R6** DelayOutput en entradas | ✅ en `Src/` (❌ en `Controls/`) | `DelayOutput=true`: **7 → 133** en Src; **0** en Controls |
| **R3** `Concurrent` en OnVisible | ✅ **Parcial** | `Concurrent(`: **0 → 1** (línea 31 de OnVisible) |
| **R1** partir la pantalla | ⚠️ en `Src/`, **sin compilar** | **9 → 18** pantallas en Src; `Controls/` sigue con 9 y `scrFDI` mega-pantalla |
| **R2** cachear el borrador | ✅ en `Src/` (❌ en `Controls/`) | lecturas de hidratación `LookUp(colXXX_Draft, …, Campo)` reemplazadas por `varDraftActual.Campo`; falta compilar por Studio |
| **R3** quitar el `CountRows(Filter)` O(n²) | ✅ **Hecho** | `TipoIndex` ya no lee `colTabs` mientras se construye; usa `colPuentesHidratacion` |
| **R5** galerías | ❌ **Pendiente** | sin cambios |

> **Lectura:** en `Src/`, la carga de `scrFDI` ya no instancia los nueve sistemas a la vez. Pero
> **mientras `Controls/` no se regenere desde Studio, esa mejora puede no estar viva en runtime**
> (ver advertencia crítica). El siguiente cuello, una vez resuelto eso, es **R2**.

## 1. Diagnóstico medido (números reales de `scrFDI`)

| Métrica | Valor | Referencia sana |
| --- | --- | --- |
| Líneas de `scrFDI.pa.yaml` | **5,639** | — |
| **Controles en `scrFDI`** | **133** | < ~300 por pantalla (guía MS) |
| Galerías | 2 en `scrFDI` / 50 en captura total | pocas, virtualizadas |
| GroupContainers | 8 en `scrFDI` / 232 en captura total | — |
| Forms / TypedDataCard | 1 / 22 | — |
| DataCards | 22 | — |
| PCF HtmlEditor (control pesado) | 0 en `scrFDI`; 1 en `scrFDI_OT` | solo el activo |
| `LookUp(` en fórmulas | 87 en `scrFDI` / **803** en captura total | — |
| `CountRows(` | 8 en `scrFDI` / 122 en captura total | — |
| `Filter(` | 59 en `scrFDI` / 133 en captura total | — |
| `ForAll(` | 43 | — |
| `Concurrent(` | **1** | usar para cargas paralelas |
| TextInputs con `DelayOutput=true` | 7/7 en `scrFDI`; **133 / 133** en captura total | completo |
| `DeserializationLoadTime` (autoría) | **~10.7 s** | proxy de bloat |
| `AnalysisLoadTime` (autoría) | **~12.9 s** | proxy de bloat |

**Los 9 sistemas ya no conviven en `scrFDI`.** Se movieron a pantallas dedicadas:

| Pantalla | `scrFDI_SEL` | `scrFDI_DIN` | `scrFDI_PBK` | `scrFDI_DRV` | `scrFDI_CAN` | `scrFDI_MEZ` | `scrFDI_CFL` | `scrFDI_MZL` | `scrFDI_OT` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Controles | 154 | 165 | 165 | 169 | 132 | 162 | 156 | 205 | 6 |

## 2. Por qué se siente lenta (causas → evidencia)

1. ~~**Todo en una pantalla (1,412 controles).** Los 9 sistemas se **ocultan con `Visible`**
   (`cmpCarddrpTipoCotización_XXX.Selected.Value = "Diseño"`), no se cargan bajo demanda. Un
   control oculto **se instancia igual y sus fórmulas se evalúan** → se paga el costo completo
   aunque solo se vea un sistema.~~ **Corregido en R1:** `scrFDI` conserva cotización, tabs y alta de
   sistemas; cada `cntXXX` vive en `scrFDI_XXX` y se abre con `Navigate(...)` pasando `locTabSel`.
2. **Hidratación campo por campo con `LookUp` repetido.** Patrón real, repetido ~100–130 veces por
   sistema:
   ```powerapps
   Default: =Coalesce(LookUp(colMEZ_Draft, SistemaId = locTabSel.SistemaId, RequiereElevador), …)
   ```
   La **misma clave** (`SistemaId = locTabSel.SistemaId`) se resuelve cientos de veces. De ahí los
   **794 `LookUp`**.
3. **`OnVisible` todavía pesado, aunque ya no 100% secuencial**: un `LookUp` de borrador +
   `EditForm`/`NewForm` + clears agrupados + `ClearCollect` + un `ForAll` de hidratación.
4. **Hidratación O(n²) en el `ForAll`.** En `19d4409`, dentro del `ForAll` sobre los puentes se calculaba:
   ```powerapps
   TipoIndex: CountRows(Filter(colTabs, TipoKey = _tipo)) + 1
   ```
   …que **lee `colTabs` mientras se está construyendo** → costo cuadrático por nº de sistemas.
   **Estado posterior:** corregido para calcular `TipoIndex` contra `colPuentesHidratacion`, sin leer
   la colección destino durante su construcción.
5. **`LookUp` de borrador probablemente no delegable** (corre en **cada** apertura):
   ```powerapps
   LookUp('Cotizaciones',
       Created >= DateAdd(Today(), -18, TimeUnit.Months) &&
       Estado.Value = "Borrador" && 'Created By'.Email = User().Email)
   ```
   `'Created By'.Email` y `Estado.Value` (choice) suelen ser **no delegables** en SharePoint → baja
   filas al cliente y filtra local.
6. **Galerías (50)** con `LookUp`/`CountRows` por fila → recálculo por renglón en cada render.
7. ~~**Text inputs sin `DelayOutput`** (126 de 133).~~ **Corregido en R6:** los 133 text inputs ya
   tienen `DelayOutput = true`.

## 3. Plan de refactor priorizado

### R1 ✅ — Partir la mega-pantalla (hecho)
Se aplicó la opción de **pantalla por sistema**: `scrFDI_SEL`, `scrFDI_DIN`, `scrFDI_PBK`,
`scrFDI_DRV`, `scrFDI_CAN`, `scrFDI_MEZ`, `scrFDI_CFL`, `scrFDI_MZL` y `scrFDI_OT`.
`scrFDI` navega a la pantalla correspondiente con `locTabSel`; cada pantalla tiene una barra de
regreso que vuelve a `scrFDI` sin rehidratar toda la cotización.

### R2 ✅ — Cachear el borrador en un registro (fuente aplicada)
Al entrar al sistema / cambiar de tab, resolver la fila **una vez**:
```powerapps
Set(varDraftActual, LookUp(colMEZ_Draft, SistemaId = locTabSel.SistemaId))
```
y enlazar cada campo a la variable:
```powerapps
Default: =Coalesce(varDraftActual.RequiereElevador, false)   // antes: LookUp(colMEZ_Draft, …, RequiereElevador)
```
Se aplicó en `Src/scrFDI_SEL.pa.yaml`, `Src/scrFDI_DIN.pa.yaml`, `Src/scrFDI_PBK.pa.yaml`,
`Src/scrFDI_DRV.pa.yaml`, `Src/scrFDI_CAN.pa.yaml`, `Src/scrFDI_MEZ.pa.yaml`,
`Src/scrFDI_CFL.pa.yaml`, `Src/scrFDI_MZL.pa.yaml` y `Src/scrFDI_OT.pa.yaml`.

Se reemplazaron las lecturas de hidratación por `varDraftActual.Campo`. Los `LookUp` usados como
destino de `Patch(...)` permanecen intactos para no cambiar la lógica de guardado.

### R3 🟠 — Aligerar `OnVisible`
- Envolver las cargas **independientes** en `Concurrent(...)` (borrador, puentes, catálogos).
- Consolidar los **~20 `Clear()`** (o eliminarlos si los `ClearCollect` posteriores ya recrean).
- **Hecho:** `TipoIndex` ya no usa `CountRows(Filter(colTabs, …))` mientras `colTabs` se construye;
  ahora cuenta contra `colPuentesHidratacion`.

### R4 🟠 — Delegación del `LookUp` de borrador
Hacer el filtro delegable: añadir columna de texto indexada (p. ej. `CreadoPorEmail`) y filtrar por
ella en vez de `'Created By'.Email`; idem el estado por una columna delegable. Evita bajar filas en
cada apertura. (Aplica también lo de [FDI_MisCotizaciones_Performance.md](FDI_MisCotizaciones_Performance.md).)

### R5 🟠 — Galerías: precalcular en vez de por fila
Mover los `CountRows`/`LookUp` por renglón a un cálculo **único** (colección/variable con
`AddColumns` al armar los datos), no en `Items`/propiedades de cada fila.

### R6 🟡 — Ajustes finos
- `DelayOutput = true` en los **133** text inputs → no recalcular en cada tecla. **Hecho.**
- Ajustes de app verificados como activos en `AppPreviewFlagsMap`: `delayloadscreens`,
  `projectionmapping`, `delaycontrolrendering`, `loadcomponentdefinitionsondemand`,
  `optimizestartscreenpublishedappload`.
- Asegurar que los **2 HtmlEditor** solo se rendericen para el sistema **activo** (con R1, gratis).
- Evitar `Now()`/volátiles en propiedades que recalculan seguido.

## 4. Esfuerzo vs impacto

| Acción | Impacto | Esfuerzo | Cuándo | Estado |
| --- | --- | --- | --- | --- |
| **R2** cachear borrador | 🔴 Alto (lag al escribir/cambiar) | Medio | Siguiente | ✅ fuente aplicada; falta compilar por Studio |
| **R6** DelayOutput + settings | 🟠 Medio | Bajo | Quick win inmediato | ✅ DelayOutput hecho (`19d4409`); ✅ settings verificados activos |
| **R3** OnVisible (Concurrent + O(n²)) | 🟠 Medio (carga) | Bajo-Medio | Quick win | ✅ Concurrent parcial; ✅ O(n² de `TipoIndex`) corregido |
| **R4** delegación | 🟠 Medio (apertura) | Medio | Con cambio de schema | ❌ pendiente |
| **R1** partir pantalla | 🔴 Alto (carga + lag) | **Alto** | Estructural | ✅ hecho |
| **R5** galerías | 🟠 Medio | Medio | Con R1 | ❌ pendiente |

**Orden restante sugerido:** R2 → R4/R5.

## 5. Cómo medir (antes/después)
- **Monitor** de Power Apps (Studio → Advanced tools → Monitor): ver tiempo de `OnVisible`, nº de
  llamadas a datos y formulas caras al abrir/usar la pantalla.
- Comparar `DeserializationLoadTime`/`AnalysisLoadTime` (en `Properties.json` del `.msapp`) antes y
  después; hoy **~10.7 s / ~12.9 s**.
- Contar controles por pantalla tras R1 (objetivo < ~300).

## 6. Fuera de alcance
- Bug de `scrCorreo`: [FDI_Correo_Bug_Report.md](FDI_Correo_Bug_Report.md).
- Permisos: [FDI_Permisos_Usuario_Design.md](FDI_Permisos_Usuario_Design.md).
- Cableado de campos a listas normalizadas (handoff en curso).
