# FDI — Rendimiento de `scrFDI` (pantalla de generación de FDI/Cotización)

> **Autor:** Claude Release (rol: validar/empaquetar). **Análisis y propuesta**; la implementación
> es de **Codex**. Medido sobre la fuente real del `.msapp` de `git HEAD` (`scrFDI.pa.yaml`).
> Hermano de [FDI_MisCotizaciones_Performance.md](FDI_MisCotizaciones_Performance.md), pero para la
> pantalla de captura. **Causa de fondo: la pantalla es estructuralmente demasiado grande.**

## Estado (tras `19d4409` "Optimiza entradas de captura FDI")

Codex aplicó los **quick wins**; la **reestructuración sigue pendiente**. Comparado `f214298` → `19d4409`:

| Ítem | Estado | Evidencia |
| --- | --- | --- |
| **R6** DelayOutput en entradas | ✅ **Hecho** | `DelayOutput=true`: **7 → 133** text inputs |
| **R3** `Concurrent` en OnVisible | ✅ **Parcial** | `Concurrent(`: **0 → 1** (línea 31 de OnVisible) |
| **R1** partir la pantalla | ❌ **Pendiente** | **9 → 9** pantallas; scrFDI **1,412 → 1,412** controles |
| **R2** cachear el borrador | ❌ **Pendiente** | siguen **~689 `LookUp(colXXX_Draft, …)`** campo por campo |
| **R3** quitar el `CountRows(Filter)` O(n²) | ❌ **Pendiente** | sigue en `OnVisible` (`TipoIndex: CountRows(Filter(colTabs, …))`) |
| **R5** galerías | ❌ **Pendiente** | sin cambios |

> **Lectura:** se sentirá algo **más ágil al teclear** (DelayOutput) y un poco mejor la carga
> (Concurrent), pero **la carga inicial pesada (1,412 controles) y el lag al cambiar de campo
> (LookUp sin cachear) siguen igual**. El salto grande está en **R1** y **R2**.

## 1. Diagnóstico medido (números reales de `scrFDI`)

| Métrica | Valor | Referencia sana |
| --- | --- | --- |
| Líneas de `scrFDI.pa.yaml` | **29,575** | — |
| **Controles en la pantalla** | **1,412** | < ~300 por pantalla (guía MS) |
| Galerías | 50 | pocas, virtualizadas |
| GroupContainers | 215 | — |
| Forms / TypedDataCard | 23 | — |
| DataCards | 197 | — |
| PCF HtmlEditor (control pesado) | 2 | solo el activo |
| `LookUp(` en fórmulas | **794** | — |
| `CountRows(` | 113 | — |
| `Filter(` | 115 | — |
| `ForAll(` | 43 | — |
| `Concurrent(` | **0** | usar para cargas paralelas |
| TextInputs con `DelayOutput=true` | **7 / 133** | la mayoría debería tenerlo |
| `DeserializationLoadTime` (autoría) | **~10.7 s** | proxy de bloat |
| `AnalysisLoadTime` (autoría) | **~12.9 s** | proxy de bloat |

**Los 9 sistemas conviven en la misma pantalla.** Refs a la colección borrador de cada uno
(≈ tamaño del bloque a separar):

| Sistema | SEL | DIN | PBK | DRV | CAN | MEZ | CFL | MZL | OT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| refs `colXXX_Draft` | 101 | 122 | 122 | 118 | 112 | 117 | 102 | 129 | 10 |

## 2. Por qué se siente lenta (causas → evidencia)

1. **Todo en una pantalla (1,412 controles).** Los 9 sistemas se **ocultan con `Visible`**
   (`cmpCarddrpTipoCotización_XXX.Selected.Value = "Diseño"`), no se cargan bajo demanda. Un
   control oculto **se instancia igual y sus fórmulas se evalúan** → se paga el costo completo
   aunque solo se vea un sistema. Esto golpea la **carga inicial** (instanciación) y el **lag** al
   interactuar (recálculo).
2. **Hidratación campo por campo con `LookUp` repetido.** Patrón real, repetido ~100–130 veces por
   sistema:
   ```powerapps
   Default: =Coalesce(LookUp(colMEZ_Draft, SistemaId = locTabSel.SistemaId, RequiereElevador), …)
   ```
   La **misma clave** (`SistemaId = locTabSel.SistemaId`) se resuelve cientos de veces. De ahí los
   **794 `LookUp`**.
3. **`OnVisible` pesado y 100% secuencial** (sin `Concurrent`): un `LookUp` de borrador + `EditForm`/
   `NewForm` + **~20 `Clear()`** + `ClearCollect` + un `ForAll` de hidratación.
4. **Hidratación O(n²) en el `ForAll`.** Dentro del `ForAll` sobre los puentes se calcula:
   ```powerapps
   TipoIndex: CountRows(Filter(colTabs, TipoKey = _tipo)) + 1
   ```
   …que **lee `colTabs` mientras se está construyendo** → costo cuadrático por nº de sistemas.
5. **`LookUp` de borrador probablemente no delegable** (corre en **cada** apertura):
   ```powerapps
   LookUp('Cotizaciones 2026',
       Created >= DateAdd(Today(), -18, TimeUnit.Months) &&
       Estado.Value = "Borrador" && 'Created By'.Email = User().Email)
   ```
   `'Created By'.Email` y `Estado.Value` (choice) suelen ser **no delegables** en SharePoint → baja
   filas al cliente y filtra local.
6. **Galerías (50)** con `LookUp`/`CountRows` por fila → recálculo por renglón en cada render.
7. **Text inputs sin `DelayOutput`** (126 de 133): cada tecla recalcula los dependientes.

## 3. Plan de refactor priorizado

### R1 🔴 — Partir la mega-pantalla (la palanca #1)
En vez de los 9 sistemas en `scrFDI`, **una pantalla (o componente) por sistema**, navegada bajo
demanda; o **una sola pantalla "captura de sistema" reutilizable** parametrizada por el `TipoKey`
seleccionado. Objetivo: que vivan **~120 controles a la vez en lugar de 1,412** (ver tabla §1).
- Opción A (máximo impacto): pantalla por sistema → `Navigate(scrCaptura_MZL, …)`.
- Opción B: convertir cada bloque de sistema en **componente canvas** e instanciar **solo el activo**
  (el contenedor del sistema no seleccionado no se coloca, no solo se oculta).
- Mantener el borrador (`colXXX_Draft`) como hoy; solo cambia **dónde** se renderiza la UI.

### R2 🔴 — Cachear el borrador en un registro (1 `LookUp` en vez de ~100)
Al entrar al sistema / cambiar de tab, resolver la fila **una vez**:
```powerapps
Set(varDraftActual, LookUp(colMEZ_Draft, SistemaId = locTabSel.SistemaId))
```
y enlazar cada campo a la variable:
```powerapps
Default: =Coalesce(varDraftActual.RequiereElevador, false)   // antes: LookUp(colMEZ_Draft, …, RequiereElevador)
```
Reduce ~100–130 `LookUp` por sistema a **1**. (Con R1, `varDraftActual` es simplemente el borrador
de esa pantalla.)

### R3 🟠 — Aligerar `OnVisible`
- Envolver las cargas **independientes** en `Concurrent(...)` (borrador, puentes, catálogos).
- Consolidar los **~20 `Clear()`** (o eliminarlos si los `ClearCollect` posteriores ya recrean).
- **Quitar el O(n²)**: calcular `TipoIndex` sin `CountRows(Filter(colTabs, …))` sobre la colección
  en construcción (p. ej. un contador por tipo con `With`/`Sequence`, o numerar al final con
  `RenameColumns`/`AddColumns` + `RowNumber`/índice).

### R4 🟠 — Delegación del `LookUp` de borrador
Hacer el filtro delegable: añadir columna de texto indexada (p. ej. `CreadoPorEmail`) y filtrar por
ella en vez de `'Created By'.Email`; idem el estado por una columna delegable. Evita bajar filas en
cada apertura. (Aplica también lo de [FDI_MisCotizaciones_Performance.md](FDI_MisCotizaciones_Performance.md).)

### R5 🟠 — Galerías: precalcular en vez de por fila
Mover los `CountRows`/`LookUp` por renglón a un cálculo **único** (colección/variable con
`AddColumns` al armar los datos), no en `Items`/propiedades de cada fila.

### R6 🟡 — Ajustes finos
- `DelayOutput = true` en los **133** text inputs (hoy solo 7) → no recalcular en cada tecla.
- Activar en ajustes de la app **"Delayed load"** y **"Explicit column selection"** (no aparecen
  activos en `AppPreviewFlagsMap`).
- Asegurar que los **2 HtmlEditor** solo se rendericen para el sistema **activo** (con R1, gratis).
- Evitar `Now()`/volátiles en propiedades que recalculan seguido.

## 4. Esfuerzo vs impacto

| Acción | Impacto | Esfuerzo | Cuándo | Estado |
| --- | --- | --- | --- | --- |
| **R2** cachear borrador | 🔴 Alto (lag al escribir/cambiar) | Medio | Primero (independiente de R1) | ❌ pendiente |
| **R6** DelayOutput + settings | 🟠 Medio | Bajo | Quick win inmediato | ✅ DelayOutput hecho (`19d4409`); faltan settings (Delayed load / Explicit column selection) |
| **R3** OnVisible (Concurrent + O(n²)) | 🟠 Medio (carga) | Bajo-Medio | Quick win | ✅ Concurrent parcial; ❌ falta quitar el O(n²) |
| **R4** delegación | 🟠 Medio (apertura) | Medio | Con cambio de schema | ❌ pendiente |
| **R1** partir pantalla | 🔴 Alto (carga + lag) | **Alto** | Estructural — planear bien | ❌ pendiente (el mayor salto) |
| **R5** galerías | 🟠 Medio | Medio | Con R1 | ❌ pendiente |

**Orden sugerido:** R6 + R3 (quick wins) → R2 (gran alivio de lag, sin reestructurar) → **R1**
(reestructura, el mayor salto) → R4/R5.

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
