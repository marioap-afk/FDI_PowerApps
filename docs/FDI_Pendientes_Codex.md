# FDI — Pendientes para Codex (índice de handoffs)

> **Autor:** Claude Release (rol: validar/empaquetar). Índice **vivo** de lo abierto. El detalle de
> cada tema vive en su documento; aquí solo el estado y la prioridad. Actualizar al cerrar cada ítem.

## Regla de proceso (división de roles)

- **Codex** desarrolla sobre `Src/*.pa.yaml` y commitea. No necesita Studio ni correr la
  verificación de integridad (no tiene Studio interactivo y `pac canvas` no round-trippea esta app
  por el PCF).
- **Usuario**: para dejar un `.msapp` **canónico/desplegable**, abre la app en **Power Apps Studio**
  (lee `Src/`, muestra los cambios de Codex) y **Guarda/Publica** (regenera `Controls/` en sync +
  bumpea `AppVersion`). Commitea ese `.msapp`.
- **Claude Release**: corre `fdi-msapp-integrity` (compuerta) y empaqueta con `fdi-app-packaging`.
  Un FAIL antes del guardado por Studio es esperado (no es defecto de Codex).

## Pendientes

| # | Pendiente | Prioridad | Detalle | Estado |
| --- | --- | --- | --- | --- |
| 0 | **BLOQUEANTE — claves duplicadas en `Src/scrFDI_OT.pa.yaml`** (tras el split): `LayoutMinHeight`/`LayoutMinWidth` quedaron duplicadas en un `GroupContainer`, lo que impedía abrir Studio con `PA1001 YamlInvalidSyntax`. Se dejó una sola vez cada propiedad con mínimo `=16`, y se revisaron las pantallas `scrFDI_*.pa.yaml` para confirmar que no hubiera otro duplicado igual. | 🔴 **Bloqueante** | error de import a Studio (líneas 104–107) | ✅ fuente corregida; falta Guardar/Publicar en Studio |
| 1 | **Regenerar el `.msapp` desde Studio** (Guardar/Publicar). Hoy `Src/` tiene el split (18 pantallas) pero `Controls/` sigue en la versión vieja (9). Hasta resolverlo, el split / DelayOutput / fix de correo **pueden no estar vivos en runtime** y el último paquete **no es desplegable**. | 🔴 Crítica | [FDI_scrFDI_Performance.md](FDI_scrFDI_Performance.md) §⚠️ CRÍTICO | ❌ abierto |
| 2 | **`scrCorreoPlantilla`**: sigue usando la colección vieja `MyPeople`; alinear a `Destinatario`/`CC` con esquema proyectado (como ya se hizo en `scrCorreo`). | 🟠 Media | [FDI_Correo_Bug_Report.md](FDI_Correo_Bug_Report.md) §3 / tabla §5 (ítem 4) | ✅ fuente actualizada; falta Guardar/Publicar en Studio |
| 3 | **Confirmar en Studio** que el correo abre/envía sin errores y que `varEnviando` se resetea en `OnFailure` del form. | 🟠 Media | [FDI_Correo_Bug_Report.md](FDI_Correo_Bug_Report.md) §2 / tabla §5 (ítem 3) | ✅ fuente confirmada; ⏳ probar en Studio |
| 4 | **Rendimiento R2** — cachear el borrador activo en un registro (`varDraftActual`) y enlazar los campos a él: ~689 `LookUp(colXXX_Draft,…)` → ~1 por pantalla. | 🔴 Alta | [FDI_scrFDI_Performance.md](FDI_scrFDI_Performance.md) §R2 | ❌ abierto |
| 5 | **Rendimiento R5** — galerías: precalcular `CountRows`/`LookUp` por fila en un cálculo único. | 🟠 Media | [FDI_scrFDI_Performance.md](FDI_scrFDI_Performance.md) §R5 | ❌ abierto |
| 6 | **Rendimiento R4** — delegación del `LookUp` de borrador (`'Created By'.Email` / `Estado.Value` no delegables). | 🟠 Media | [FDI_scrFDI_Performance.md](FDI_scrFDI_Performance.md) §R4 | ❌ abierto |
| 7 | **Permisos de usuario** — implementar el RBAC (lista `Usuarios` con auto-registro, matriz `Permisos`, `varCaps` multi-rol, gating, pantalla admin in-app). Backlog P1–P8. | 🟠 Media | [FDI_Permisos_Usuario_Design.md](FDI_Permisos_Usuario_Design.md) §6 | ❌ abierto (decisiones D1–D7 cerradas) |
| 8 | **Trazabilidad de versión** — bumpear `<Version>`/`AppVersion` por export (se resuelve solo si #1 se hace por Studio). | 🟡 Baja | reportes de empaquetado | ⏳ |

## Decisión de rendimiento (2026-06-16)

El split (R1) **no mejoró mucho** el rendimiento percibido y **bajó la estética**. Diagnóstico: el
cuello real es **R2** (los ~689 `LookUp(colXXX_Draft,…)` de hidratación), que **sigue pendiente**.
**Decisión:** hacer **R2 primero** sobre el estado actual (con el split), **medir con el Monitor de
Power Apps** (antes/después), y **recién entonces decidir** si se mantiene el split o se revierte a
una sola pantalla. El split queda **en pausa de decisión** (no revertir ni pulir aún).

## Cerrados recientemente (referencia)

- ✅ Fix people picker `scrCorreo` (esquema proyectado + `Collect(CC, ForAll(...))`) — `f214298`.
- ✅ Fix people picker `scrCorreoPlantilla` (`MyPeople` → `Destinatario`, esquema `{DisplayName, UserPrincipalName, Mail}`) — fuente lista; falta compilar por Studio.
- ✅ `CotizaciónForm.OnFailure` contiene `Set(varEnviando, false)` y `OnSuccess` mantiene `Navigate(scrCorreo, ScreenTransition.None)` — fuente confirmada.
- ✅ Fix PA1001 en `scrFDI_OT`: se quitaron propiedades YAML duplicadas (`LayoutMinHeight`/`LayoutMinWidth`) y quedó el mínimo `=16`.
- ✅ R6 DelayOutput (7→133) y R3 `Concurrent`/`TipoIndex` O(n²) — `19d4409`/`3bb1391` *(en `Src/`; falta compilar por Studio, ver #1)*.
- ✅ Split de captura por sistema **en `Src/`** — `d5691a2` *(falta compilar por Studio, ver #1)*.
