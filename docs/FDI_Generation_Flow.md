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
  - persiste tablas repetibles de `SEL` como JSON en el campo existente `Sistema selectivo.Lista de piezas`;
  - deja resumen corto en `Piezas de usuario` y `Elementos de seguridad`;
  - actualiza `Cotizaciones 2026.Estado` a `Sin asignar`;
  - limpia colecciones de captura al terminar.

No se crearon columnas ni listas.

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

## Integración Power Automate Propuesta

Para producción, `Creación_FDI` debe evolucionar así:

1. Trigger: item creado/modificado en `Cotizaciones 2026`.
2. Condición: `Estado.Value = "Sin asignar"` y `CarpetaCreada != true`.
3. Crear carpeta de cotización y subcarpeta `Docs`.
4. Obtener sistemas puente por `CotizaciónID`.
5. Obtener detalles de cada sistema en `Sistema selectivo` y `Sistema Otro`.
6. Armar `payloadJson`.
7. Copiar `FDI_Master.xlsx` a la carpeta `Docs`.
8. Ejecutar Office Script `scripts/office-scripts/fill-fdi-workbook.ts` sobre la copia.
9. Crear o copiar cotizador.
10. Actualizar `Carpeta`, `FolderPath` y `CarpetaCreada`.

El flujo actual todavía usa `FDI_Master_Puente.xlsx`, que es riesgoso para concurrencia porque es un archivo compartido mutable.

## Pendientes

- Decidir si los adjuntos del correo deben salir de:
  - adjuntos del item de `Cotizaciones 2026`;
  - archivos en carpeta `Docs`;
  - parámetro nuevo del flujo de correo.
- Implementar adjuntos requiere ampliar el contrato del flujo de correo.
- Convertir el script local a Office Script completo si se quiere llenar también las hojas de detalle desde Power Automate.
- Definir plantilla/formato para tipos de sistema distintos a `SEL`.
- Validar si `Creación_FDI` debe dispararse antes o después de enviar correo. Actualmente se dispara al cerrar `scrFDI`, antes del correo.
