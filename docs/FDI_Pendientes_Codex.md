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

## Estado actual (2026-06-17)

- **Empaquetado BLOQUEADO** por **0i**: el reskin (`0b0d755`, 1.0.0.20) ya tiene **0 Label `Radius*`**,
  pero el binario sigue siendo **`pac canvas pack` (forward-slash), sin validar por Studio**. Falta
  **abrirlo en Studio sin PA2108** y exportar (backslash). Último build empaquetable sano garantizado
  = **`a97e7eb` (1.0.0.17, pre-reskin)** — regenerable con `git checkout a97e7eb` + packer.
- Builds de reskin **no desplegar** hasta export real de Studio: `2ee102a` (1.0.0.18, PA2108),
  `6ed8d89` (1.0.0.19, fix incompleto), `0b0d755` (1.0.0.20, Label OK pero pac-pack sin validar).
- `solutions/` **purgado**: se borraron todos los ZIP intermedios (regenerables desde su commit).
  Solo queda el **PCF** `FDI_PCFHtmlEditor_unmanaged_1.5.2`. `[Content_Types].xml` de referencia
  ahora vive en `.codex/skills/fdi-app-packaging/Content_Types.xml` (ya no depende de ZIPs sueltos).
- **RBAC**: documentación de listas hecha; usuario ya **creó** `Usuarios`/`Permisos`. Falta poblar
  `Permisos` + bootstrap admin (P1) y P2–P4 (Codex).

## Pendientes

| # | Pendiente | Prioridad | Detalle | Estado |
| --- | --- | --- | --- | --- |
| 0i | **BLOQUEANTE — el reskin debe abrir en Studio sin `PA2108`**. El reskin aplicó `Radius*` por esquina a `Label@2.5.1` (no las soporta). **Progreso:** `6ed8d89` (1.0.0.19) quitó solo 8/192 (Studio reporta por lotes); el **sweep `0b0d755` (1.0.0.20) ya dejó 0 Label `Radius*`** ✅. **Falta lo decisivo:** el binario **sigue siendo `pac canvas pack` (rutas con `/`), sin validar por Studio** → no hay garantía de que abra. `GroupContainer`(494)/`Button`(276) son válidos; **`Image@2.2.3`(20) sin verificar** (si no soporta `Radius*`, será el próximo lote PA2108). **Acción:** abrir 1.0.0.20 en Power Apps Studio; si abre **sin PA2108**, Guardar/Publicar y exportar (binario con `\`) → entonces se empaqueta. Si lanza PA2108 (p. ej. en Image), barrer también. | 🔴 **Bloqueante** | PA2108 (sesión 9af22165…) | ⏳ Label OK (0/192); falta export real de Studio (1.0.0.20 es pac-pack) |
| 0h | **GUID viejo de la lista "Sistema Otro" → 404 en app + flujo** (misma clase que 0b). La lista `Sistema Otro` se recreó (GUID nuevo); el viejo `80069fdc-2de1-4c95-a88b-02770ca25959` quedó fijado → `GetTable failed 404 "List not found"`. Vive en **4 lugares funcionales**: (1) flujo `Workflows/Creacin_FDI…json`, acción **`Get_sistemas_ot`**; (2) `CanvasApps/mapc_fdi_412ec.meta.xml` (`"Sistema Otro":{"tableName":"80069fdc…"}`); (3) `Other/Customizations.xml` (idem); (4) **dentro del `.msapp`**: `References/DataSources.json` + `Properties.json`. El usuario ya re-apuntó la acción del flujo **por nombre en el portal**, pero **no sobrevive al re-import** hasta actualizar la fuente. **Fix:** en **Studio** quitar y re-agregar el data source `Sistema Otro` (re-bindea al GUID vivo dentro del `.msapp`) **y** re-exportar el flujo (actualiza el JSON). El **GUID nuevo** se saca de la lista viva en SharePoint (el export de metadata del repo es viejo, aún trae el `80069fdc`). | 🔴 Alta | [FDI_DataSource_Bug_Report.md](FDI_DataSource_Bug_Report.md) (misma clase) | ⏳ arreglado en portal; falta fuente (app + flujo) |
| 9 | **Controles para adjuntar archivos en los sistemas (no existen aún)**: añadir captura de archivos por sistema/pieza — p. ej. **layout/imagen**, **diseño del cliente**, etc. Definir: destino de almacenamiento (biblioteca SharePoint vs adjuntos de lista), alcance (por sistema o por pieza), tipos permitidos, y persistencia en el payload/flujo + plantilla. | 🟠 Media | feature nuevo — dominio de Codex | ❌ abierto |
| 0f | **Plantilla + Office Script: quitar hojas `*_Datos`, normalizar tablas en `*_Form`** (y reducir lentitud del flujo). Toca `templates/FDI_Master.xlsx`, `scripts/generate-fdi-excel.py`, `scripts/office-scripts/fill-fdi-workbook.ts` — **dominio de Codex**. | 🟠 Media | [FDI_Plantilla_Script_Normalizar_Spec.md](FDI_Plantilla_Script_Normalizar_Spec.md) | ❌ abierto |
| 0g | **Lentitud**: (a) cambio a correo lento = `OnSuccess` ~63 escrituras secuenciales; (b) envío de correo lento = flujo con 16 `GetItems` secuenciales + Office Script creando hojas `_Datos`. Mitigaciones documentadas. | 🟡 Baja | [FDI_Plantilla_Script_Normalizar_Spec.md](FDI_Plantilla_Script_Normalizar_Spec.md) | ❌ abierto |
| 0e | **BLOQUEANTE — Enviar correo bloquea "Completa… cuerpo" aunque se vea lleno**: la validación lee `HtmlEditor1.HtmlText` (salida del PCF), que está **vacía hasta que el usuario edita** el editor; el texto visible es el `DefaultHtml` (entrada). Sin tocar el cuerpo → `HtmlText` vacío → bloquea (y el `.Run` enviaría cuerpo vacío). Fix: `locCuerpoHtml: Coalesce(HtmlEditor1.HtmlText, varCuerpoDefault)` en validación y envío, o emitir `HtmlText=DefaultHtml` en init del PCF. | 🔴 **Bloqueante** | [FDI_Correo_CuerpoVacio_Bug_Report.md](FDI_Correo_CuerpoVacio_Bug_Report.md) | ❌ abierto |
| 0d | ~~**el proceso de cotización (Enviar) no completa**~~ → **✅ RESUELTO por el usuario**: el `OnSuccess` abortaba antes de `Navigate(scrCorreo)` porque el `Select_Colores_Sistema` (y/o el flujo) llamaba `ColorNombre` donde la columna es `Color`. Corregido → ya llega a `scrCorreo`. | ✅ Cerrado | [FDI_Enviar_OnSuccess_Bug_Report.md](FDI_Enviar_OnSuccess_Bug_Report.md) | ✅ resuelto (falta commitear fuente) |
| 0c | **BLOQUEANTE — campos requeridos vacíos → Enviar no valida**: `Correo empresarial` y `Número de teléfono` (`Required`) quedaban vacíos porque el autollenado del contacto usaba `ContactoLookUpComboBox.Selected.Id` → **null** → `LookUp(Contactos, ID=null)` → 0 filas. Fix aplicado en fuente: `ContactoLookUp` resuelve el registro real con `LookUp(Contactos, Title = Selected.Value)`, guarda `{Id, Value}` con `Contactos.ID`, llena `varCorreoSnap`/`varTelSnap`, y se reforzó la hidratación de Cliente/País/Estado/Ciudad al editar borradores. | 🔴 **Bloqueante** | [FDI_Form_CamposVacios_Bug_Report.md](FDI_Form_CamposVacios_Bug_Report.md) | ✅ fuente corregida; falta Guardar/Publicar en Studio y reprobar Enviar |
| 0b | ~~**data source duplicado `Sistema selectivo` (404)**~~ → **✅ RESUELTO**: el Monitor confirma `cmpCarddrp` resolviendo `Sistema Selectivo` (GUID `49e4088a…`) → HTTP 200; 0 referencias a la minúscula en `Src/`. Codex re-apuntó `'Sistema selectivo'`→`'Sistema Selectivo'` y quitó el bloque legacy de `PayloadSistemaJson`. | ✅ Cerrado | [FDI_DataSource_Bug_Report.md](FDI_DataSource_Bug_Report.md) | ✅ resuelto (verificado en runtime) |
| 0 | **BLOQUEANTE — claves duplicadas en `Src/scrFDI_OT.pa.yaml`** (tras el split): `LayoutMinHeight`/`LayoutMinWidth` quedaron duplicadas en un `GroupContainer`, lo que impedía abrir Studio con `PA1001 YamlInvalidSyntax`. Se dejó una sola vez cada propiedad con mínimo `=16`, y se revisaron las pantallas `scrFDI_*.pa.yaml` para confirmar que no hubiera otro duplicado igual. | 🔴 **Bloqueante** | error de import a Studio (líneas 104–107) | ✅ fuente corregida; falta Guardar/Publicar en Studio |
| 1 | ~~Regenerar el `.msapp` desde Studio~~ → **✅ HECHO**: `f8bd8ef`/`82558bd` ya es **canónico** (`Src/`==`Controls/`, 18==18 pantallas, gate de integridad PASS). El split/R2 están vivos en runtime. | ✅ Cerrado | [FDI_scrFDI_Performance.md](FDI_scrFDI_Performance.md) | ✅ canónico |
| 2 | **`scrCorreoPlantilla`**: sigue usando la colección vieja `MyPeople`; alinear a `Destinatario`/`CC` con esquema proyectado (como ya se hizo en `scrCorreo`). | 🟠 Media | [FDI_Correo_Bug_Report.md](FDI_Correo_Bug_Report.md) §3 / tabla §5 (ítem 4) | ✅ fuente actualizada; falta Guardar/Publicar en Studio |
| 3 | **Confirmar en Studio** que el correo abre/envía sin errores y que `varEnviando` se resetea en `OnFailure` del form. | 🟠 Media | [FDI_Correo_Bug_Report.md](FDI_Correo_Bug_Report.md) §2 / tabla §5 (ítem 3) | ✅ fuente confirmada; ⏳ probar en Studio |
| 4 | **Rendimiento R2** — cachear el borrador activo en un registro (`varDraftActual`) y enlazar los campos de hidratación a él. Se agregó un `Set(varDraftActual, LookUp(colXXX_Draft, SistemaId = locTabSel.SistemaId))` por pantalla y se reemplazaron las lecturas de campo; los `Patch(...)` quedaron sin cambios. | 🔴 Alta | [FDI_scrFDI_Performance.md](FDI_scrFDI_Performance.md) §R2 | ✅ fuente aplicada; falta Guardar/Publicar en Studio |
| 5 | **Rendimiento R5** — galerías: precalcular `CountRows`/`LookUp` por fila en un cálculo único. | 🟠 Media | [FDI_scrFDI_Performance.md](FDI_scrFDI_Performance.md) §R5 | ❌ abierto |
| 6 | **Rendimiento R4** — delegación del `LookUp` de borrador (`'Created By'.Email` / `Estado.Value` no delegables). | 🟠 Media | [FDI_scrFDI_Performance.md](FDI_scrFDI_Performance.md) §R4 | ❌ abierto |
| 7 | **Permisos de usuario** — implementar el RBAC (lista `Usuarios` con auto-registro, matriz `Permisos`, `varCaps` multi-rol, gating, pantalla admin in-app). Backlog P1–P8. | 🟠 Media | [FDI_Permisos_Usuario_Design.md](FDI_Permisos_Usuario_Design.md) §6 | ❌ abierto (decisiones D1–D7 cerradas) |
| 8 | **Trazabilidad de versión** — bumpear `<Version>`/`AppVersion` por export (se resuelve solo si #1 se hace por Studio). | 🟡 Baja | reportes de empaquetado | ⏳ |

## Decisión de rendimiento (2026-06-16) — RESUELTA

Se hizo **R2** (cache `varDraftActual`) sobre el estado con split y se **midió con Monitor**: el
usuario reporta la captura **"mucho más rápida"** y el trace muestra `Navigate(scrFDI→scrFDI_MZL)`
ágil (≈180 ms) con el split **vivo en runtime**. **Decisión:** **mantener el split + R2** (ya no se
revierte). R5/R4 quedan como mejoras incrementales opcionales.

## Cerrados recientemente (referencia)

- ✅ Fix people picker `scrCorreo` (esquema proyectado + `Collect(CC, ForAll(...))`) — `f214298`.
- ✅ Fix people picker `scrCorreoPlantilla` (`MyPeople` → `Destinatario`, esquema `{DisplayName, UserPrincipalName, Mail}`) — fuente lista; falta compilar por Studio.
- ✅ `CotizaciónForm.OnFailure` contiene `Set(varEnviando, false)` y `OnSuccess` mantiene `Navigate(scrCorreo, ScreenTransition.None)` — fuente confirmada.
- ✅ Fix autollenado Contacto: `ContactoLookUp` ya no usa `Selected.Id`; resuelve por `Contactos.Title`, llena correo/teléfono y refuerza defaults de lookups al editar.
- ✅ Fix data source Selectivo: referencias de fuente normalizadas a `Sistema Selectivo`; falta quitar `Sistema selectivo` en Studio y publicar.
- ✅ Fix PA1001 en `scrFDI_OT`: se quitaron propiedades YAML duplicadas (`LayoutMinHeight`/`LayoutMinWidth`) y quedó el mínimo `=16`.
- ✅ R2 cache de borrador activo: `varDraftActual` en las 9 pantallas `scrFDI_XXX` y lecturas de hidratación sin `LookUp` repetido; falta compilar por Studio.
- ✅ R6 DelayOutput (7→133) y R3 `Concurrent`/`TipoIndex` O(n²) — `19d4409`/`3bb1391` *(en `Src/`; falta compilar por Studio, ver #1)*.
- ✅ Split de captura por sistema **en `Src/`** — `d5691a2` *(falta compilar por Studio, ver #1)*.
