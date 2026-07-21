# Auditoria de filtros SharePoint - FDI Power Apps

Fecha: 2026-06-09  
Rama: `codex/safe-cleanup`  
Objetivo: reducir el riesgo de `list view threshold` en la lista SharePoint `Cotizaciones` sin cambiar `Patch`, estados ni logica de negocio.

## Resumen ejecutivo

- Se inventariaron las formulas `Filter`, `Search`, `Sort` y `SortByColumns` sobre origenes SharePoint en la app actual.
- Se detectaron 27 formulas de lectura/ordenamiento sobre listas SharePoint.
- La formula critica era `CotizacionesGallery.Items` en `scrMisCotizaciones`: consultaba `Cotizaciones` con filtros opcionales, por lo que con busqueda, vendedor y estado vacios podia intentar evaluar la lista completa.
- Se corrigio solo esa formula, agregando un filtro base delegable inicial:

```powerfx
Filter(
    'Cotizaciones',
    Created >= Date(2026, 1, 1)
)
```

- Despues de ese filtro base se conservan los filtros existentes por texto, vendedor y estado.
- No se modificaron formulas `Patch`.
- No se modificaron valores ni transiciones de `Estado`.
- Se actualizo el paquete local limpio `FDI_portable_no_pcf_unmanaged.zip` con el `.msapp` corregido.

## Cambio aplicado

### P0 - CotizacionesGallery consulta toda la lista

Severidad: Critica  
Ubicacion: `CanvasApps/mapc_fdi_412ec_DocumentUri.msapp`, entrada interna `Src/scrMisCotizaciones.pa.yaml:160`  
Control: `scrMisCotizaciones > CotizacionesGallery.Items`

Antes, la formula era:

```powerfx
Filter(
    'Cotizaciones',
    IsBlank(q) || StartsWith(...),
    IsEmpty(idsVendSel) || VendedoresLookUp.Id in idsVendSel,
    IsEmpty(estadosSel) || Estado.Value in estadosSel
)
```

Riesgo: si `q`, `idsVendSel` y `estadosSel` estaban vacios, la formula no tenia filtro obligatorio inicial sobre `Cotizaciones`. Esto podia disparar errores por `list view threshold` en SharePoint.

Ahora la formula crea primero una base acotada por `Created`:

```powerfx
With(
    {
        q: Trim(SearchInput.Value),
        idsVendSel: ForAll(VendedorFiltroComboBox.SelectedItems, ID),
        estadosSel: EstadoFiltroComboBox.SelectedItems.Value,
        baseCotizaciones: Filter(
            'Cotizaciones',
            Created >= Date(2026, 1, 1)
        )
    },
    Filter(
        baseCotizaciones,
        IsBlank(q)
            || StartsWith(Title, q)
            || StartsWith(EmpresaLookUp.Value, q)
            || StartsWith(Folio, q)
            || StartsWith(VendedoresLookUp.Value, q)
            || StartsWith(ContactoLookUp.Value, q)
            || StartsWith(AsignadoSnapShot, q)
            || StartsWith('Dirección de la empresa', q),
        IsEmpty(idsVendSel)
            || VendedoresLookUp.Id in idsVendSel,
        IsEmpty(estadosSel)
            || Estado.Value in estadosSel
    )
)
```

Impacto esperado: la primera consulta contra SharePoint ya no se ejecuta contra toda la lista, sino contra elementos creados desde el inicio del periodo 2026.

## Inventario de formulas SharePoint

| Pantalla | Control | Propiedad | Lista(s) | Evaluacion |
| --- | --- | --- | --- | --- |
| `scrMisCotizaciones` | `CotizacionesGallery` | `Items` | `Cotizaciones` | Corregida. Era el principal riesgo de threshold. |
| `scrGenerarPedido` | `ComboboxCanvas2` | `Items` | `Cotizaciones` | Aceptable: filtra por `Estado.Value = "Comprada"`. |
| `scrFDI` | `scrFDI` | `OnVisible` | `Cotizaciones` | Aceptable: `LookUp` por `Estado = "Borrador"` y usuario creador. |
| `scrFDI` | `SistemasButton` | `OnSelect` | `Cotizaciones` | No se toca por alcance: contiene `Patch`/flujo de guardado. |
| `scrFDI` | `ContactoLookUpComboBox` | `Items/SearchItems` | `Contactos`, `Clientes`, `Cotizaciones` | Usa `Choices`/lookup; sin lectura masiva directa de cotizaciones. |
| `scrGenerarFolio` | `ContactoLookUpComboBox2` | `Items` | `Contactos`, `Clientes`, `Cotizaciones` | Usa `Choices`/lookup; sin lectura masiva directa de cotizaciones. |
| `scrMisCotizaciones` | `SolicitudesGallery` | `Items` | `Solicitudes en cotizaciones` | Filtra por folio seleccionado; fuera del P0. |
| `scrMisCotizaciones` | `NextArrow5` y pantalla | `OnSelect/OnVisible` | `Carpeta cotizaciones` | Usa `StartsWith('Folder path', ...)`; revisar indices si la biblioteca crece. |
| `scrMisCotizaciones` | bitacora/costos | `OnSelect` | `Bitacora cotizaciones` | Filtra por folio seleccionado y ordena; riesgo menor. |
| `scrContactosClientes` | `GalleryDirectorio` | `Items` | `Clientes`, `Contactos` | Usa `Search(Filter(...Activo=true), q, Title)`; no afecta `Cotizaciones`, pero conviene migrar a `StartsWith` si esas listas crecen. |
| `scrFDI` | combos geograficos | `Items/SearchItems` | `Estados_List`, `Ciudades_List`, `Paises_List` | Listas auxiliares; riesgo bajo. |
| `scrFDI` | `ClienteComboBox` | `Items/SearchItems` | `Clientes` | `SortByColumns(Clientes, "Title")`; riesgo medio si `Clientes` supera threshold. |

## Verificaciones

- La entrada interna `Src/scrMisCotizaciones.pa.yaml` contiene `baseCotizaciones`.
- La entrada interna `Controls/263.json` contiene la misma formula actualizada.
- `FDI_portable_no_pcf_unmanaged.zip` contiene el mismo `.msapp` que `CanvasApps/mapc_fdi_412ec_DocumentUri.msapp` por SHA-256.
- El unico archivo versionado funcional modificado es `CanvasApps/mapc_fdi_412ec_DocumentUri.msapp`.

## Riesgos restantes

- `VendedoresLookUp.Id in idsVendSel` y `Estado.Value in estadosSel` pueden seguir mostrando advertencias de delegacion porque usan seleccion multiple. Se conservaron para no cambiar la logica de filtros.
- Las busquedas con varios `StartsWith` sobre lookup/texto se mantienen como refinamiento posterior al filtro base. Si el volumen 2026 supera el limite de delegacion de la app, conviene migrar a filtros obligatorios por estado/vendedor o a columnas normalizadas indexadas.
- Es importante confirmar que `Created` este indexada en SharePoint. Si no lo esta, se recomienda crear el indice.

## Recomendaciones

P0:
- Mantener el filtro base por `Created >= Date(2026, 1, 1)` en cualquier galeria principal sobre `Cotizaciones`.
- Indexar `Created` en SharePoint si no existe el indice.

P1:
- Considerar una columna normalizada/indexada de anio o periodo para futuras listas anuales.
- Convertir filtros multi-select a consultas delegables cuando el volumen crezca, por ejemplo limitando a seleccion unica o usando columnas auxiliares indexadas.

P2:
- Revisar `Clientes`, `Contactos` y `Carpeta cotizaciones` si superan 5,000 elementos.
- Sustituir `Search(...)` por `StartsWith(...)` en directorios si esas listas empiezan a crecer.

P3:
- Re-ejecutar App Checker despues de importar en sandbox para confirmar advertencias de delegacion restantes.
