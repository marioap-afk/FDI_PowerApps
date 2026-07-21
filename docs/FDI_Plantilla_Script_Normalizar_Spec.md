# FDI — Spec para Codex: plantilla + Office Script (quitar hojas "_Datos", normalizar tablas) + lentitud

> **Autor:** Claude Release (rol: validar/empaquetar). Esto es un **handoff/spec, NO una
> implementación**: la plantilla `templates/FDI_Master.xlsx`, su generador
> `scripts/generate-fdi-excel.py` y el Office Script `scripts/office-scripts/fill-fdi-workbook.ts`
> son **funcionalidad = dominio de Codex**. Aquí queda el qué/dónde para que Codex lo implemente.

## Problema (reportado por el usuario)

Al generar la cotización, el workbook queda con **una hoja `*_Datos` por sistema** además de la
`*_Form` (p. ej. `SEL_S01_Form` + `SEL_S01_Datos`). Causa: el `_Form` **no tiene tablas
normalizadas**, así que el script añadió una hoja extra para volcar las tablas.

## Dónde está, exactamente

- **`scripts/office-scripts/fill-fdi-workbook.ts`**
  - `addDetailSheet(...)` (líneas ~380-381): `workbook.addWorksheet(formSheetName.replace("_Form","_Datos"))`
    → **crea la hoja `_Datos`**. Llamado desde `prepareSystemSheets` (línea ~160).
  - El script **ya** escribe parte de los datos en el `_Form` vía `writeTable(sheet, layout.…, …)`
    (p. ej. colores en línea ~214) usando `layout` por tipo de sistema. Es decir, la hoja `_Datos`
    es en buena medida **redundante**.
- **`scripts/generate-fdi-excel.py`** (referencia del layout "bueno"): `write_table(ws, 17, 22, …, PIEZAS_COLUMNS)`,
  colores, proveedores, tarimas, etc. escriben en **rangos/tablas del `_Form`** (`copy_tables` duplica
  `tbl*` por sistema). Este archivo ya define el modelo normalizado esperado.
- **`templates/FDI_Master.xlsx`**: las hojas plantilla `*_Form` por tipo (SEL/DIN/PBK/DRV/CAN/MEZ/CFL/MZL)
  deben **contener** esas tablas (`tblPiezas`, `tblTarimas`, `tblProductos`, `tblColores`,
  `tblElementosSeguridad`, `tblPiezasEspeciales`, `tblProveedoresExternos`) en rangos fijos.

## Cambio pedido (Codex)

1. **Plantilla + generador:** garantizar que cada hoja `*_Form` de `FDI_Master.xlsx` tenga las tablas
   normalizadas en rangos fijos (las que `generate-fdi-excel.py` ya conoce). Una sola fuente de
   rangos/columnas compartida entre el `.py` y el `.ts` (hoy hay duplicación: `COLOR_COLUMNS`,
   `PIEZAS_COLUMNS`, … existen en ambos).
2. **Office Script:** **eliminar `addDetailSheet`** (y su llamada) → no más hojas `_Datos`. Escribir
   los arrays del payload directamente en las tablas/rangos del `_Form`:
   `piezas, tarimas, productos, elementosSeguridad, piezasEspeciales, proveedoresExternos, colores`
   (claves que ya arma el flujo en `Payload_Global`). Reusar el `layout` por tipo que el script ya
   tiene.
3. **Consistencia de columnas:** el payload de `colores` ya trae `Color` y `ColorNombre` (el bug que
   el usuario arregló en el `OnSuccess`); que el `.ts` escriba la columna correcta (`Color`) en la
   tabla `tblColores`, sin volcar a `_Datos`.
4. Regenerar `FDI_Master.xlsx` con el `.py` corregido y **re-subir la plantilla a SharePoint**
   (`/Recursos/FDI_Master.xlsx`) + **re-publicar el Office Script** `fill-fdi-workbook`.

## Lentitud (diagnosis, también Codex)

1. **"Lento al cambiar a correo" (app):** `CotizaciónForm.OnSuccess` hace **~63 escrituras
   secuenciales** a 16 listas SharePoint (cada `Patch`/`Remove` es un round-trip) **antes** de
   `Navigate(scrCorreo)`. Es inherente. Mitigaciones: navegar primero y persistir en segundo plano,
   reducir Remove+re-insert (diff en vez de borrar todo), o agrupar por sistema. Ver
   [FDI_Enviar_OnSuccess_Bug_Report.md](FDI_Enviar_OnSuccess_Bug_Report.md).
2. **"Lento al enviar el correo" (flujo Creación FDI):** el flujo encadena **16 `GetItems`
   secuenciales** (`Get_sistemas_*` + `Get_hija_*`, cada uno `$top=5000`) → copia el master xlsx →
   corre el Office Script (que hoy **copia hojas `_Form` + crea `_Datos` por sistema**, trabajo extra)
   → crea archivos → correo/Teams. Mitigaciones: paralelizar los `GetItems` (ramas concurrentes),
   filtrar `$top` realista, y **quitar las hojas `_Datos`** (menos operaciones de hoja en el script
   = menos tiempo). El cambio de plantilla/script de arriba **también** reduce esta latencia.

## Estética de los sistemas (pendiente, Codex)

Queda el pulido estético de las pantallas de sistema (post-split). Backlog de desarrollo.

## Si el usuario quiere que Release implemente esto

Va contra la división de roles de CLAUDE.md (Claude Release no desarrolla). Si el usuario lo pide
**explícitamente**, se documenta como excepción puntual; por defecto, **Codex** implementa la
plantilla/generador/script y el usuario re-sube plantilla + re-publica script; luego Release valida y
empaqueta la solución (canvas app + flujos), que **no** incluye la plantilla ni el script (son
artefactos de SharePoint/OneDrive).
