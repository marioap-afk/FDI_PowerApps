# Cierre funcional scrFDI y scrMisCotizaciones

Fecha: 2026-06-09  
Rama: `codex/safe-cleanup`  
Alcance: `scrFDI` y `scrMisCotizaciones`.

## Resumen

Se aplicaron mejoras de bajo riesgo para cerrar errores funcionales evidentes sin tocar configuracion de SharePoint, workflows, generacion de folios, columnas, listas ni estados globales de negocio.

No se modificaron:

- `scrGenerarFolio`
- `scrGenerarPedido`
- `scrContactosClientes`
- Workflows / Power Automate
- Estructura de listas SharePoint
- Nombres de listas
- Columnas
- Logica de generacion de folios

## Cambios realizados

| Commit | Pantalla | Cambio | Riesgo |
| --- | --- | --- | --- |
| `2212312` | `scrMisCotizaciones` | Protege recargas de `colDocsCotizaciones` cuando `CotizacionesGallery.Selected.FolderPath` esta vacio. El boton de subir archivo ahora muestra `Notify` y no llama `SubmitForm(AdjuntarArchivoForm)` si no hay carpeta. El campo de destino del adjunto devuelve `Blank()` cuando no hay `FolderPath`. | Bajo |
| `2e0b8db` | `scrMisCotizaciones` | Corrige dos validaciones de revision que antes notificaban falta de archivo pero continuaban ejecutando el bloque de guardado. El bloque existente queda en el `else` de la validacion. | Bajo |
| `0e85004` | `scrFDI` | Corrige `EnviarButton.DisplayMode`, que estaba vacio, para deshabilitar el boton durante `varEnviando`. Tambien normaliza `Set(varVista, "Cotización")` al valor usado por la pantalla. | Bajo |

## Detalle por pantalla

### scrMisCotizaciones

Se cerraron los casos donde la pantalla podia fallar o consultar documentos sin cotizacion/carpeta seleccionada:

- `OnVisible`
- cambio de tab con `NextArrow5`
- flujos de solicitud/revision que refrescan `colDocsCotizaciones`
- formulario de adjuntos
- boton `SubirButton`

Tambien se corrigieron las validaciones no bloqueantes:

- `ConfirmarPatchButton`
- `ConfirmarPatchButton_3`

No se cambio el contenido de los `Patch`; solo se evito que se ejecutaran cuando faltaba el archivo requerido.

### scrFDI

Se corrigio un estado visual/funcional incompleto:

- `EnviarButton.DisplayMode` ya no queda vacio.
- El boton se deshabilita cuando `varEnviando` esta activo para reducir riesgo de doble envio.
- `varVista` vuelve a `"Cotización"` de forma consistente despues del flujo.

No se modifico la generacion de folio ni el flujo de `CotizaciónForm.OnSuccess`.

## Pruebas realizadas

- Validacion de que `Controls/263.json` parsea correctamente como JSON.
- Validacion de que `Controls/48.json` parsea correctamente como JSON.
- Verificacion de 9 protecciones `Clear(colDocsCotizaciones)` tanto en `Src/scrMisCotizaciones.pa.yaml` como en `Controls/263.json`.
- Verificacion de que `ConfirmarPatchButton` y `ConfirmarPatchButton_3` ya no contienen el patron no bloqueante `false, true`.
- Verificacion de que `EnviarButton.DisplayMode` queda como `If(varEnviando, DisplayMode.Disabled, DisplayMode.Edit)`.
- Verificacion de que `Set(varVista, "Cotizacion")` ya no existe en `scrFDI`.
- Verificacion de que el `.msapp` del ZIP limpio `FDI_portable_no_pcf_unmanaged.zip` coincide por SHA-256 con `CanvasApps/mapc_fdi_412ec_DocumentUri.msapp`.
- Verificacion de que no reaparecieron referencias a `OFRns`, `OFRTinyMCEEditor`, `hto_OFRns`, `CodexControls`, `RAW.ColorPicker` ni `raw_RAW.ColorPicker` en el paquete limpio.

## Pendientes no implementados

Estos puntos se documentan porque requieren decision de negocio, SharePoint o cambios de mayor alcance:

- Definir si `scrMisCotizaciones` debe permitir filtro por mas de un vendedor/estado o si conviene forzar seleccion unica para mejorar delegacion.
- Confirmar indices SharePoint para `Created`, `Estado`, `Folio`, `Folder path` y campos de busqueda usados por las bandejas.
- Revisar si el `Notify("Puente guardado...")` de `CotizaciónForm.OnSuccess` debe permanecer como mensaje operativo o retirarse como mensaje tecnico.
- Definir reglas de negocio para impedir envio de FDI sin sistemas cuando `colTabs` esta vacio.
- Validar en ambiente real si todos los estados de revision actuales son suficientes o si se requiere normalizar estados.
- Revisar App Checker dentro de Power Apps Studio despues de importar, porque no se ejecuto Studio desde este entorno.

## Conclusion

Las dos pantallas quedaron mas estables para uso real dentro del alcance permitido. Se cerraron fallos claros de vacios/nulos, boton de envio y validaciones no bloqueantes sin tocar SharePoint, workflows, folios ni estados globales de negocio.
