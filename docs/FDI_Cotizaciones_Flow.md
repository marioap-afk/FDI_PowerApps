# FDI — Flujo de cotizaciones (ciclo de vida, revisiones y bitácora)

> Documento de referencia derivado del código de `scrFDI`, `scrMisCotizaciones`,
> `scrGenerarPedido` y el flujo `Creación_FDI`. El flujo se modela en **dos capas**:
> - **MACRO** (ciclo de vida): [diagrams/flujo-cotizaciones-macro.mmd](diagrams/flujo-cotizaciones-macro.mmd)
> - **MICRO** (dentro de *En proceso*): [diagrams/flujo-cotizaciones-micro.mmd](diagrams/flujo-cotizaciones-micro.mmd)
> - **BITÁCORA**: [diagrams/flujo-cotizaciones-bitacora.mmd](diagrams/flujo-cotizaciones-bitacora.mmd)

## Resumen

Una cotización nace **Borrador** en `scrFDI`, se envía y queda **Sin asignar** (dispara
`Creación_FDI`, que crea su carpeta en SharePoint). El **coordinador** la **asigna** a un
ingeniero técnico-comercial (**Asignada**; el ingeniero no acepta/rechaza) y este empieza
a trabajar (**En proceso**). Dentro de *En proceso* ocurren los **subprocesos**: solicitar
información y enviar documentos a **revisión del vendedor**; si el vendedor aprueba todo, la
cotización pasa a **Lista para enviar**. De ahí **Enviada a cliente** y, según el cliente:
**Comprada** (se genera pedido) o **Declinada/Perdida**. Si el cliente pide un cambio de
precio/diseño o reporta un error, se levanta una **Solicitud de actualización** que la
**reabre** a *En proceso* (incluso después de *Comprada*). En cualquier estado activo —salvo
*Enviada a cliente* y *Comprada*— puede **Cancelarse**. **Cada transición/acción se registra
en la Bitácora.**

## Modelo en dos capas

- **MACRO (ciclo de vida):** pocos estados, lineal y legible —
  `Borrador → Sin asignar → Asignada → En proceso → Lista para enviar → Enviada a cliente → {Comprada | Declinada}`
  (+ `Cancelada` y la reapertura por *Solicitud de actualización*).
- **MICRO (dentro de *En proceso*):** *En espera de información*, *En revisión por parte de
  vendedor* y *Corrección requerida* son **fases de trabajo** del ingeniero, no hitos de
  primer nivel. Viven dentro de *En proceso* como dos subciclos (solicitudes y revisión de
  documentos) que regresan al tronco.
- **Implementación:** se mantiene **un solo campo `Estado`** (lo más simple en Power Apps);
  la separación macro/micro es de **lectura/diseño** (agrupar las fases de trabajo), y el
  detalle fino se delega a la **Bitácora** en vez de a más estados.

## Listas de SharePoint

| Lista | Rol | Columnas clave |
| --- | --- | --- |
| `Cotizaciones 2026` | La cotización | `Estado`, `Estado desde`, `AsignadoSnapShot`, `VendedoresLookUp`, `Folder path`, `Folio` |
| `Bitácora cotizaciones` | Registro de auditoría (1 renglón por evento) | ver sección Bitácora |
| `Solicitudes en cotizaciones` | Solicitudes de información / actualización | `Estado de solicitud`, `FolioLookUp`, `Tipo de solicitud` |
| `Carpeta cotizaciones` | Biblioteca de documentos | `En revisión?`, `Estado de revisión`, `Folder path`, `Link to item` |

## Roles

- **Coordinador** (`varPuedeAsignarFDI`): asigna las cotizaciones *Sin asignar*. El tiempo
  *Sin asignar → Asignada* es **su KPI**.
- **Ingeniero técnico-comercial**: recibe la cotización **Asignada** (no puede negarse) y la
  trabaja (*En proceso*). El tiempo *Asignada → entrega* es **su KPI**.
- **Vendedor**: **revisa y aprueba/rechaza** los documentos enviados a revisión.

## Estados — capa MACRO

| # | Estado | Significado | Cómo se llega |
| --- | --- | --- | --- |
| 1 | **Borrador** | En captura, solo local del creador. | `scrFDI` (`Defaults`, `Estado = Borrador`). |
| 2 | **Sin asignar** | Enviada; dispara `Creación_FDI`. | Botón *Enviar solicitud* (`scrFDI`). |
| 3 | **Asignada** | Asignada a un ingeniero (marca de KPI). | El coordinador asigna; el ingeniero **no** acepta/rechaza. |
| 4 | **En proceso** | El ingeniero trabaja (contiene la capa MICRO). | Inicia el trabajo (automático tras asignar). |
| 5 | **Lista para enviar** | El vendedor aprobó la revisión. | El vendedor aprueba todos los documentos. |
| 6 | **Enviada a cliente** | Enviada al cliente. | Botón *Enviar a cliente* (solo si *Lista para enviar*). |
| 7 | **Comprada** | El cliente compró; se genera pedido. | Tras *Enviada a cliente*. |
| 8 | **Declinada / Perdida** | El cliente no compró / venció. | Tras *Enviada a cliente*. |
| 9 | **Cancelada** | Cancelada. | *Cancelar* desde **cualquier estado activo**, **excepto** *Enviada a cliente* y *Comprada*. |

> **Sobre *Asignada*:** aporta poco como estado de trabajo, pero se conserva por **KPI /
> trazabilidad de responsabilidad** (separa el tiempo del coordinador del tiempo del
> ingeniero). El ingeniero **no** acepta/rechaza la asignación. *(Nota técnica: hoy el código
> de asignación fija `Estado = "En proceso"`; confirmar con Codex si *Asignada* se persiste
> como valor propio de `Estado` o solo como hito/marca de tiempo en la Bitácora.)*

## Fases de trabajo — capa MICRO (dentro de *En proceso*)

| Fase | Significado |
| --- | --- |
| *(base)* | El ingeniero arma documentos / captura sistemas. |
| **En espera de información** | Hay una solicitud de información pendiente (subciclo A). |
| **En revisión por parte de vendedor** | Documentos enviados al vendedor (subciclo B). |
| **Corrección requerida** | El vendedor rechazó al menos un documento. |

## Transiciones MACRO

| De | A | Disparador | Evento en Bitácora |
| --- | --- | --- | --- |
| Borrador | Sin asignar | *Enviar solicitud* (`scrFDI`) | `Sin asignar` |
| Sin asignar | Asignada | El coordinador *asigna* | (asignación) |
| Asignada | En proceso | Inicia el ingeniero (automático) | — |
| En proceso | Lista para enviar | El vendedor **aprueba** la revisión | `Documento aprobado` |
| Lista para enviar | Enviada a cliente | *Enviar a cliente* | `Enviada a cliente` |
| Enviada a cliente | Comprada | El cliente compra | — |
| Enviada a cliente | Declinada / Perdida | El cliente no compra / vence | — |
| Enviada a cliente / Comprada | En proceso | **Solicitud de actualización** (precio / diseño / error) → *Reabrir* | `Solicitud de actualización` |
| cualquier estado activo* | Cancelada | *Cancelar* | (cancelación) |

\* Excepto *Enviada a cliente* y *Comprada*.

## Subciclo A — Solicitudes de información (`Solicitudes en cotizaciones`)

`Estado de solicitud`: `Pendiente → {Aceptada | Información subida | Rechazada | Cancelada}`.
Crear una solicitud lleva la cotización a *En espera de información*; cuando no quedan
solicitudes pendientes, regresa a *En proceso*. La **Solicitud de actualización** del cliente
es del mismo tipo, pero **reabre** una cotización ya enviada/comprada.

## Subciclo B — Revisión de documentos (`Carpeta cotizaciones`)

Cada documento tiene `En revisión?` y `Estado de revisión` (`Pendiente / Aprobado / Rechazado`).

- *Enviar a revisión* / *anexar evidencia* → documentos `Pendiente`, cotización
  *En revisión por parte de vendedor* (si ninguno está `Rechazado`).
- El **vendedor** aprueba (`Aprobado`) o rechaza (`Rechazado` → *Corrección requerida*).
- *Actualizar evidencia* reemplaza el documento rechazado y se reenvía.
- Con **todos** los documentos `Aprobado` → cotización **Lista para enviar**.

## Bitácora (`Bitácora cotizaciones`)

Cada transición/acción inserta **un renglón** con: `FolioLookUp` (Id+Folio), `Evento`,
`Estado anterior`, `Estado nuevo`, `Creado` (`Now()`), `UsuarioSnapShot` (`User().FullName`),
`Usuario` (persona SP/claims), `Comentario` y `Evidencia` (URL del documento, si aplica).

**Eventos (vistos en el código):** `Sin asignar`, `Solicitud de información creada`,
`Información subida`, `Solicitud de actualización`, `Solicitud de información rechazada`,
`Solicitud de información cancelada`, `Solicitud reabierta`, `Enviado a revisión`,
`Evidencia anexada a revisión`, `Documento aprobado`, `Corrección requerida`,
`Enviada a cliente`.

## Bloqueos recomendados (propuesta)

1. **Bloqueo de edición por estado.** La cotización y sus sistemas deben ser **solo lectura**
   en *Lista para enviar / Enviada a cliente / Comprada*; editar requiere **Reabrir** (vía
   *Solicitud de actualización*, registrada en Bitácora). Editable solo en
   `{Asignada, En proceso, En espera de información, Corrección requerida}`.
2. **Guard al *Enviar a cliente*.** Permitirlo solo si: estado = *Lista para enviar*, **no hay
   solicitudes de información pendientes** y **existe el FDI/documento generado**.
3. **Asignación controlada.** Solo el coordinador asigna; **no reasignar** sin dejar rastro en
   Bitácora.

## Diagramas

- **MACRO:** [diagrams/flujo-cotizaciones-macro.mmd](diagrams/flujo-cotizaciones-macro.mmd)
- **MICRO:** [diagrams/flujo-cotizaciones-micro.mmd](diagrams/flujo-cotizaciones-micro.mmd)
- **BITÁCORA:** [diagrams/flujo-cotizaciones-bitacora.mmd](diagrams/flujo-cotizaciones-bitacora.mmd)
