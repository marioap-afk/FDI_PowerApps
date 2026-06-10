# Flujo de Generación FDI

## Resumen Ejecutivo

El flujo queda dividido en dos responsabilidades:

- `scrFDI` guarda la solicitud, los sistemas y el detalle repetible en SharePoint.
- `scrCorreo` envía un correo HTML editable usando el flujo `Correo_Teams_Solicitud_Cotización`.
- `Creación_FDI` se dispara cuando `Cotizaciones 2026.Estado = "Sin asignar"` y `CarpetaCreada` no es verdadero.
- La generación avanzada del Excel debe usar una plantilla base y un payload JSON multi-sistema.

## Causa Raíz

La solicitud podía quedar incompleta porque las tablas repetibles de `scrFDI` vivían solo en colecciones locales:

- `colListadoPiezas`
- `colListadoTarimas`
- `colElementoSeguridad`
- `colListadoColores`

Antes no se persistía un payload estructurado de esas tablas al crear el registro de `Sistema selectivo`. Eso impedía reconstruir todos los datos necesarios para cotizar una FDI con varios sistemas.

También el correo recibía HTML, pero el flujo lo envolvía en `<p>...</p>`, lo que podía romper cuerpos ricos con tablas, vínculos o imágenes.

## Cambios de App

### scrFDI

- `EnviarButton.OnSelect` valida:
  - doble envío con `varEnviando`;
  - al menos un sistema en `colTabs`;
  - que cada tab tenga su borrador correspondiente en `colSEL_Draft` o `colOT_Draft`;
  - campos obligatorios del formulario con `CotizaciónForm.Valid`.
- `CotizaciónForm.OnFailure` muestra error y libera `varEnviando`.
- `CotizaciónForm.OnSuccess`:
  - crea registros puente en `Sistemas por cotización`;
  - guarda sistemas `SEL` y `OT`;
  - guarda los datos principales de `SEL` en campos existentes de `Sistema selectivo`;
  - deja resumen corto en `Piezas de usuario` y `Elementos de seguridad`;
  - actualiza `Cotizaciones 2026.Estado` a `Sin asignar`;
  - limpia colecciones de captura al terminar.

No se crearon columnas ni listas.

### Nota de Persistencia SEL

`Sistema selectivo.Lista de piezas` está exportado en `References/DataSources.json` como `type: string`, `format: uri`, por lo que es un campo URL/hipervínculo y no puede recibir JSON.

Los campos texto existentes de `Sistema selectivo` son de 255 caracteres. No hay un campo existente seguro para guardar el payload JSON completo de piezas, tarimas, colores y elementos de seguridad.

Para persistir el payload completo sin pérdida se requiere crear en SharePoint una columna multilínea, por ejemplo:

```text
PayloadSistemaJson
```

Mientras esa columna no exista, el flujo `Creación_FDI` arma el payload SEL desde los campos existentes y usa `Piezas de usuario` / `Elementos de seguridad` como resumen.

### scrCorreo

- Se limpia `Destinatario` y `CC` al entrar a la pantalla.
- Se mantiene destinatario automático para el coordinador.
- Se mantiene CC automático para los demás cotizadores.
- El cuerpo usa `RichTextEditorCorreo.HtmlText`.
- El editor inicia con un HTML base editable.
- Se valida destinatario, asunto y cuerpo antes de ejecutar el flujo.

### Correo_Teams_Solicitud_Cotización

El parámetro `CuerpoHTML` ahora se pasa al correo como HTML crudo:

```text
@triggerBody()['text_2']
```

Esto permite tablas, vínculos e imágenes embebidas si el control de Power Apps las produce como HTML.

## Mapa Excel

### Encabezado

La plantilla `templates/FDI_Master.xlsx` contiene `Encabezado_Tabla`.

| Dato | Celda |
| --- | --- |
| Creación | Encabezado_Tabla!C2 |
| ID | Encabezado_Tabla!C3 |
| Carpeta | Encabezado_Tabla!C4 |
| Folio | Encabezado_Tabla!C5 |
| VendedoresLookUp | Encabezado_Tabla!C6 |
| EmpresaLookUp | Encabezado_Tabla!C7 |
| Dirección de la empresa | Encabezado_Tabla!C8 |
| ContactoLookUp | Encabezado_Tabla!C9 |
| Correo empresarial | Encabezado_Tabla!C10 |
| Número de teléfono | Encabezado_Tabla!C11 |
| Moneda de cotización | Encabezado_Tabla!C12 |
| Flete | Encabezado_Tabla!C13 |
| País de destino | Encabezado_Tabla!C14 |
| Estado de destino | Encabezado_Tabla!C15 |
| Ciudad de destino | Encabezado_Tabla!C16 |
| Fianzas | Encabezado_Tabla!C17 |
| Póliza de responsabilidad civil | Encabezado_Tabla!C18 |
| Monto de póliza | Encabezado_Tabla!C19 |
| Licitación | Encabezado_Tabla!C20 |
| Fecha de entrega | Encabezado_Tabla!C21 |
| Prioridad | Encabezado_Tabla!C22 |
| Estado | Encabezado_Tabla!C23 |
| Created By | Encabezado_Tabla!C24 |
| Notificado | Encabezado_Tabla!C25 |
| Title | Encabezado_Tabla!C26 |
| Nombre de contacto | Encabezado_Tabla!C27 |
| Solicitud o generación | Encabezado_Tabla!C28 |
| Item Type | Encabezado_Tabla!C29 |
| Path | Encabezado_Tabla!C30 |

### Sistemas

La hoja `Sistemas_Index` recibe una fila por sistema:

| Columna | Valor |
| --- | --- |
| SistemaID | Tipo + consecutivo |
| SistemaNo | Índice de sistema |
| Tipo | `SEL`, `OT`, etc. |
| MétodoCotización | `Diseño`, `ListaPiezas` o `PedidoAnterior` |
| HojaFormulario | hoja generada para el sistema |
| Descripción breve | nombre del sistema |
| PedidoBase | pedido/cotización base si aplica |
| DiseñoRef | referencia de diseño si aplica |
| Notas | consideraciones especiales |

### Selectivo

Cada sistema `SEL` genera una hoja `SEL_S##_Form` y una hoja de detalle `SEL_S##_Datos`.

Campos directos:

- `B3`: número de sistema.
- `B9`: pedido base.
- `B10`: observaciones.
- `A15:E24`: primeras piezas del listado.
- `B28:B34`: primera tarima como resumen visible.
- `B39:B42`: pasillos y dimensiones disponibles.
- `B46:B48`: configuración y alturas críticas.
- `B51:B61`: parámetros finales del sistema.

Las tablas completas se guardan en la hoja `SEL_S##_Datos`:

- Piezas.
- Tarimas.
- Elementos de seguridad.
- Colores.

## Script Local

Generar una FDI de prueba local:

```powershell
python scripts/generate-fdi-excel.py `
  --template templates/FDI_Master.xlsx `
  --payload examples/fdi-payload.sample.json `
  --output work/fdi_closure_20260609_01/output/FDI_TEST_001-26.xlsx
```

El script no modifica la plantilla original.

## Integración Power Automate

`Creación_FDI` ahora sigue este flujo:

1. Trigger: item creado/modificado en `Cotizaciones 2026`.
2. Condición: `Estado.Value = "Sin asignar"`.
3. Protección: continuar solo si `CarpetaCreada != true`.
4. Crear/validar carpeta de año, carpeta de cotización y subcarpeta `Docs`.
5. Leer `Sistemas por cotización` por `CotizaciónID`.
6. Leer `Sistema selectivo` por `CotizaciónID`.
7. Leer `Sistema Otro` por `CotizaciónID`.
8. Armar sistemas `SEL` desde campos existentes de `Sistema selectivo`.
9. Armar sistemas `OT` desde `Sistema Otro.HTML`.
10. Armar `Payload_Global` con `{ cotizacion, sistemas }`.
11. Copiar `/Recursos/FDI_Master.xlsx` a `Docs`.
12. Ejecutar Office Script `scripts/office-scripts/fill-fdi-workbook.ts` sobre la copia.
13. Copiar cotizador.
14. Actualizar `Carpeta`, `FolderPath` y `CarpetaCreada`.

El flujo ya no actualiza ni copia `FDI_Master_Puente.xlsx`.

### Parámetro de Office Script

El workflow define el parámetro `FDI_OfficeScriptId`.

Después de importar la solución, Claude/Power Automate debe vincular este valor al Office Script real creado a partir de:

```text
scripts/office-scripts/fill-fdi-workbook.ts
```

El conector usado es Excel Online Business `RunScriptProd`.

El JSON exportado del workflow no debe conservar una clave obsoleta como:

```text
ScriptParameters/payloadJson
```

Si Power Automate muestra el error de operación `payloadJson is no longer present in the operation schema`, hacer este ajuste manual después de importar:

1. Abrir la acción `Run_FDI_Office_Script`.
2. Borrar cualquier parámetro obsoleto.
3. Seleccionar de nuevo el script `fill-fdi-workbook`.
4. Confirmar que Power Automate muestra el parámetro `payloadJson`.
5. Asignar `payloadJson` a:

```text
outputs('Payload_Global_JSON')
```

`Payload_Global_JSON` sigue existiendo en el flujo para este mapeo.

## Pendientes

- Decidir si los adjuntos del correo deben salir de:
  - adjuntos del item de `Cotizaciones 2026`;
  - archivos en carpeta `Docs`;
  - parámetro nuevo del flujo de correo.
- Implementar adjuntos requiere ampliar el contrato del flujo de correo.
- Definir plantilla/formato para tipos de sistema distintos a `SEL`.
- Validar si `Creación_FDI` debe dispararse antes o después de enviar correo. Actualmente se dispara al cerrar `scrFDI`, antes del correo.
- Confirmar en Power Automate que el `file` dinámico de `FDI_Crear` resuelve correctamente en Excel Online Business.

## Prueba Local Desde Registros SharePoint

El fixture `examples/fdi-sharepoint-records.sample.json` simula:

- una cotización `Cotizaciones 2026`;
- registros en `Sistemas por cotización`;
- dos registros `Sistema selectivo` con `Lista_x0020_de_x0020_piezas` como string JSON;
- un registro `Sistema Otro`.

Generar payload global:

```powershell
python scripts/build-fdi-payload.py `
  --input examples/fdi-sharepoint-records.sample.json `
  --output work/fdi_closure_20260609_02/payload-global-from-records.json
```

Generar Excel de prueba:

```powershell
python scripts/generate-fdi-excel.py `
  --template templates/FDI_Master.xlsx `
  --payload work/fdi_closure_20260609_02/payload-global-from-records.json `
  --output work/fdi_closure_20260609_02/FDI_RECORDS_TEST_001-26.xlsx
```
