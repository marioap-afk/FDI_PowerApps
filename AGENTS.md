# AGENTS.md

## Regla obligatoria: label de build

Siempre que se modifique la canvas app FDI o se regenere
`CanvasApps/mapc_fdi_412ec_DocumentUri.msapp`, tambien se debe actualizar el
label visible de build antes de validar, empaquetar, commitear o entregar.

Ubicacion actual del label:

- Desempacar el `.msapp` con `pac canvas unpack`.
- Editar el fuente desempacado `Src/scrInicio.pa.yaml`.
- Buscar el texto `FDI Build`.

El label debe reflejar el build entregado:

- version/build de la app;
- fecha y hora del empaquetado;
- referencia de commit o rama usada para el build.

Validacion minima antes de cerrar:

- Confirmar con `rg` el valor final del label en `Src/scrInicio.pa.yaml`.
- Ejecutar `pac canvas pack` despues del cambio.
- Ejecutar `pac canvas unpack` del `.msapp` final cuando aplique.
- Reportar en la respuesta final el valor que quedo en el label.

Esta regla aplica aunque el cambio principal este limitado a otra pantalla, por
ejemplo `scrMisCotizaciones`. Si el usuario limita explicitamente el alcance e
impide tocar `scrInicio`, se debe pedir confirmacion antes de entregar un
`.msapp` con el label obsoleto.

## Regla obligatoria: base = ultimo export publicado del usuario

Codex SIEMPRE parte del ultimo `.msapp` que el usuario exporto tras abrir la app
en Power Apps Studio, compilar y **Publicar** — NUNCA de un `.msapp` viejo del
repo. Regenerar o commitear un `.msapp` que no derive del export publicado mas
reciente **revierte los cambios del usuario** (p. ej. formulas borradas en
`scrAdmin` que "reaparecen" commit tras commit).

Requisitos:

- Cuando el usuario entrega un export, usarlo como base: `pac canvas unpack` de
  **ese** `.msapp`, no del que esta en el repo si difiere.
- Si el cambio NO requiere editar la app, commitear el `.msapp` del export
  **tal cual** (es el canonico, ya compilado por Studio).
- Senal de base canonica antes de commitear: `Header.LastSavedDateTimeUTC`
  fresco (un Publish real de Studio) y la compuerta `fdi-msapp-integrity` en
  **PASS** (Src == Controls). Si la base esta sin compilar (FAIL del gate),
  pedir al usuario que Publique y re-exporte antes de seguir.
- Tras cada cambio que regenere el `.msapp`, **bumpear la version** de la
  solucion (evita dos binarios con el mismo AppVersion).

## Regla obligatoria: responsividad

Cada cambio de UI en la canvas app FDI debe ser responsivo por defecto. Esto
incluye cualquier control nuevo, cambio de propiedades, ajuste visual, pantalla,
galeria, formulario, popup, panel, contenedor, tab, boton, etiqueta, icono o
asset embebido.

Requisitos minimos para cada cambio:

- No usar anchos, altos, `X` o `Y` fijos si el control puede depender de
  `Parent.Width`, `Parent.Height`, `App.Width`, `App.Height`,
  `Parent.Size`, `App.ActiveScreen.Size` o contenedores auto-layout.
- Validar comportamiento en telefono, tablet y escritorio.
- Evitar que paneles laterales, galerias, tabs, formularios, popups y botones
  se encimen o salgan del viewport.
- Usar wrap, scroll, `LayoutMinWidth = 0`, anchos `Max`/`Min`, columnas
  adaptativas y layouts verticales en pantallas pequenas cuando aplique.
- Si se agrega un control, debe tener tamanos y posicionamiento adaptativos
  desde el primer commit.
- Antes de entregar, revisar con `rg` las formulas relevantes de la pantalla
  modificada y reportar cualquier excepcion consciente.

Esta regla aplica a toda la aplicacion, incluyendo telefono y tablet, aunque el
pedido original mencione solo una pantalla o un componente especifico.

## Regla obligatoria: cierre con commit y push

Siempre que se proponga o aplique una solucion con cambios en el repositorio,
se debe cerrar el trabajo dejando la rama lista para que Claude pueda
empaquetar desde GitHub.

Requisitos minimos antes de entregar:

- Aplicar los cambios en los archivos reales de la solucion, no solo describirlos.
- Validar y dejar listo para empaquetar segun el tipo de cambio:
  - canvas app: `pac canvas pack` y `pac canvas unpack` del `.msapp` final
    cuando aplique;
  - PCF: seguir la regla de empaquetado PCF si el cambio toca
    `pcf/FDIHtmlEditor/`;
  - documentacion/configuracion: revisar el diff y estado de Git.
- Hacer commit con los archivos del alcance del cambio.
- Hacer push de la rama al remoto correspondiente.
- Reportar en la respuesta final el hash del commit y confirmar si el push fue
  exitoso.

No incluir archivos generados o no relacionados en el commit. Si existen
archivos no trackeados ajenos al cambio, dejarlos fuera y reportarlos.
