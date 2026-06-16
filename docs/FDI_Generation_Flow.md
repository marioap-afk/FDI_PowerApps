# Flujo de Generación FDI

## Resumen Ejecutivo

El flujo queda dividido en dos responsabilidades:

- `scrFDI` guarda la solicitud, los sistemas y el detalle repetible en SharePoint.
- `scrCorreo` envía un correo HTML editable usando el flujo `Correo_Teams_Solicitud_Cotización`.
- `Creación_FDI` se dispara cuando `Cotizaciones 2026.Estado = "Sin asignar"` y `CarpetaCreada` no es verdadero.
- La generación avanzada del Excel usa una plantilla base y un payload JSON multi-sistema construido desde listas normalizadas.

## Causa Raíz

La solicitud podía quedar incompleta porque las tablas repetibles de `scrFDI` vivían solo en colecciones locales:

- `colListadoPiezas`
- `colListadoTarimas`
- `colElementoSeguridad`
- `colListadoColores`

Antes no se persistía el detalle normalizado de esas tablas al crear el registro de cada sistema. Eso impedía reconstruir todos los datos necesarios para cotizar una FDI con varios sistemas.

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
  - guarda el detalle de `SEL`, `DIN`, `PBK`, `DRV`, `CAN`, `MEZ`, `CFL`, `MZL` y `OT` en sus listas de SharePoint;
  - guarda tablas repetibles en listas hijas por `SistemaCotizaciónID`;
  - mantiene `PayloadSistemaJson` solo como espejo de compatibilidad para registros `SEL` legacy;
  - actualiza `Cotizaciones 2026.Estado` a `Sin asignar`;
  - limpia colecciones de captura al terminar.

Las listas y columnas vienen de `docs/sharepoint/FDI_System_Lists_Field_Reference.md`; la app no renombra columnas.

### Fuente de Generación

`Creación_FDI` arma el payload global leyendo las listas normalizadas:

- `Sistemas por cotización` define las instancias, orden y nombre de cada tab.
- Las listas de detalle (`Sistema Selectivo`, `Sistema Dinámico`, etc.) aportan Bloque R/C/A y campos propios.
- Las listas hijas (`Hija Tarimas`, `Hija Productos`, `Hija Colores`, etc.) se agrupan por `SistemaCotizaciónID`.

`PayloadSistemaJson` ya no es fuente del flujo. Queda únicamente como espejo temporal en `Sistema selectivo` para compatibilidad histórica.

`Sistema selectivo.Lista de piezas` está exportado en `References/DataSources.json` como `type: string`, `format: uri`, por lo que no debe usarse para guardar JSON.

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

Después de enviar el correo, el mismo flujo publica la notificación Teams. Para conservar el contrato de 4 parámetros desde Power Apps, el flujo obtiene el folio desde el asunto automático, busca `Cotizaciones 2026` con `$filter` por `Folio` y `$top = 1`, publica Teams y marca `Notificado = true` cuando encuentra el registro.

`Notificación_correo_teams` queda como flujo legado/redundante por ahora. No se elimina, pero el cierre de solicitud ya no depende de su trigger SharePoint.

## Mapa Excel

### Encabezado

La plantilla `templates/FDI_Master.xlsx` contiene la hoja `Datos de cotización`. Los scripts llenan la columna `B`.

| Dato | Celda |
| --- | --- |
| Folio | `Datos de cotización!B6` |
| Vendedor | `Datos de cotización!B7` |
| Cliente | `Datos de cotización!B8` |
| Contacto | `Datos de cotización!B9` |
| Dirección | `Datos de cotización!B10` |
| Correo | `Datos de cotización!B11` |
| Teléfono | `Datos de cotización!B12` |
| Moneda | `Datos de cotización!B15` |
| Flete | `Datos de cotización!B16` |
| País / Estado / Ciudad de envío | `Datos de cotización!B17:B19` |
| Fianzas / Póliza / Monto / Licitación / Prioridad | `Datos de cotización!B22:B26` |
| Fecha de entrega | `Datos de cotización!B29` |
| Fecha FDI | `Datos de cotización!B30` |
| Notas generales | `Datos de cotización!B33` |

### Sistemas

La hoja `Índice de sistemas` contiene la tabla `tblSistemas` en `A5:F*`. Los scripts limpian desde la fila 6, escriben una fila por sistema y redimensionan la tabla.

| Columna | Valor |
| --- | --- |
| `#` | Índice del sistema en el payload |
| `Tipo` | `SEL`, `DIN`, `PBK`, `DRV`, `CAN`, `MEZ`, `CFL`, `MZL` u otro |
| `Sistema` | Nombre o descripción breve |
| `Método de captura` | `Diseño`, `Listado de piezas`, `Planos/diseño de cliente` o `Cotización o pedido anterior` |
| `Hoja` | Hoja generada para el sistema |
| `Notas` | Consideraciones especiales |

### Formularios por Sistema

El template incluye formularios base para `SEL`, `DIN`, `PBK`, `DRV`, `CAN`, `MEZ`, `CFL` y `MZL`. Para cada sistema, los scripts renombran o copian el formulario base a `TIPO_S##_Form`; los tipos no soportados generan una hoja simple `TIPO_S##_Form`.

Campos comunes:

- `B5`: número de sistema.
- `B6`: `SistemaID`.
- `B7`: método de cotización.
- `B8`: descripción.
- `B12:B14`: referencia a cotización/pedido anterior.
- `A17:E22`: listado de piezas cuando aplique.
- `Acabado`: selector base del sistema.
- `Galvanizado` y `Tipo de galvanizado`: derivados desde `Acabado`; no se capturan como campos independientes.

Cada sistema soportado también genera una hoja `TIPO_S##_Datos` con las tablas completas: piezas, tarimas, productos, elementos de seguridad, piezas especiales, colores y proveedores externos.

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
2. Condiciones de trigger: `Estado.Value = "Sin asignar"` y `CarpetaCreada != true`.
3. Protección interna: continuar solo si `CarpetaCreada != true`.
4. Crear/validar carpeta de año, carpeta de cotización y subcarpeta `Docs`.
5. Leer `Sistemas por cotización` por `CotizaciónID`.
6. Leer listas de detalle por `CotizaciónID`: `Sistema Selectivo`, `Sistema Dinámico`, `Sistema Pushback`, `Sistema Drive In`, `Sistema Cantiliver`, `Sistema Mezzanine`, `Sistema Carton Flow`, `Sistema Mezzanine Limpio` y `Sistema Otro`.
7. Leer listas hijas por `CotizaciónID`: `Hija Listado Piezas`, `Hija Tarimas`, `Hija Productos`, `Hija Colores`, `Hija Elementos Seguridad`, `Hija Piezas Especiales` y `Hija Proveedores Externos`.
8. Iterar `Sistemas por cotización`; para cada puente, localizar su detalle por `SistemaCotizaciónID` y anexar hijas por el mismo ID.
9. Armar `Payload_Global` con `{ cotizacion, sistemas }`.
10. Copiar `/Recursos/FDI_Master.xlsx` a `Docs`.
11. Ejecutar Office Script `scripts/office-scripts/fill-fdi-workbook.ts` sobre la copia.
12. Copiar cotizador.
13. Actualizar `Carpeta`, `FolderPath` y `CarpetaCreada` únicamente después de terminar la generación.

El flujo ya no actualiza ni copia `FDI_Master_Puente.xlsx`.

### Parámetro de Office Script

El workflow define el parámetro `FDI_OfficeScriptId`.

Después de importar la solución, Claude/Power Automate debe vincular este valor al Office Script real creado a partir de:

```text
scripts/office-scripts/fill-fdi-workbook.ts
```

El conector usado es Excel Online Business `RunScriptProd`.

El JSON exportado del workflow debe conservar `ScriptParameters` como objeto:

```json
"ScriptParameters": {
  "payloadJson": "@outputs('Payload_Global_JSON')"
}
```

No debe quedar una combinación de estas dos formas:

```text
ScriptParameters/payloadJson
ScriptParameters: ""
```

Si Power Automate muestra `GetSingleScript failed` o no puede resolver la referencia del script, hacer este ajuste manual después de importar:

1. Abrir la acción `Run_FDI_Office_Script`.
2. Seleccionar de nuevo el script `fill-fdi-workbook`.
3. Confirmar que Power Automate muestra el parámetro `payloadJson`.
4. Asignar `payloadJson` a:

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
- Validar si `Creación_FDI` debe dispararse antes o después de enviar correo. Actualmente se dispara al cerrar `scrFDI`, antes del correo.
- Confirmar en Power Automate que el `file` dinámico de `FDI_Crear` resuelve correctamente en Excel Online Business.

## Prueba Local Desde Registros SharePoint

El fixture `examples/fdi-sharepoint-records.sample.json` simula:

- una cotización `Cotizaciones 2026`;
- registros en `Sistemas por cotización`;
- registros de detalle normalizados;
- registros de listas hijas agrupables por `SistemaCotizaciónID`;
- compatibilidad con registros legacy `Sistema selectivo` que todavía tengan `PayloadSistemaJson`.

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
