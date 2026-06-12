# Auditoría de validación FDI - 2026-06-10

## Resumen ejecutivo

Se auditó `scrFDI` y `scrCorreo` desde el `.msapp` actual. `scrFDI` contiene un formulario real, `CotizaciónForm`, contra `Cotizaciones 2026`. `scrCorreo` no contiene Forms/DataCards; envía por `Correo_Teams_Solicitud_Cotización.Run(destinatario, asunto, html, cc)`.

No se encontraron DataCards ocultos con `Required=true`. El error genérico venía de `EnviarButton`, que dependía de `CotizaciónForm.Valid` y mostraba "Faltan campos obligatorios" sin identificar el campo. Los riesgos reales estaban en campos requeridos visibles cuyo `Update` puede quedar en `Blank()` aunque el usuario vea parte del formulario lleno, especialmente contacto, correo, teléfono y lookups de envío.

## Causa raíz

| Severidad | Control | Fórmula | Causa |
| --- | --- | --- | --- |
| Alta | `EnviarButton` | `If(CotizaciónForm.Valid, SubmitForm(CotizaciónForm), Notify("Faltan campos obligatorios..."))` | La validación era genérica y no construía evidencia por campo. |
| Alta | `CorreoDataCardValue` | `Default = If(varCorreoSnap = "", Coalesce(ThisItem.'Nombre de contacto', ""), varCorreoSnap)` | El default del correo apuntaba al nombre del contacto en vez de `Correo empresarial`. |
| Media | `DataCardValue33`, `DataCardValue21`, `DataCardValue22` | `DefaultSelectedItems = Parent.Default` o `[Parent.Default]` | En edición de borrador, los ComboBox usan listas con `ID/Title`, pero el default del lookup viene como `Id/Value`. |

## Forms y DataCards

| Form | DataSource | Item | Mode | Participa | Riesgo |
| --- | --- | --- | --- | --- | --- |
| `CotizaciónForm` | `Cotizaciones 2026` | `varCotizacionDraft` | `FormMode.New` / `EditForm` si hay borrador | `SubmitForm(CotizaciónForm)` | Requería validación explícita antes de `SubmitForm`. |
| `scrCorreo` | N/A | N/A | N/A | No tiene Form/DataCards | Solo usa controles de correo y Flow. |

| DataCard | Visible | Required | Update | Riesgo |
| --- | --- | --- | --- | --- |
| `Solicitud o generación_DataCard1` | No | No | Solicitud fija | Bajo. |
| `Folio_DataCard1` | No | No | `varFolioGenerado` | Bajo, depende de generación existente. |
| `Title_DataCard3` | No | No | `varClienteSel.Title` | Bajo. |
| `VendedoresLookUp_DataCard1` | Sí | Sí | `{Id, Value}` desde `VendedorComboBox` | Requiere selección. |
| `EmpresaLookUp_DataCard1` | Sí | Sí | `{Id, Value}` desde `ClienteComboBox` | Requiere selección. |
| `ContactoLookUp_DataCard2` | Sí | Sí | `{Id, Value}` desde `ContactoLookUpComboBox` | Requiere selección y lista filtrada por cliente. |
| `Correo empresarial_DataCard2` | Sí | Sí | `CorreoDataCardValue.Text` | Falla si el contacto no tiene correo o no se captura manualmente. |
| `Número de teléfono_DataCard2` | Sí | Sí | `NúmeroDeTelefonoDataCardValue.Text` | Falla si el contacto no tiene teléfono o no se captura manualmente. |
| `Moneda de cotización_DataCard2` | Sí | Sí | `DataCardValue26.Selected` | Requiere selección. |
| `Flete_DataCard2` | Sí | Sí | Toggle | Bajo. |
| `País de destino_DataCard3` | Sí | Condicional por flete | `{Id, Value}` | Requiere selección si hay flete. |
| `Estado de destino_DataCard2` | Sí | Condicional por flete | `{Id, Value}` | Requiere selección si hay flete. |
| `Ciudad de destino_DataCard2` | Sí | Condicional por flete | `{Id, Value}` | Requiere selección si hay flete. |
| `Fianzas_DataCard2` | Sí | Sí | Toggle | Bajo. |
| `Póliza de responsabilidad civil_DataCard2` | Sí | Sí | Toggle | Bajo. |
| `Monto de póliza_DataCard1` | Condicional | No | `Value(Text)` | Riesgo si el texto no es numérico. |
| `Licitación_DataCard2` | Sí | Sí | Toggle | Bajo. |
| `Fecha de entrega_DataCard1` | Sí | No | Fecha | Bajo. |
| `Prioridad_DataCard1` | Sí | No en DataCard, validada manualmente | `Selected` | Se agregó validación explícita por requisito funcional. |
| `Attachments_DataCard3` | Sí | No | Attachments | Bajo. |

## Validaciones agregadas

Se creó `colErroresFDI` con registros `{Campo, Mensaje, Screen, Control}`. `EnviarButton.OnSelect` ahora valida antes de generar folio y antes de `SubmitForm`:

| Campo | Control |
| --- | --- |
| Vendedor | `VendedorComboBox` |
| Cliente | `ClienteComboBox` |
| Contacto | `ContactoLookUpComboBox` |
| Correo empresarial | `CorreoDataCardValue` |
| Número de teléfono | `NúmeroDeTelefonoDataCardValue` |
| Moneda | `DataCardValue26` |
| Prioridad | `DataCardValue1` |
| País/Estado/Ciudad de envío | `DataCardValue33`, `DataCardValue21`, `DataCardValue22` si `Flete=true` |
| Sistemas | `colTabs` |
| Selectivo | método, lista de piezas, pedido/cotización anterior, colores |
| Otro | comentario HTML |

## Mejoras visuales y estabilidad

Se agregó `lblErroresFDIResumen`, visible solo cuando `CountRows(colErroresFDI) > 0`, arriba de `CotizaciónForm`. El `OnFailure` de `CotizaciónForm` ahora llena `colErroresFDI` con `CotizaciónForm.Error` y desactiva `varEnviando`.

No se modificó `scrCorreo`; ya conserva bloqueo con `locEnviandoCorreo`, `IfError`, navegación a inicio solo en éxito y contrato de 4 parámetros.

## Diagnóstico PCF

El editor actual es `RichTextEditor@2.7.0` en:

| Ubicación | Control |
| --- | --- |
| `scrFDI` | `RichTextEditorFDI` |
| `scrCorreo` | `RichTextEditorCorreo` |
| Componente reutilizable | `cmpCardRich > RichCardRich` |

El control actual es el editor enriquecido estándar basado en CKEditor incluido por Power Apps. No hay PCF propio activo para este editor.

Recomendación futura: crear PCF `Montilla.FDI.RichTextHtmlEditor` con propiedades `value`, `defaultValue`, `disabled`, `placeholder`, `allowTables`, `allowImages`, `height`, `maxHtmlLength`, salida `html`. TipTap/ProseMirror es la opción más flexible para tablas e imágenes redimensionables; Quill es más ligero pero las tablas suelen requerir extensiones; TinyMCE tiene mejor funcionalidad lista para usar, pero se debe revisar licenciamiento y tamaño.

Para Excel, las imágenes no deberían viajar solo como HTML base64 dentro de SharePoint si el payload crece. La integración más segura sería guardar adjuntos/archivos y pasar referencias al Flow, dejando que Office Script inserte imágenes desde archivos o que Power Automate las coloque antes de ejecutar el script.

## Riesgos pendientes

- Si un contacto no tiene correo o teléfono en SharePoint, ahora se mostrará el campo exacto y el usuario podrá capturarlo manualmente.
- `Monto de póliza` sigue sin validación numérica avanzada; no se tocó porque no era causa directa.
- Las validaciones de sistemas son mínimas y seguras; reglas comerciales más profundas deben definirse antes de bloquear más casos.
- Los flows legacy no se modificaron en esta iteración.

## Plan de pruebas

1. Abrir `scrFDI` y presionar `Enviar solicitud` sin llenar campos: debe aparecer el panel con lista de campos.
2. Seleccionar cliente/contacto sin correo o teléfono: debe indicar exactamente correo o teléfono.
3. Crear FDI con flete activo y sin Estado/Ciudad: debe indicar esos campos.
4. Crear FDI con 1 SEL por listado de piezas sin piezas: debe indicar el sistema Selectivo.
5. Crear FDI con 1 OT sin comentario: debe indicar el sistema Otro.
6. Llenar todo y enviar: debe conservar el flujo actual hacia `scrCorreo`, correo, child flow y generación de Excel.
