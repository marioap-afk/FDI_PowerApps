# FDI Cantiléver Process Map

Fuente funcional: [docs/diagrams/diseno-sistema-cantiliver.mmd](../diagrams/diseno-sistema-cantiliver.mmd).

Este documento es la referencia tecnica externa para la captura de Sistema
Cantiléver en `scrFDI`. No debe renderizarse como tabla informativa dentro de la
canvas app.

> **Nota:** el cantiléver almacena **cargas largas sobre brazos en voladizo** (no
> tarimas). Reusa el marco comun (metodo de captura, referencia anterior, datos
> comunes) y difiere asi:
> - "Tarima" → **"Carga / producto"** (tipo abierto, medidas, peso, cantidad por nivel).
> - "Configuracion del rack" → solo **Gondola sencilla / Gondola doble**. El **numero
>   de columnas, longitud y capacidad de brazo, altura de columna, separacion entre
>   niveles, base, voladizo e inclinacion** los **deriva ingenieria** del peso/medidas
>   del producto; **no se capturan** (si el cliente los define, se usa el metodo
>   `Planos/diseño de cliente`). Brazos inclinados = siempre Si (no se pregunta).
> - **No** lleva seccion "Montacargas". Conserva "Area disponible / pasillos".
> - Los **niveles de brazos** los determinan los toggles de "Criterios para
>   configuracion de niveles" (layout, definicion del cliente, altura de montacargas…).
>
> Es una **propuesta**: nombres de colecciones, claves del payload, `TipoKey` y
> columnas SharePoint los **confirma Codex** al implementar. Cualquier columna/lista
> nueva en SharePoint requiere **visto bueno previo** (regla del proyecto).

## Estado SharePoint

La app y la auditoria local no incluyen una fuente/lista SharePoint llamada
`Sistema Cantiléver`. Igual que en los demas sistemas, la implementacion deberia dejar
el sistema disponible en el catalogo, capturar datos en colecciones locales y crear el
registro puente en `Sistemas por cotización`, sin intentar
`Patch('Sistema Cantiléver', ...)` sobre una lista inexistente. El detalle propio
(carga, gondola) viaja en `PayloadSistemaJson` hasta que exista la lista.

Columnas requeridas para activar persistencia de detalle (comunes con los demas):

| Columna requerida | Tipo esperado | Uso |
| --- | --- | --- |
| `CotizaciónID` | Lookup a `Cotizaciones 2026` | Relacionar el sistema con la cotizacion. |
| `SistemasID` | Lookup a `Sistemas por cotización` | Relacionar el detalle con el registro puente. |
| `Folio` | Texto | Trazabilidad de cotizacion. |
| `Title` | Texto | Nombre del sistema en la tab. |
| `PayloadSistemaJson` | Texto multilinea | Payload completo de Cantiléver, incluyendo carga y gondola. |
| `Tipo de diseño` | Opcion o texto | Metodo de captura normalizado. |
| `Piezas de usuario` | Texto multilinea | Resumen de listado de piezas si aplica. |
| `Elementos de seguridad` | Texto multilinea | Resumen de piezas de seguridad si aplica. |
| `Número de pedido o cotización` | Texto | Referencia anterior resumida. |
| `Proveedores externos` | Booleano | Indicador comun. |
| `Pasillo máximo` | Texto/numero | Area disponible. |
| `Pasillo mínimo` | Texto/numero | Area disponible. |
| `Ancho disponible` | Texto/numero | Area disponible. |
| `Largo disponible` | Texto/numero | Area disponible. |
| `Altura crítica de montacargas` | Texto/numero | Criterio de niveles. |
| `Altura crítica de niveles` | Texto | Resumen altura maxima/minima de nave. |
| `Definido por el cliente` | Texto multilinea | Comentarios de configuracion del cliente. |
| `Galvanizado` | Booleano | Derivado de acabado. |
| `Tipo de galvanizado` | Opcion o texto | Derivado de acabado. |
| `Precio por kilogramo galvanizado` | Texto/numero | Solo frio/caliente. |
| `Instalación` | Booleano | Indicador comun. |
| `Memoria de cálculo` | Booleano | Indicador comun. |
| `Unirse a estructura de otro proveedor` | Booleano | Indicador comun. |
| `Consideraciones especiales` | Texto multilinea | Comentarios generales. |

> Datos de **Carga** (tipo, medidas, peso, cantidad/nivel) y **Góndola** van en
> `PayloadSistemaJson.Carga` / `PayloadSistemaJson.Gondola`. Si se quieren columnas
> propias, definirlas con Codex (requiere visto bueno de schema).

## Mapa de procesos

| Nodo del diagrama | Sección UI | Tipo de control esperado | Visible cuando | Campo/columna SharePoint | Colección local si aplica | Validación | Observaciones |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `A` Sistema cantiléver | Sistema Cantiléver | Contenedor de captura | Tab activo `TipoKey = "CAN"` | Lista requerida `Sistema Cantiléver`; registro puente en `Sistemas por cotización` | `colCAN_Draft` | Debe existir tab Cantiléver en catalogo. | Nodo raiz del flujo. |
| `B` Método de captura | Método de captura | Dropdown | Siempre en Cantiléver | Requerida `Tipo de diseño`; `PayloadSistemaJson.MetodoCaptura` | `colCAN_Draft` | Opciones: `Diseño`, `Listado de piezas`, `Planos/diseño de cliente`, `Cotización o pedido anterior`. | Si el cliente define columnas/medidas del rack → método `Planos/diseño de cliente`. |
| `subGraph0` Captura por diseño | Captura por diseño | Contenedor condicional | Método = `Diseño` | `PayloadSistemaJson` | `colCAN_Draft` | Solo visible para captura por diseno. | Agrupa carga, configuracion del rack, area, niveles, seguridad y piezas especiales. |
| `subGraph1` Referencia anterior | Referencia anterior | Grupo de campos | Método = `Cotización o pedido anterior` | `Número de pedido o cotización`; `PayloadSistemaJson` | `colCAN_Draft` | Cotizacion y pedido pueden coexistir. | No es decision excluyente. |
| `subGraph2` Datos comunes del sistema | Datos comunes del sistema | Grupo de campos | Siempre en Cantiléver | Columnas comunes requeridas; `PayloadSistemaJson` | `colCAN_Draft` | Siempre capturable. | Se reutiliza patron comun. |
| `CAR` Sección: Carga / producto | Carga / producto | Grupo de campos | Método = `Diseño` o `Planos/diseño de cliente` | `PayloadSistemaJson.Carga` | `colCAN_Draft` | Reemplaza la Tarima. Con planos del cliente se usa para verificar perfiles. | El cantiléver almacena carga larga, no tarimas. |
| `CAR1` Tipo de producto (texto abierto) | Carga / producto | Text input | Método = `Diseño` o `Planos/diseño de cliente` | `PayloadSistemaJson.Carga.TipoProducto` | `colCAN_Draft` | Texto libre (no dropdown). | Pueden ser muchos tipos; se deja abierto. |
| `CAR2` Longitud de la carga | Carga / producto | Text input numerico | Método = `Diseño` o `Planos/diseño de cliente` | `PayloadSistemaJson.Carga.Longitud` | `colCAN_Draft` | Numero recomendado. | Medida del producto. |
| `CAR3` Sección / diámetro / ancho | Carga / producto | Text input numerico | Método = `Diseño` o `Planos/diseño de cliente` | `PayloadSistemaJson.Carga.Seccion` | `colCAN_Draft` | Numero recomendado. | Medida del producto. |
| `CAR4` Peso por pieza / por nivel | Carga / producto | Text input numerico | Método = `Diseño` o `Planos/diseño de cliente` | `PayloadSistemaJson.Carga.Peso` | `colCAN_Draft` | Numero recomendado. | Base para que ingenieria derive columnas/brazos. |
| `CAR5` Cantidad por nivel | Carga / producto | Text input numerico | Método = `Diseño` o `Planos/diseño de cliente` | `PayloadSistemaJson.Carga.CantidadPorNivel` | `colCAN_Draft` | Numero recomendado. | Por nivel de brazos. |
| `CONF` Sección: Configuración del rack (cantiléver) | Configuración del rack | Grupo de campos | Método = `Diseño` | `PayloadSistemaJson.Gondola` | `colCAN_Draft` | Visible solo en diseno. | Solo captura gondola; el resto lo deriva ingenieria. |
| `CONF1` ¿Góndola sencilla o doble? | Configuración del rack | Dropdown | Método = `Diseño` | `PayloadSistemaJson.Gondola` | `colCAN_Draft` | Debe elegir una opcion. | Define footprint y estabilidad; "una cara / doble cara". |
| `CONF1A` Góndola sencilla | Configuración del rack | Opcion de dropdown | Selector de góndola | `PayloadSistemaJson.Gondola` | `colCAN_Draft` | Opcion valida. | Una cara. |
| `CONF1B` Góndola doble | Configuración del rack | Opcion de dropdown | Selector de góndola | `PayloadSistemaJson.Gondola` | `colCAN_Draft` | Opcion valida. | Doble cara. |
| `AREA` Sección: Área disponible / pasillos | Área disponible / pasillos | Grupo de text inputs | Método = `Diseño` | Columnas area/pasillos requeridas | `colCAN_Draft` | Visible solo en diseno. | Reutiliza patron comun. |
| `P1` Pasillo máximo de montacargas | Área disponible / pasillos | Text input numerico | Método = `Diseño` | `Pasillo máximo` | `colCAN_Draft` | Numero recomendado. | Columna requerida. |
| `P2` Pasillo mínimo de montacargas | Área disponible / pasillos | Text input numerico | Método = `Diseño` | `Pasillo mínimo` | `colCAN_Draft` | Numero recomendado. | Columna requerida. |
| `P3` Ancho de área disponible | Área disponible / pasillos | Text input numerico | Método = `Diseño` | `Ancho disponible` | `colCAN_Draft` | Numero recomendado. | Label UI puede ser `Ancho disponible`. |
| `P4` Largo disponible | Área disponible / pasillos | Text input numerico | Método = `Diseño` | `Largo disponible` | `colCAN_Draft` | Numero recomendado. | Columna requerida. |
| `N` Sección: Criterios para configuración de niveles | Criterios para configuración de niveles | Grupo de toggles | Método = `Diseño` | `PayloadSistemaJson` y columnas requeridas | `colCAN_Draft` | Decisiones como toggles. | **Determinan los niveles de brazos** (layout, definicion del cliente, altura de montacargas…). |
| `N1` ¿Considerar altura máxima de montacargas? | Criterios para configuración de niveles | Toggle | Método = `Diseño` | `PayloadSistemaJson.ConsiderarAlturaMaxMonta` | `colCAN_Draft` | Si Sí, capturar altura. | Decision, no text input. |
| `N1A` Altura máxima de montacargas | Criterios para configuración de niveles | Text input numerico | `N1` = Sí | `Altura crítica de montacargas` | `colCAN_Draft` | Requerido si toggle Sí. | Columna requerida. |
| `N2` ¿Considerar altura de nave? | Criterios para configuración de niveles | Toggle | Método = `Diseño` | `PayloadSistemaJson.ConsiderarAlturaNave` | `colCAN_Draft` | Si Sí, capturar max/min. | Decision, no text input. |
| `N2A` Altura máxima de nave | Criterios para configuración de niveles | Text input numerico | `N2` = Sí | `Altura crítica de niveles`; payload max | `colCAN_Draft` | Requerido si toggle Sí. | Resumen a columna. |
| `N2B` Altura mínima de nave | Criterios para configuración de niveles | Text input numerico | `N2` = Sí | `Altura crítica de niveles`; payload min | `colCAN_Draft` | Requerido si toggle Sí. | Resumen a columna. |
| `N3` ¿Adjuntar Imagen/Layout? | Criterios para configuración de niveles | Toggle | Método = `Diseño` | Adjuntos de cotizacion; payload indicador | `colCAN_Draft` | Si Sí, usar adjuntos. | No crea columna nueva. |
| `N3B` Adjuntar archivos | Criterios para configuración de niveles | Adjuntos existentes | `N3` = Sí | Adjuntos de `Cotizaciones 2026` | N/A | Archivo recomendado si toggle Sí. | Se apoya en adjuntos del formulario principal. |
| `N4` ¿Existe definición por parte del cliente? | Criterios para configuración de niveles | Toggle | Método = `Diseño` | `PayloadSistemaJson.ExisteDefCliente` | `colCAN_Draft` | Si Sí, capturar comentarios. | Decision, no text input. |
| `N4A` Comentarios de configuración del cliente | Criterios para configuración de niveles | Text input | `N4` = Sí | `Definido por el cliente` | `colCAN_Draft` | Requerido si toggle Sí. | Columna requerida. |
| `SEG` Sección: Elementos de seguridad | Elementos de seguridad | Grupo condicional | Método = `Diseño` | `Elementos de seguridad`; payload detalle | `colElementoSeguridad` | Visible solo en diseno. | Tabla compartida filtrada por `SistemaId`. |
| `SEG1` ¿Considerar elementos de seguridad? | Elementos de seguridad | Toggle | Método = `Diseño` | `PayloadSistemaJson.ElementosSeguridad` | `colCAN_Draft` | Si Sí, mostrar tabla. | Decision, no text input. |
| `SEG2` Tabla: Listado de piezas de seguridad | Elementos de seguridad | Tabla editable | `SEG1` = Sí | `Elementos de seguridad`; payload detalle | `colElementoSeguridad` | Requiere pieza por renglon. | Resumen a columna requerida. |
| `PE` Sección: Piezas especiales | Piezas especiales | Grupo condicional | Método = `Diseño` | `PayloadSistemaJson.PiezasEspeciales` | `colPiezasEspeciales` | Visible solo en diseno. | Sin columna directa requerida. |
| `PE1` ¿Considerar piezas especiales? | Piezas especiales | Toggle | Método = `Diseño` | `PayloadSistemaJson.TienePiezasEspeciales` | `colCAN_Draft` | Si Sí, mostrar tabla. | Decision, no text input. |
| `PE2` Tabla: Piezas especiales | Piezas especiales | Tabla editable | `PE1` = Sí | `PayloadSistemaJson.PiezasEspeciales` | `colPiezasEspeciales` | Requiere pieza por renglon. | Sin columna directa. |
| `LP` Tabla: Listado de piezas | Listado de piezas | Tabla editable | Método = `Listado de piezas` | `Piezas de usuario`; `PayloadSistemaJson.Piezas` | `colListadoPiezas` | Requiere pieza por renglon. | Resumen a columna requerida. |
| `CLI` Adjuntar planos/diseño de cliente | Planos/diseño de cliente | Adjuntos existentes | Método = `Planos/diseño de cliente` | Adjuntos de `Cotizaciones 2026`; payload indicador | N/A | Archivo recomendado. | El cliente provee sus planos; aun así se captura/verifica la Carga (sección `CAR`) para corroborar que los perfiles fabricados cumplen. Se apoya en adjuntos del formulario principal. |
| `FOL1` Folio de cotización anterior | Referencia anterior | Text input | Método = `Cotización o pedido anterior` | `Número de pedido o cotización`; payload detalle | `colCAN_Draft` | Opcional si pedido existe. | No excluye pedido. |
| `FOL2` Folio de pedido anterior | Referencia anterior | Text input | Método = `Cotización o pedido anterior` | `Número de pedido o cotización`; payload detalle | `colCAN_Draft` | Opcional si cotizacion existe. | No excluye cotizacion. |
| `FOL3` Comentarios / alcance de la referencia | Referencia anterior | Text input | Método = `Cotización o pedido anterior` | `PayloadSistemaJson.ComentariosReferencia` | `colCAN_Draft` | Texto recomendado. | Sin columna directa. |
| `D` Acabado | Datos comunes del sistema | Dropdown | Siempre en Cantiléver | `Galvanizado`; `Tipo de galvanizado`; payload acabado | `colCAN_Draft` | Debe elegir una opcion. | Reutiliza patron comun. |
| `D1` Pintado | Acabado | Opcion de dropdown | Acabado seleccionado | `PayloadSistemaJson.Acabado`; `Galvanizado = false` | `colCAN_Draft` | Opcion valida. | No muestra precio por kg. |
| `D2` Galvanizado en frío | Acabado | Opcion de dropdown | Acabado seleccionado | `Galvanizado`; `Tipo de galvanizado`; `Precio por kilogramo galvanizado` | `colCAN_Draft` | Opcion valida. | Muestra precio por kg. |
| `D3` Galvanizado en caliente | Acabado | Opcion de dropdown | Acabado seleccionado | `Galvanizado`; `Tipo de galvanizado`; `Precio por kilogramo galvanizado` | `colCAN_Draft` | Opcion valida. | Muestra precio por kg. |
| `D4` Pregalvanizado | Acabado | Opcion de dropdown | Acabado seleccionado | `Galvanizado`; `Tipo de galvanizado`; payload acabado | `colCAN_Draft` | Opcion valida. | No muestra precio por kg. |
| `P` Precio por kilogramo | Acabado | Text input numerico | Acabado = galvanizado frio/caliente | `Precio por kilogramo galvanizado` | `colCAN_Draft` | Requerido para frio/caliente. | Columna requerida. |
| `E` Tabla: Colores por pieza | Colores por pieza | Tabla editable + combo | Siempre en Cantiléver | `PayloadSistemaJson.Colores` | `colListadoColores` | Requiere pieza/color por renglon. | Sin columna directa. |
| `F` ¿Requiere instalación? | Instalación | Toggle | Siempre en Cantiléver | `Instalación`; payload detalle | `colCAN_Draft` | Si Sí, capturar costo/comentarios. | Decision, no text input. |
| `F1` Costo de instalación | Instalación | Text input numerico | `F` = Sí | `PayloadSistemaJson.CostoInstalacion` | `colCAN_Draft` | Requerido si toggle Sí. | Sin columna directa. |
| `F2` Comentarios de instalación | Instalación | Text input | `F` = Sí | `PayloadSistemaJson.ComentariosInstalacion` | `colCAN_Draft` | Texto recomendado. | Sin columna directa. |
| `G` ¿Requiere memoria de cálculo? | Memoria de cálculo | Toggle | Siempre en Cantiléver | `Memoria de cálculo`; payload detalle | `colCAN_Draft` | Si Sí, capturar costo. | Decision, no text input. |
| `G1` Costo de memoria de cálculo | Memoria de cálculo | Text input numerico | `G` = Sí | `PayloadSistemaJson.CostoMemCalculo` | `colCAN_Draft` | Requerido si toggle Sí. | Sin columna directa. |
| `U` ¿Unirse a estructura del cliente? | Estructura del cliente | Toggle | Siempre en Cantiléver | `Unirse a estructura de otro proveedor`; payload detalle | `colCAN_Draft` | Si Sí, capturar requisitos. | Decision, no text input. |
| `U1` Comentarios / requisitos | Estructura del cliente | Text input | `U` = Sí | `PayloadSistemaJson.ComentariosEstructura` | `colCAN_Draft` | Requerido si toggle Sí. | Sin columna directa. |
| `H` ¿Se consideran proveedores externos? | Proveedores externos | Toggle | Siempre en Cantiléver | `Proveedores externos`; payload detalle | `colCAN_Draft` | Si Sí, mostrar tabla. | Decision, no text input. |
| `H1` Tabla: Proveedores externos | Proveedores externos | Tabla editable | `H` = Sí | `PayloadSistemaJson.ProveedoresExternos` | `colProveedoresExternos` | Requiere proveedor por renglon. | Sin columna directa. |
| `I` Comentarios generales del sistema | Comentarios generales | Text input | Siempre en Cantiléver | `Consideraciones especiales`; payload detalle | `colCAN_Draft` | Texto recomendado. | Columna requerida. |
