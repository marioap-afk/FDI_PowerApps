# scrFDI Import Diagnosis

Date: 2026-06-09

## Scope

Diagnosed only `scrFDI` in `CanvasApps/mapc_fdi_412ec_DocumentUri.msapp`.

No SharePoint, Power Automate, Patch formulas, business states, or other screens are in scope.

## Internal Files

- Screen source: `Src/scrFDI.pa.yaml`
- Screen control tree: `Controls/48.json`
- Data source metadata: `References/DataSources.json`
- Import review solution checked: `solutions/FDI_unmanaged_review_scrfdi_fix_2026-06-09.zip`

## Duplicate Screen / Control Check

- There is one real `scrFDI` screen: `Controls/48.json`, `TopParent.Name = scrFDI`.
- There is one `Src/scrFDI.pa.yaml`.
- There are no duplicate `scrFDI` screens.
- There are other "listado" controls for other sections, but the visible Selectivo parts list is `cntListadoDePiezasSEL`.

## Data Source Findings

`References/DataSources.json` confirms that `Clientes` has these address columns:

| Display name | Internal name | Type |
|---|---|---|
| `Dirección` | `Direcci_x00f3_n` | string |
| `Dirección de facturación` | `Direcci_x00f3_ndefacturaci_x00f3` | string |

The fix must not depend on `Self.Selected.Dirección`. It should retrieve the value through `LookUp(Clientes, ID = Self.Selected.ID, Dirección)` and fall back to `LookUp(Clientes, ID = Self.Selected.ID, 'Dirección de facturación')`.

## Exact Controls

### Cliente

Control: `ClienteComboBox`

Path: `scrFDI > cntScrFDI > MainContainer > CotizacionesContainer > CotizaciónForm > EmpresaLookUp_DataCard1 > ClienteComboBox`

Internal file: `Controls/48.json`

Key current properties:

| Property | Value |
|---|---|
| `Items` | `SortByColumns(Clientes, "Title", SortOrder.Ascending)` |
| `DefaultSelectedItems` | `If(IsBlank(varClienteSel), Blank(), [varClienteSel])` |
| `OnChange` | Sets `varClienteSel`, `locDirClienteSeleccionado`, `locDirSnapshot`; resets `DirecciónDataCard`, contact, email, phone |
| `X/Y/Width/Height` | `30` / `DataCardKey49.Y + DataCardKey49.Height + 5` / `Parent.Width - 60` / `40` |

### Dirección Del Cliente

DataCard: `Dirección de la empresa_DataCard2`

Input control: `DirecciónDataCard`

Path: `scrFDI > cntScrFDI > MainContainer > CotizacionesContainer > CotizaciónForm > Dirección de la empresa_DataCard2 > DirecciónDataCard`

Internal file: `Controls/48.json`

Key current properties:

| Property | Value |
|---|---|
| DataCard `DataField` | `Direcci_x00f3_ndelaempresa` |
| DataCard `Default` | `ThisItem.'Dirección de la empresa'` |
| DataCard `Update` | `DirecciónDataCard.Text` |
| Input `Default` | `If(locDirClienteSeleccionado, locDirSnapshot, Coalesce(ThisItem.'Dirección de la empresa', ""))` |
| Input `OnChange` | `UpdateContext({locDirSnapshot : Self.Text})` |
| Input `X/Y/Width/Height` | `30` / `DataCardKey18.Y + DataCardKey18.Height + 5` / `Parent.Width - 60` / `40` |

### Listado De Piezas

Main container: `cntListadoDePiezasSEL`

Gallery: `galListadoDePiezasSEL`

Visible only when `cmpCarddrpTipoCotización.Selected.Value = "Listado de piezas"`.

Internal file: `Controls/48.json`

Key controls:

| Control | Purpose | Key properties |
|---|---|---|
| `cntListadoDePiezasSEL` | Main visible section | `Visible = cmpCarddrpTipoCotización.Selected.Value = "Listado de piezas"` |
| `btnAgregarPiezaSEL` | Add row | `OnSelect = Collect(colListadoPiezas, { RowId: GUID(), SistemaId: locTabSel.SistemaId, Pieza: "", Comentarios: "" })` |
| `galListadoDePiezasSEL` | Rows | `Items = Filter(colListadoPiezas, SistemaId = locTabSel.SistemaId)` |
| `ComentarioInput` | Piece input, despite name | `Default = ThisItem.Pieza`; `OnChange = Patch(colListadoPiezas, ThisItem, { Pieza: Self.Text })` |
| `PiezaInput` | Comment input, despite name | `Default = ThisItem.Comentarios`; `OnChange = Patch(colListadoPiezas, ThisItem, { Comentarios: Self.Text })` |
| `BorrarPiezaButton` | Delete action | `OnSelect = Remove(colListadoPiezas, ThisItem)` |

### País De Destino

DataCard: `País de destino_DataCard3`

Label: `DataCardKey33`

Combo: `DataCardValue33`

Internal file: `Controls/48.json`

Key current properties:

| Control | Property | Value |
|---|---|---|
| `País de destino_DataCard3` | `DataField` | `Pa_x00ed_sdedestino` |
| `País de destino_DataCard3` | `Default` | `ThisItem.'País de destino'` |
| `País de destino_DataCard3` | `Update` | `DataCardValue33.Selected` |
| `DataCardKey33` | `Text` | `Parent.DisplayName` |
| `DataCardValue33` | `Items` | `Países_List` |
| `DataCardValue33` | `DefaultSelectedItems` | `If(CotizaciónForm.Mode = FormMode.New, Filter(Países_List, Title = "México"), If(IsBlank(Parent.Default), Blank(), [Parent.Default]))` |

## Why Previous Changes Did Not Reflect Reliably

1. The address change was applied to the real `ClienteComboBox`, but it still read address fields from a full selected/lookup record. The more reliable formula is to project the exact address column through `LookUp(Clientes, ID = Self.Selected.ID, Dirección)` and separately fall back to `Dirección de facturación`.
2. The parts table change was applied to the real Selectivo controls, but the new header controls used `ControlUniqueId` values `263-266`. Those IDs already existed globally in other controls/screens, including `scrMisCotizaciones`. This makes the manually added header unsafe and likely to be ignored or normalized during import.
3. The country label exists as `DataCardKey33`, but its text depends on `Parent.DisplayName`. The `País de destino_DataCard3` block does not currently define a `DisplayName` property in the YAML, so the label can render blank after import.
4. The generated solution ZIP did contain the same `.msapp` as the repository copy by SHA-256 hash, so the issue is not explained by the ZIP containing an older `.msapp`.

## Corrections To Apply

### Commit 1

Fix real address autofill and restore country label.

Controls modified:

- `ClienteComboBox.OnChange`
- `DataCardKey33.Text`

Properties modified:

- `ClienteComboBox.OnChange`: use direct column lookups from `Clientes` for `Dirección` and `Dirección de facturación`; keep reset of `DirecciónDataCard`.
- `DataCardKey33.Text`: set literal `"País de destino"`.

### Commit 2

Rebuild real Selectivo parts table header/layout.

Controls modified:

- `cntListadoDePiezasSEL`
- `cntListadoDePiezasBotonesSEL`
- `lblListadoDePiezasSEL`
- `cntListadoDePiezasHeaderSEL`
- `lblPiezaHeaderSEL`
- `lblComentarioHeaderSEL`
- `lblAccionHeaderSEL`
- `galListadoDePiezasSEL`
- `ComentarioInput`
- `PiezaInput`
- `BorrarPiezaButton`
- `PiezaLabel`
- `ComentarioLabel`
- `Separator2`

Properties modified:

- Replace duplicated header IDs with globally unique IDs.
- Keep `Collect`, `Patch`, and `Remove` formulas unchanged.
- Keep the same `colListadoPiezas` structure unchanged.
- Make the visible real section render as a table with fixed headers and aligned row controls.

## Power Apps Validation

1. Import the generated solution ZIP.
2. Open the app in Power Apps Studio.
3. Go to `scrFDI`.
4. Select cliente `Navil Steel GC`.
5. Verify `Dirección del cliente` fills immediately and remains editable.
6. Verify `País de destino` label is visible above the country combo.
7. Select Selectivo and `Listado de piezas`.
8. Add one row and verify:
   - header `Pieza` is visible,
   - header `Comentario` is visible,
   - header `Acción` is visible,
   - piece input aligns under `Pieza`,
   - comment input aligns under `Comentario`,
   - delete icon aligns under `Acción`,
   - adding, editing, and deleting still use the same collection behavior.
