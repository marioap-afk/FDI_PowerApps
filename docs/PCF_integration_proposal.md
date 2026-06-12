# Propuesta de integración del PCF `FDI.HtmlEditor` en el canvas app

## Problema confirmado

La solución importa correctamente (la versión sube en el portal, los flujos se
actualizan), pero **el `.msapp` no abre** — *"Error al abrir el archivo"*.

Tras varias iteraciones se aisló la causa raíz comparando contra el último
`.msapp` que sí abre (export del 9-jun, que usa `richTextEditor` nativo):

| commit   | PCF en `References/Templates.json` | Instancias usan | Coherente | Resultado    |
|----------|------------------------------------|-----------------|-----------|--------------|
| 05367e6  | no registrado                      | PCF             | huérfano  | no abre      |
| 0e8f861  | **registrado en UsedTemplates**    | PCF             | **sí**    | **no abre**  |
| 1605d66  | no registrado (volvió richText)    | PCF             | huérfano  | no abre      |

**Dato decisivo:** `0e8f861` tenía el registro del PCF coherente (registrado en
`UsedTemplates` y usado por las instancias) y **aun así no abrió**. Por lo tanto
el problema **no es** el registro en `Templates.json`.

## Por qué falla el enfoque actual

La metadata de un *code component* (PCF) dentro de un `.msapp` **no se puede
sintetizar a mano**. Al insertar el componente, Power Apps Studio genera:

- `DynamicControlDefinitionJson` (manifiesto del control en el árbol)
- el manifiesto de recursos (`/PCF/*.js`, `/PCFControls/<control>/bundle.js`, css, resx)
- las `PcfConversions` y el `PowerAppsControlInfo`
- entradas correlacionadas en `Properties.json`, `References/Templates.json` y
  los `Controls/*.json` / `Components/*.json`

El loader del documento valida esa metadata de forma cruzada y **rechaza la
versión construida manualmente**. Editar el JSON del `.msapp` a mano para
inyectar el PCF produce un documento que importa pero no abre. Esto es
exactamente lo que advierte el propio README del PCF:
*"Power Apps debe registrar primero el code component"*.

## Solución propuesta (camino confiable)

Obtener **un baseline autorizado por Studio** con el PCF ya insertado, y **no
volver a editar a mano** la metadata del PCF.

### 1. Insertar el PCF una sola vez en Power Apps Studio (requiere el entorno)

- El PCF ya está instalado en el entorno (solución `FDIHtmlEditor` 1.5.1).
- Abrir la app en Studio desde un baseline sano.
- Activar *Configuración → Próximas funciones → Componentes de código para canvas*.
- *Insertar → Obtener más componentes → Código → `FDI.HtmlEditor`*.
- Reemplazar los 3 editores y conectar `DefaultHtml` / `HtmlText`:
  - `HtmlEditorCorreo` en `scrCorreo`
  - `HtmlEditorSistemaOT` en `scrFDI`
  - `HtmlEditorCardRich` en el componente `cmpCardRich`
- **Guardar y Publicar.** Exportar la solución unmanaged.

### 2. Ese `.msapp` exportado pasa a ser el baseline canónico del repo

Codex hace `pac canvas unpack` sobre él y commitea el resultado como nueva base.

### 3. Regla permanente para Codex

- **NO** editar a mano: `References/Templates.json`, `Properties.json`, ni el
  objeto `Template` / `DynamicControlDefinitionJson` de los controles PCF.
  Deben quedar **verbatim** como los generó Studio.
- Editar **solo** los `Src/*.pa.yaml` (fórmulas, layout, bindings de propiedades)
  y la metadata no-PCF.
- Repaquetar con `pac canvas pack` (no ensamblar el `.msapp` a mano).

## Plan B (si el camino Studio se bloquea)

Mantener `richTextEditor` nativo (estado del baseline 9-jun para esos 3
controles) y **reenviar todas las demás mejoras que sí funcionan**: filtrado por
rol/permisos, lookups acotados por fecha, layouts responsivos, child flow. Se
pierde el editor HTML custom pero la app abre y se entrega el resto.

## Verificaciones de empaquetado (Claude)

Antes de empaquetar se valida, además de SHA / mojibake / registro de
`customizations.xml`:

- Que todo template usado por instancias (`Controls/*.json`, `Components/*.json`)
  esté registrado en `References/Templates.json` **y** que no haya templates
  huérfanos.
- Que `Properties.json` y la metadata del PCF **no difieran** del baseline de
  Studio (señal de edición manual).

---

## Estado de este commit

Este commit revierte el canvas app al último baseline sano **`e81f021`** (último
commit antes de la primera inyección del PCF, `a1bc837`): usa `richTextEditor`
nativo, sin PCF, e incluye todo el trabajo previo (capa de permisos, persistencia
de URL de carpeta, detalle de errores de flujo).

**Se conservan** el código fuente del PCF (`pcf/FDIHtmlEditor/`) y la solución PCF
empaquetada (`solutions/FDI_PCFHtmlEditor_*`) para retomar el camino de Studio.

**Queda en el historial** (no se borra) el trabajo posterior al PCF que estaba
entrelazado con la inyección manual: filtrado por rol (`131b264`), lookups por
fecha (`000cda9`, `9ae7166`), layouts responsivos (`23ee850`). Se puede reaplicar
sobre el baseline de Studio.

### Para desplegar este baseline en el entorno

Al empaquetar, subir `Other/Solution.xml` `<Version>` por encima de la instalada
(1.0.0.6) y refrescar `<AppVersion>` en `mapc_fdi_412ec.meta.xml` a un timestamp
UTC actual; si no, Power Platform omite la actualización de la canvas app.
