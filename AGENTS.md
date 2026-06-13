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
