# FDI — Flujo de cotizaciones (ciclo de vida, revisiones y bitácora)

> Documento de referencia derivado del código de `scrFDI`, `scrMisCotizaciones`,
> `scrGenerarPedido` y el flujo `Creación_FDI`. Acompaña al diagrama
> [docs/diagrams/flujo-cotizaciones.mmd](diagrams/flujo-cotizaciones.mmd).

## Resumen

Una cotización nace como **Borrador** en `scrFDI`, se envía y queda **Sin asignar**
(lo que dispara el flujo `Creación_FDI` que crea su carpeta en SharePoint). Se
**asigna** a un ingeniero técnico-comercial (**Asignada**) y este empieza a trabajar
(**En proceso**). Durante el trabajo puede **solicitar información** (queda *En espera
de información*) y/o **enviar documentos a revisión** del **vendedor** (*En revisión
por parte de vendedor*). Si el vendedor rechaza, pasa a **Corrección requerida**; si
aprueba todo, pasa a **Lista para enviar**. De ahí **Enviada a cliente** y, si el
cliente compra, **Comprada** (se genera el pedido). En cualquier estado activo —salvo
*Enviada a cliente* y *Comprada*— puede **Cancelarse**. **Cada transición y acción se
registra en la Bitácora.**

## Listas de SharePoint involucradas

| Lista | Rol en el flujo | Columnas clave |
| --- | --- | --- |
| `Cotizaciones 2026` | La cotización | `Estado`, `Estado desde`, `AsignadoSnapShot`, `VendedoresLookUp`, `Folder path`, `Folio` |
| `Bitácora cotizaciones` | Registro de auditoría (1 renglón por evento) | ver tabla de Bitácora |
| `Solicitudes en cotizaciones` | Solicitudes de información | `Estado de solicitud`, `FolioLookUp`, `Tipo de solicitud` |
| `Carpeta cotizaciones` | Biblioteca de documentos | `En revisión?`, `Estado de revisión`, `Folder path`, `Link to item` |

## Roles

- **Ingeniero técnico-comercial**: recibe la cotización **Asignada** y la trabaja
  (*En proceso*); arma documentos, sube información y los manda a revisión.
- **Vendedor**: **revisa y aprueba/rechaza** los documentos enviados a revisión.
- **Admin / líder** (`varEsAdminFDI`, `varPuedeAsignarFDI`): asigna las cotizaciones
  *Sin asignar*.

## Estados de la cotización

| # | Estado | Significado | Cómo se llega | Pantalla / acción |
| --- | --- | --- | --- | --- |
| 1 | **Borrador** | Solicitud en captura, solo local del creador. | Se crea en `scrFDI` (`Defaults`, `Estado = Borrador`). | `scrFDI` |
| 2 | **Sin asignar** | Enviada; lista para asignar. Dispara `Creación_FDI`. | Botón *Enviar solicitud* en `scrFDI` (`Estado = Sin asignar`). | `scrFDI` → flujo |
| 3 | **Asignada** | Asignada a un ingeniero técnico-comercial. | Acción *Asignar* (popup) sobre la cotización. | `scrMisCotizaciones` |
| 4 | **En proceso** | El ingeniero está trabajando. | Inicia el ingeniero técnico-comercial. | `scrMisCotizaciones` |
| 5 | **En espera de información** | Hay una solicitud de información pendiente. | Crear *Solicitud de información*. | `scrMisCotizaciones` |
| 6 | **En revisión por parte de vendedor** | Documentos enviados al vendedor. | *Enviar a revisión* / *anexar evidencia* (sin documentos rechazados). | `scrMisCotizaciones` |
| 7 | **Corrección requerida** | El vendedor rechazó al menos un documento. | El vendedor *rechaza* un documento. | `scrMisCotizaciones` |
| 8 | **Lista para enviar** | El vendedor aprobó la revisión. | El vendedor *aprueba* todos los documentos. | `scrMisCotizaciones` |
| 9 | **Enviada a cliente** | Enviada al cliente. | Botón *Enviar a cliente* (habilitado solo si *Lista para enviar*). | `scrMisCotizaciones` |
| 10 | **Comprada** | El cliente compró; se genera el pedido. | Tras *Enviada a cliente*. | `scrMisCotizaciones` / `scrGenerarPedido` |
| 11 | **Cancelada** | Cancelada. | Acción *Cancelar* desde **cualquier estado activo**, **excepto** *Enviada a cliente* y *Comprada*. | `scrMisCotizaciones` |

> **Nota de implementación:** el código de la asignación fija `Estado = "En proceso"`
> al asignar; *Asignada* es el paso de negocio inmediatamente anterior. Confirmar con
> Codex si *Asignada* debe persistirse como valor de `Estado` propio o se mantiene como
> transición directa a *En proceso*.

## Transiciones principales

| De | A | Disparador | Evento en Bitácora |
| --- | --- | --- | --- |
| Borrador | Sin asignar | *Enviar solicitud* (`scrFDI`) | `Sin asignar` (creación) |
| Sin asignar | Asignada | *Asignar la cotización* | (asignación) |
| Asignada | En proceso | Inicia el ingeniero técnico-comercial | — |
| En proceso | En espera de información | *Crear solicitud de información* | `Solicitud de información creada` |
| En espera de información | En proceso | *Información subida* / solicitud aceptada / rechazada / cancelada | `Información subida`, `Solicitud de información rechazada`, `Solicitud de información cancelada`, `Solicitud reabierta`, `Solicitud de actualización` |
| En proceso | En revisión por parte de vendedor | *Enviar a revisión* / *anexar evidencia* (sin rechazados) | `Enviado a revisión`, `Evidencia anexada a revisión` |
| En revisión por parte de vendedor | Lista para enviar | El vendedor **aprueba** todos los documentos | `Documento aprobado` |
| En revisión por parte de vendedor | Corrección requerida | El vendedor **rechaza** un documento | `Corrección requerida` |
| Corrección requerida | En revisión por parte de vendedor | *Actualizar evidencia* → reenviar | `Enviado a revisión` / `Evidencia anexada a revisión` |
| Lista para enviar | Enviada a cliente | *Enviar a cliente* | `Enviada a cliente` |
| Enviada a cliente | Comprada | El cliente compra | — |
| cualquier estado activo* | Cancelada | *Cancelar* | (cancelación) |

\* Excepto *Enviada a cliente* y *Comprada*.

## Ciclo de revisión de documentos (`Carpeta cotizaciones`)

Cada documento tiene `En revisión?` (booleano) y `Estado de revisión` (opción).

| Estado de revisión | Significado | Transición |
| --- | --- | --- |
| `Pendiente` | Enviado a revisión, esperando al vendedor. | Al *enviar a revisión* / *anexar evidencia* (`En revisión? = true`). |
| `Aprobado` | El vendedor lo aprobó. | El vendedor *aprueba*. |
| `Rechazado` | El vendedor lo rechazó. | El vendedor *rechaza* → cotización a *Corrección requerida*. |

- Si **ningún** documento está `Rechazado`, la cotización queda *En revisión por parte
  de vendedor*; si hay rechazados, vuelve a *En proceso*.
- *Actualizar evidencia* reemplaza un documento rechazado por uno nuevo (el viejo:
  `En revisión? = false`; el nuevo: `Pendiente`).

## Solicitudes de información (`Solicitudes en cotizaciones`)

Columna `Estado de solicitud`:

| Estado de solicitud | Significado |
| --- | --- |
| `Pendiente` | Solicitud creada, esperando información. |
| `Aceptada` | Aceptada. |
| `Información subida` | Se subió la información solicitada. |
| `Rechazada` | Rechazada. |
| `Cancelada` | Cancelada. |

- Crear una solicitud lleva la cotización a *En espera de información*.
- Cuando ya no hay solicitudes pendientes, la cotización regresa a *En proceso*.

## Bitácora (`Bitácora cotizaciones`)

Cada transición/acción inserta **un renglón** con:

| Campo | Contenido |
| --- | --- |
| `FolioLookUp` | `{ Id, Value }` de la cotización (ID + Folio). |
| `Evento` | El evento (ver lista abajo). |
| `Estado anterior` | Estado de la cotización antes del cambio. |
| `Estado nuevo` | Estado de la cotización después del cambio. |
| `Creado` | `Now()`. |
| `UsuarioSnapShot` | `User().FullName`. |
| `Usuario` | Persona SharePoint (claims + email). |
| `Comentario` | Texto del usuario / detalle (p. ej. evidencia anexada). |
| `Evidencia` | URL del documento (`Link to item`) cuando aplica. |

**Eventos registrados (vistos en el código):** `Sin asignar`, `Solicitud de
información creada`, `Información subida`, `Solicitud de actualización`, `Solicitud de
información rechazada`, `Solicitud de información cancelada`, `Solicitud reabierta`,
`Enviado a revisión`, `Evidencia anexada a revisión`, `Documento aprobado`, `Corrección
requerida`, `Enviada a cliente`.

## Diagrama

Ver [docs/diagrams/flujo-cotizaciones.mmd](diagrams/flujo-cotizaciones.mmd) (render
`flujo-cotizaciones.svg`) para la vista gráfica del ciclo, los dos subciclos
(revisión de documentos y solicitudes) y la bitácora transversal.
