# FDI — Backlog de refinamiento del flujo de cotizaciones

> **Autor:** Claude Release (rol: validar/empaquetar). Esto es **análisis y propuesta**;
> la implementación es de **Codex**. Convierte las recomendaciones de
> [FDI_Cotizaciones_Flow.md](FDI_Cotizaciones_Flow.md) en tareas accionables.
> Base: código de `scrFDI` / `scrMisCotizaciones` / `scrGenerarPedido` / `Creación_FDI`
> y los diagramas `diagrams/flujo-cotizaciones-{macro,micro,bitacora}.mmd`.

## A. Lo que hace falta (decidir / aclarar antes de implementar)

Codex puede **entender** el flujo con lo que ya hay; para **implementar limpio** se necesita
resolver esto primero. Marcado con 🔐 lo que toca **schema de SharePoint** (requiere tu visto
bueno por la regla del proyecto).

| # | Decisión / aclaración | Por qué bloquea | Schema |
| --- | --- | --- | --- |
| D1 | **¿Se agrega el estado terminal `Declinada / Perdida`?** (cliente no compra / vence) | Hoy el embudo cierra solo en *Comprada*; sin esto no hay tasa de cierre. | 🔐 nuevo valor en el choice `Estado` |
| D2 | **¿Se persiste `Asignada` como valor propio de `Estado`**, o se mantiene el salto directo a *En proceso* (como hoy)? | Afecta el KPI coordinador↔ingeniero y la UI. | 🔐 si se persiste |
| D3 | **Edit-lock por estado:** ¿en qué estados la cotización es editable? (propuesta: `Asignada, En proceso, En espera de información, Corrección requerida`) | Define el candado de inmutabilidad de lo enviado. | No |
| D4 | **Guard de *Enviar a cliente*:** ¿qué cuenta como "FDI/documento generado"? ¿bloquea si hay solicitudes pendientes? | Sin la regla exacta no se puede validar el botón. | No |
| D5 | **Catálogo `Tipo de solicitud`** de `Solicitudes en cotizaciones`: ¿cuáles son las opciones oficiales? (información, **actualización**, ¿otras?) | El flujo de *Solicitud de actualización* depende de este valor. | 🔐 posible (opciones del choice) |
| D6 | **Vencimiento:** ¿la caducidad de una cotización es un estado `Vencida` o solo una fecha/indicador? | Define si hay nuevo estado o cálculo. | 🔐 si es estado |
| D7 | **KPIs:** ¿qué tiempos quieres exponer (Sin asignar→Asignada del coordinador; Asignada→entrega del ingeniero) y dónde (tablero/reporte)? | Define si se agregan columnas de timestamp o se derivan de la Bitácora. | 🔐 posible (columnas de fecha) |
| D8 | **Reapertura por actualización:** ¿ya está implementada? (existen los eventos `Solicitud de actualización` y `Solicitud reabierta` en Bitácora) ¿o falta cablear el estado de regreso? | Evita duplicar lógica; confirma si es tarea nueva o ajuste. | No |

## B. Backlog priorizado (tareas para Codex)

| ID | Tarea | Detalle | Prioridad | Schema | Depende de |
| --- | --- | --- | --- | --- | --- |
| **R1** | **Bloqueo de edición por estado** | Hacer la cotización y sus sistemas **solo lectura** en `Lista para enviar / Enviada a cliente / Comprada`. Editar requiere *Reabrir* (vía Solicitud de actualización, con Bitácora). Una regla única de `DisplayMode` en vez de candados sueltos. | 🔴 Alta | No | D3 |
| **R2** | **Guard al *Enviar a cliente*** | Habilitar solo si: estado = *Lista para enviar* **y** sin solicitudes de información pendientes **y** existe el FDI generado. Hoy solo valida el estado. | 🔴 Alta | No | D4 |
| **R3** | **Estado terminal `Declinada / Perdida`** | Agregar el cierre negativo del embudo tras *Enviada a cliente*; con su color/etiqueta en la galería y registro en Bitácora. | 🔴 Alta | 🔐 Sí | D1 |
| **R4** | **Reapertura por Solicitud de actualización** | Confirmar/cablear `Enviada a cliente`/`Comprada` → (Solicitud de actualización: precio/diseño/error) → *Reabrir* a *En proceso*, con Bitácora `Solicitud de actualización`. | 🟠 Media | Posible (D5) | D5, D8 |
| **R5** | **Asignación controlada** | Solo el coordinador (`varPuedeAsignarFDI`) asigna; impedir reasignar sin registrar en Bitácora. | 🟠 Media | No | — |
| **R6** | **Decisión `Asignada`** | Según D2: persistir como estado propio (para KPI) o mantener salto directo. Si se persiste, agregar valor + transición + UI. | 🟠 Media | 🔐 si D2=sí | D2 |
| **R7** | **KPIs de tiempos** | Exponer tiempos por etapa (coordinador vs ingeniero), derivados de Bitácora o columnas de timestamp. | 🟠 Media | 🔐 posible | D7 |
| **R8** | **Catálogo `Tipo de solicitud`** | Fijar las opciones oficiales y usarlas de forma consistente (información / actualización / …). | 🟡 Baja | 🔐 posible | D5 |
| **R9** | **Vencimiento de cotización** | Implementar caducidad según D6 (estado `Vencida` o indicador por fecha). | 🟡 Baja | 🔐 si estado | D6 |
| **R10** | **Simplificación de sub-estados de solicitud** | En el macro basta `Pendiente → Resuelta/Cancelada`; el detalle fino (aceptada / info subida / rechazada) puede vivir en la Bitácora. Opcional/cosmético. | 🟡 Baja | No | — |

## C. Fuera de alcance de este backlog (referencias)

- **Rendimiento de `scrMisCotizaciones`** (delegación, `StartsWith`, etc.): ya está en
  [FDI_MisCotizaciones_Performance.md](FDI_MisCotizaciones_Performance.md).
- **Notificaciones (correo/Teams) por transición:** no cubierto aquí. Vive en `scrCorreo` +
  el flujo `Correo_Teams_Solicitud_Cotización`. Si el refinamiento incluye avisos, hace falta
  un **mapa de notificaciones** aparte (puedo armarlo si lo pides).

## Top 3 si hay que priorizar

1. **R1** — Bloqueo de edición por estado (protege lo enviado; sin schema).
2. **R2** — Guard de *Enviar a cliente* (evita enviar incompleto; sin schema).
3. **R3** — Estado `Declinada / Perdida` (cierra el embudo; **requiere tu visto bueno de schema**).
