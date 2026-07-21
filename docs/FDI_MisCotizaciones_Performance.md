# FDI — Rendimiento de `scrMisCotizaciones` (2026-06-14)

> **Autor:** Claude Release (rol: validar/empaquetar). Este documento es **solo análisis y
> propuesta**; no se modificó funcionalidad. Implementación a cargo de **Codex**.
>
> **Base de evidencia:** fuente del `.msapp` desempaquetado con
> `pac canvas unpack --layout SourceCode` (`Src/scrMisCotizaciones.pa.yaml`).
> Los números de línea son de ese unpack y sirven de guía; en Power Apps Studio
> ubica el cambio por **control + propiedad** (se indican en cada punto).
>
> **Commit revisado:** `4436b6a` — *Implement Dinamico capture flow*
> **Rama:** `claude/revert-richtext-baseline`
> **Pantalla:** `scrMisCotizaciones` (≈512 KB, 7394 líneas, 0 `Concurrent`).

---

## Resumen

La pantalla se siente lenta por **consultas no delegables** que descargan listas
completas y filtran en el cliente, más una **pantalla muy pesada** que se prepara
entera al entrar. **No hay problema N+1**: las galerías de detalle leen de la
colección local `colDocsCotizaciones` (en memoria) o de `Choices()` (cacheado),
no por fila contra SharePoint.

| # | Problema | Impacto | ¿Requiere schema SharePoint? |
|---|---|---|---|
| 1 | Galería principal: filtro base no delegable | 🔴 Alto (abrir + buscar) | **No** (hay salida sin schema) |
| 2 | `StartsWith('Folder path', …)` por cada clic | 🔴 Alto (por selección/patch) | **Sí** (columna indexada) |
| 3 | Pantalla sobredimensionada | 🟠 Medio (render inicial) | No |
| 4 | Colecciones estáticas en cada `OnVisible` | 🟡 Bajo | No |

---

## 🔴 #1 — `CotizacionesGallery.Items`: filtro base NO delegable

**Control:** `CotizacionesGallery` · **Propiedad:** `Items` (líneas 206–265).

Filtro base (líneas 218–222):

```powerfx
baseRol: If(
    puedeVerTodo,
    Filter('Cotizaciones', Created >= fechaMin && Estado.Value <> "Borrador"),
    Filter('Cotizaciones', Created >= fechaMin && Estado.Value <> "Borrador" && VendedoresLookUp.Id = vendedorIdActual)
)
```

- **`Estado.Value <> "Borrador"`**: el operador `<>` sobre una columna **Choice** **no es
  delegable** en el conector SharePoint. Al no delegar un término del `&&`, **toda** la
  consulta deja de delegar → SharePoint devuelve solo hasta el **límite de filas
  (500 por defecto, máx. 2000)** y el resto se filtra en el dispositivo. Con la ventana de
  18 meses (`Created >= fechaMin`) esto **trunca resultados y va lento**.

Búsqueda (líneas 248–261):

```powerfx
Filter(
    baseEstado,
    StartsWith(Title, q)
        || StartsWith(EmpresaLookUp.Value, q)
        || StartsWith(Folio, q)
        || StartsWith(VendedoresLookUp.Value, q)
        || StartsWith(ContactoLookUp.Value, q)
        || StartsWith(AsignadoSnapShot, q)
        || StartsWith('Dirección de la empresa', q)
)
```

- `StartsWith` sobre **7 columnas** con `||`, incluyendo lookups `.Value` y un snapshot de
  texto → **no delegable**. Al teclear, filtra sobre el conjunto ya truncado por el punto
  anterior.

### Propuesta

**Opción A — sin tocar schema (recomendada como primer paso):** reemplazar
`Estado.Value <> "Borrador"` por una **lista blanca de estados con `=` / `||`** (el `=`
sobre Choice **sí** delega):

```powerfx
Filter(
    'Cotizaciones',
    Created >= fechaMin && (
        Estado.Value = "Sin asignar" ||
        Estado.Value = "En proceso" ||
        Estado.Value = "En espera de información" ||
        Estado.Value = "En revisión por parte de vendedor" ||
        Estado.Value = "Corrección requerida" ||
        Estado.Value = "Comprada" ||
        Estado.Value = "Enviada a cliente" ||
        Estado.Value = "Lista para enviar"
    )
    // y, para el rol no-admin, && VendedoresLookUp.Id = vendedorIdActual
)
```

Verificar en Studio que **desaparezca el aviso de delegación** (línea azul) en esa fórmula.

**Opción B — con schema (más limpio y robusto, requiere aviso):** añadir columna **Sí/No
`EsBorrador`** a `Cotizaciones` (default `false`; `true` solo en borradores) y filtrar:

```powerfx
Filter('Cotizaciones', Created >= fechaMin && EsBorrador = false && …)
```

`= false` sobre booleano es delegable.

**Búsqueda:** para que delegue, buscar sobre **una sola columna de texto indexada**
(p. ej. una columna calculada/concatenada "BuscarTexto" mantenida por el flujo) con un
único `StartsWith`, en lugar de 7 `||`.

---

## 🔴 #2 — `Filter('Carpeta cotizaciones', StartsWith('Folder path', …))` por cada clic

**Origen:** `CotizacionesGallery.OnSelect` (líneas 266–277). **Se repite ~8 veces** en la
pantalla, tras **cada selección de cotización y después de cada Patch**:
líneas **2598, 4906, 4941, 4970, 4991, 5558, 5854, 6071**.

```powerfx
ClearCollect(
    colDocsCotizaciones,
    Filter('Carpeta cotizaciones', StartsWith('Folder path', ThisItem.FolderPath))
)
```

- `StartsWith` sobre la columna de ruta de la biblioteca está marcado **no delegable** →
  **escanea toda la biblioteca de documentos** cada vez. Es la causa de la lentitud
  **por clic** al abrir una cotización y al anexar/enviar a revisión.

### Propuesta (requiere schema → avisar antes)

Añadir a `Carpeta cotizaciones` una columna **indexada** con el **ID o Folio de la
cotización** (p. ej. `CotizacionID`) y filtrar por **igualdad** (delegable):

```powerfx
ClearCollect(
    colDocsCotizaciones,
    Filter('Carpeta cotizaciones', CotizacionID = CotizacionesGallery.Selected.ID)
)
```

Elimina el escaneo completo. Como es el mismo patrón en ~8 lugares, conviene encapsularlo
(p. ej. una función/named formula o un único punto de recarga) para no repetir la fórmula.

---

## 🟠 #3 — Pantalla sobredimensionada (render inicial pesado)

`scrMisCotizaciones` concentra en una sola screen: galería maestra + 7 tabs
(`Resumen / Revisiones / Solicitudes / Archivos / Bitácora / FDI / Costos`) + múltiples
popups (≈190 referencias a galerías). Power Apps **prepara toda la pantalla al entrar**
→ render inicial pesado (`app-ScreenHasManyControls`, `app-InefficientDelayLoading`).

### Propuesta (sin schema)

- Mover los **popups** a **componentes** reutilizables.
- **Diferir** el contenido de cada tab: construir/mostrar el contenido solo cuando
  `varTabSelect` selecciona ese tab (las galerías de tabs ocultos no deberían evaluarse).
- Evaluar dividir tabs poco usados en pantallas separadas.

Mejora el arranque y la mantenibilidad.

---

## 🟡 #4 — Colecciones estáticas reconstruidas en cada `OnVisible`

`scrMisCotizaciones.OnVisible` (líneas 34–55) hace `ClearCollect` de:
- `colTabsGalleryCotizaciones` (7 filas fijas, líneas 34–43)
- `colCotizacionEstadoColores` (8 filas fijas, líneas 45–55)

Son **estáticas** y se reconstruyen **cada vez** que se entra a la pantalla.

### Propuesta (trivial, sin schema)

Construirlas **una sola vez en `App.OnStart`**. Ahorro pequeño pero gratis, y deja el
`OnVisible` más ligero.

---

## Notas que están BIEN (no tocar)

- Galerías de detalle (`Pendiente / Rechazado / Aprobado`, líneas 2416, 2540, 2726) leen de
  `colDocsCotizaciones` (en memoria) → correcto.
- `Filter('Solicitudes en cotizaciones', FolioLookUp.Id = CotizacionesGallery.Selected.ID)`
  (línea 2801) usa **igualdad sobre lookup `.Id`** (delegable) y solo para la cotización
  seleccionada → correcto.
- `Choices(...)` en los combos de filtro → cacheado por sesión.
- No hay consultas SharePoint por fila dentro de la galería maestra (sin N+1).

---

## Prioridad sugerida

1. **#1** — Filtro base de la galería (mayor impacto; **Opción A sin schema** como primer paso).
2. **#2** — Escaneo de `Carpeta cotizaciones` por clic (requiere columna indexada → **avisar**).
3. **#3** — Aligerar/diferir la pantalla.
4. **#4** — Colecciones estáticas a `App.OnStart`.

> **Recordatorio de schema:** #2 (y la Opción B de #1) implican columnas nuevas en
> SharePoint. Según la regla del proyecto, **no se modifica el schema sin aviso previo**;
> aquí queda señalado para visto bueno antes de implementar.
