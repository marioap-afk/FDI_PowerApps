# FDI Carton Flow Process Map

Fuente funcional: [docs/diagrams/diseno-sistema-carton-flow.mmd](../diagrams/diseno-sistema-carton-flow.mmd).

Este documento es la referencia tecnica externa para la captura de Sistema
Carton Flow en `scrFDI`. No debe renderizarse como tabla informativa dentro de la
canvas app.

> **Nota:** carton flow es como el **dinámico** pero para **pickeo manual, sin
> montacargas**. Reusa el marco comun (metodo de captura, referencia anterior,
> datos comunes) y difiere asi:
> - "Tarima" → **"Producto" (tabla, un renglon por producto)**: tipo abierto,
>   largo/ancho/alto, peso por pieza, cantidad por nivel (igual que mezzanine).
> - "Configuracion del rack" conserva frentes/fondos/niveles buscados y entrecentros,
>   pero el **rodamiento tiene 3 tipos**: **Rodillo de 3/4**, **Rodajas** y **Por diseño**
>   (este último depende de la medida/peso de la caja y la operación).
>   **Sin "rodamiento de alto impacto"** (es de carga pesada; carton flow es ligero).
> - **Sin montacargas**: area/pasillos usa **ancho de pasillo de pickeo**; los criterios
>   de niveles quitan "¿altura maxima de montacargas?" (limita la **altura de nave**).
>
> Es una **propuesta**: nombres de colecciones, claves del payload, `TipoKey` y
> columnas SharePoint los **confirma Codex** al implementar. Cualquier columna/lista
> nueva en SharePoint requiere **visto bueno previo** (regla del proyecto).

## Estado SharePoint

La app y la auditoria local no incluyen una fuente/lista SharePoint llamada
`Sistema Carton Flow`. Igual que en los demas sistemas, la implementacion deberia
dejar el sistema disponible en el catalogo, capturar datos en colecciones locales y
crear el registro puente en `Sistemas por cotización`, sin intentar
`Patch('Sistema Carton Flow', ...)` sobre una lista inexistente. El detalle propio
(productos, configuracion del rack) viaja en `PayloadSistemaJson` hasta que exista la lista.

Columnas requeridas para activar persistencia de detalle (comunes con los demas):

| Columna requerida | Tipo esperado | Uso |
| --- | --- | --- |
| `CotizaciónID` | Lookup a `Cotizaciones 2026` | Relacionar el sistema con la cotizacion. |
| `SistemasID` | Lookup a `Sistemas por cotización` | Relacionar el detalle con el registro puente. |
| `Folio` | Texto | Trazabilidad de cotizacion. |
| `Title` | Texto | Nombre del sistema en la tab. |
| `PayloadSistemaJson` | Texto multilinea | Payload completo de Carton Flow (productos, rack). |
| `Tipo de diseño` | Opcion o texto | Metodo de captura normalizado. |
| `Piezas de usuario` | Texto multilinea | Resumen de listado de piezas si aplica. |
| `Elementos de seguridad` | Texto multilinea | Resumen de piezas de seguridad si aplica. |
| `Número de pedido o cotización` | Texto | Referencia anterior resumida. |
| `Proveedores externos` | Booleano | Indicador comun. |
| `Ancho disponible` | Texto/numero | Area disponible. |
| `Largo disponible` | Texto/numero | Area disponible. |
| `Altura crítica de niveles` | Texto | Altura de nave (limitante de niveles). |
| `Definido por el cliente` | Texto multilinea | Comentarios de configuracion del cliente. |
| `Galvanizado` | Booleano | Derivado de acabado. |
| `Tipo de galvanizado` | Opcion o texto | Derivado de acabado. |
| `Precio por kilogramo galvanizado` | Texto/numero | Solo frio/caliente. |
| `Instalación` | Booleano | Indicador comun. |
| `Memoria de cálculo` | Booleano | Indicador comun. |
| `Unirse a estructura de otro proveedor` | Booleano | Indicador comun. |
| `Consideraciones especiales` | Texto multilinea | Comentarios generales. |

> Datos de **Producto** (tabla) y **Configuracion del rack** (frentes/fondos/niveles
> buscados, rodamiento, entrecentros) van en `PayloadSistemaJson` (`.Productos`,
> `.ConfiguracionRack`). El **ancho de pasillo de pickeo** tambien al payload salvo que
> se defina columna. Columnas propias → con Codex (requiere visto bueno de schema).

## Mapa de procesos

| Nodo del diagrama | Sección UI | Tipo de control esperado | Visible cuando | Campo/columna SharePoint | Colección local si aplica | Validación | Observaciones |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `A` Sistema carton flow | Sistema Carton Flow | Contenedor de captura | Tab activo `TipoKey = "CFL"` | Lista requerida `Sistema Carton Flow`; registro puente en `Sistemas por cotización` | `colCFL_Draft` | Debe existir tab Carton Flow en catalogo. | Nodo raiz del flujo. |
| `B` Método de captura | Método de captura | Dropdown | Siempre en Carton Flow | Requerida `Tipo de diseño`; `PayloadSistemaJson.MetodoCaptura` | `colCFL_Draft` | Opciones: `Diseño`, `Listado de piezas`, `Planos/diseño de cliente`, `Cotización o pedido anterior`. | Controla secciones visibles. |
| `subGraph0` Captura por diseño | Captura por diseño | Contenedor condicional | Método = `Diseño` | `PayloadSistemaJson` | `colCFL_Draft` | Solo visible para captura por diseno. | Agrupa producto, configuracion del rack, area, niveles, seguridad y piezas especiales. |
| `subGraph1` Referencia anterior | Referencia anterior | Grupo de campos | Método = `Cotización o pedido anterior` | `Número de pedido o cotización`; `PayloadSistemaJson` | `colCFL_Draft` | Cotizacion y pedido pueden coexistir. | No es decision excluyente. |
| `subGraph2` Datos comunes del sistema | Datos comunes del sistema | Grupo de campos | Siempre en Carton Flow | Columnas comunes requeridas; `PayloadSistemaJson` | `colCFL_Draft` | Siempre capturable. | Se reutiliza patron comun. |
| `CAR` Sección: Producto | Producto | Contenedor de tabla | Método = `Diseño` o `Planos/diseño de cliente` | `PayloadSistemaJson.Productos` | `colCFL_Productos` | Reemplaza la Tarima. Con planos del cliente se usa para verificar perfiles. | Pickeo manual; el producto puede variar mucho. |
| `CARTBL` Tabla: Productos | Producto | Tabla editable | Método = `Diseño` o `Planos/diseño de cliente` | `PayloadSistemaJson.Productos` | `colCFL_Productos` | Un renglon por producto distinto. | No se conoce de antemano cuantos productos hay. |
| `CAR1` Tipo de producto (texto abierto) | Producto | Text input (columna) | En tabla de productos | `PayloadSistemaJson.Productos[].Tipo` | `colCFL_Productos` | Texto libre (no dropdown). | Columna de la tabla. |
| `CAR2` Largo del producto | Producto | Text input numerico (columna) | En tabla de productos | `PayloadSistemaJson.Productos[].Largo` | `colCFL_Productos` | Numero recomendado. | Columna de la tabla. |
| `CAR3` Ancho del producto | Producto | Text input numerico (columna) | En tabla de productos | `PayloadSistemaJson.Productos[].Ancho` | `colCFL_Productos` | Numero recomendado. | Columna de la tabla. |
| `CAR4` Alto del producto | Producto | Text input numerico (columna) | En tabla de productos | `PayloadSistemaJson.Productos[].Alto` | `colCFL_Productos` | Numero recomendado. | Columna de la tabla. |
| `CAR5` Peso por pieza | Producto | Text input numerico (columna) | En tabla de productos | `PayloadSistemaJson.Productos[].Peso` | `colCFL_Productos` | Numero recomendado. | Columna de la tabla. |
| `CAR6` Cantidad por nivel | Producto | Text input numerico (columna) | En tabla de productos | `PayloadSistemaJson.Productos[].CantidadPorNivel` | `colCFL_Productos` | Numero recomendado. | Columna de la tabla. |
| `CONF` Sección: Configuración del rack (carton flow) | Configuración del rack | Grupo de campos | Método = `Diseño` | `PayloadSistemaJson.ConfiguracionRack` | `colCFL_Draft` | Visible solo en diseno. | Frentes/fondos/niveles + rodamiento (3 tipos) + entrecentros. |
| `CONF1` Frentes buscados | Configuración del rack | Text input numerico | Método = `Diseño` | `PayloadSistemaJson.FrentesBuscados` | `colCFL_Draft` | Numero recomendado. | Sin columna directa. |
| `CONF2` Fondos buscados | Configuración del rack | Text input numerico | Método = `Diseño` | `PayloadSistemaJson.FondosBuscados` | `colCFL_Draft` | Numero recomendado. | Sin columna directa. |
| `CONF3` Niveles buscados | Configuración del rack | Text input numerico | Método = `Diseño` | `PayloadSistemaJson.NivelesBuscados` | `colCFL_Draft` | Numero recomendado. | Sin columna directa. |
| `CONF4` ¿Qué tipo de rodamiento usar? | Configuración del rack | Dropdown | Método = `Diseño` | `PayloadSistemaJson.TipoRodamiento` | `colCFL_Draft` | Debe elegir una opcion. | 3 opciones (no alto impacto). |
| `CONF4A` Rodillo de 3/4 | Configuración del rack | Opcion de dropdown | Selector de rodamiento | `PayloadSistemaJson.TipoRodamiento` | `colCFL_Draft` | Opcion valida. | Opcion fija. |
| `CONF4B` Rodajas | Configuración del rack | Opcion de dropdown | Selector de rodamiento | `PayloadSistemaJson.TipoRodamiento` | `colCFL_Draft` | Opcion valida. | Opcion fija. |
| `CONF4C` Por diseño | Configuración del rack | Opcion de dropdown | Selector de rodamiento | `PayloadSistemaJson.TipoRodamiento` | `colCFL_Draft` | Opcion valida. | Lo determina la medida/peso de la caja y la operación. |
| `CONF5` Método de cálculo de entrecentros | Configuración del rack | Dropdown | Método = `Diseño` | `PayloadSistemaJson.MetodoCalculoEntrecentros` | `colCFL_Draft` | Opciones `Manual` y `Por cálculo`. | Decision como selector. |
| `CONF5A` Insertar número | Configuración del rack | Text input numerico | `CONF5` = `Manual` | `PayloadSistemaJson.EntrecentrosManual` | `colCFL_Draft` | Requerido si manual. | Sin columna directa. |
| `CONF5B` Por cálculo (entrecentros) | Configuración del rack | Opcion de dropdown | `CONF5` = `Por cálculo` | `PayloadSistemaJson.MetodoCalculoEntrecentros` | `colCFL_Draft` | Opcion valida. | Sin campo adicional. |
| `AREA` Sección: Área disponible / pasillos | Área disponible / pasillos | Grupo de text inputs | Método = `Diseño` | Columnas area requeridas | `colCFL_Draft` | Visible solo en diseno. | Sin montacargas. |
| `P1` Ancho de área disponible | Área disponible / pasillos | Text input numerico | Método = `Diseño` | `Ancho disponible` | `colCFL_Draft` | Numero recomendado. | Columna requerida. |
| `P2` Largo disponible | Área disponible / pasillos | Text input numerico | Método = `Diseño` | `Largo disponible` | `colCFL_Draft` | Numero recomendado. | Columna requerida. |
| `P3` Ancho de pasillo de pickeo | Área disponible / pasillos | Text input numerico | Método = `Diseño` | `PayloadSistemaJson.AnchoPasilloPickeo` | `colCFL_Draft` | Numero recomendado. | Reemplaza el pasillo de montacargas. |
| `N` Sección: Criterios para configuración de niveles | Criterios para configuración de niveles | Grupo de toggles | Método = `Diseño` | `PayloadSistemaJson` y columnas requeridas | `colCFL_Draft` | Decisiones como toggles. | Limitante = altura de nave + producto (no montacargas). |
| `N2` ¿Considerar altura de nave? | Criterios para configuración de niveles | Toggle | Método = `Diseño` | `PayloadSistemaJson.ConsiderarAlturaNave` | `colCFL_Draft` | Si Sí, capturar max/min. | Limitante principal de niveles. |
| `N2A` Altura máxima de nave | Criterios para configuración de niveles | Text input numerico | `N2` = Sí | `Altura crítica de niveles`; payload max | `colCFL_Draft` | Requerido si toggle Sí. | Resumen a columna. |
| `N2B` Altura mínima de nave | Criterios para configuración de niveles | Text input numerico | `N2` = Sí | `Altura crítica de niveles`; payload min | `colCFL_Draft` | Requerido si toggle Sí. | Resumen a columna. |
| `N3` ¿Adjuntar Imagen/Layout? | Criterios para configuración de niveles | Toggle | Método = `Diseño` | Adjuntos de cotizacion; payload indicador | `colCFL_Draft` | Si Sí, usar adjuntos. | No crea columna nueva. |
| `N3B` Adjuntar archivos | Criterios para configuración de niveles | Adjuntos existentes | `N3` = Sí | Adjuntos de `Cotizaciones 2026` | N/A | Archivo recomendado si toggle Sí. | Se apoya en adjuntos del formulario principal. |
| `N4` ¿Existe definición por parte del cliente? | Criterios para configuración de niveles | Toggle | Método = `Diseño` | `PayloadSistemaJson.ExisteDefCliente` | `colCFL_Draft` | Si Sí, capturar comentarios. | Decision, no text input. |
| `N4A` Comentarios de configuración del cliente | Criterios para configuración de niveles | Text input | `N4` = Sí | `Definido por el cliente` | `colCFL_Draft` | Requerido si toggle Sí. | Columna requerida. |
| `SEG` Sección: Elementos de seguridad | Elementos de seguridad | Grupo condicional | Método = `Diseño` | `Elementos de seguridad`; payload detalle | `colElementoSeguridad` | Visible solo en diseno. | Tabla compartida filtrada por `SistemaId`. |
| `SEG1` ¿Considerar elementos de seguridad? | Elementos de seguridad | Toggle | Método = `Diseño` | `PayloadSistemaJson.ElementosSeguridad` | `colCFL_Draft` | Si Sí, mostrar tabla. | Decision, no text input. |
| `SEG2` Tabla: Listado de piezas de seguridad | Elementos de seguridad | Tabla editable | `SEG1` = Sí | `Elementos de seguridad`; payload detalle | `colElementoSeguridad` | Requiere pieza por renglon. | Resumen a columna requerida. |
| `PE` Sección: Piezas especiales | Piezas especiales | Grupo condicional | Método = `Diseño` | `PayloadSistemaJson.PiezasEspeciales` | `colPiezasEspeciales` | Visible solo en diseno. | Sin columna directa requerida. |
| `PE1` ¿Considerar piezas especiales? | Piezas especiales | Toggle | Método = `Diseño` | `PayloadSistemaJson.TienePiezasEspeciales` | `colCFL_Draft` | Si Sí, mostrar tabla. | Decision, no text input. |
| `PE2` Tabla: Piezas especiales | Piezas especiales | Tabla editable | `PE1` = Sí | `PayloadSistemaJson.PiezasEspeciales` | `colPiezasEspeciales` | Requiere pieza por renglon. | Sin columna directa. |
| `LP` Tabla: Listado de piezas | Listado de piezas | Tabla editable | Método = `Listado de piezas` | `Piezas de usuario`; `PayloadSistemaJson.Piezas` | `colListadoPiezas` | Requiere pieza por renglon. | Resumen a columna requerida. |
| `CLI` Adjuntar planos/diseño de cliente | Planos/diseño de cliente | Adjuntos existentes | Método = `Planos/diseño de cliente` | Adjuntos de `Cotizaciones 2026`; payload indicador | N/A | Archivo recomendado. | El cliente provee sus planos; aun así se captura/verifica el Producto (sección `CAR`) para corroborar que los perfiles fabricados cumplen. Se apoya en adjuntos del formulario principal. |
| `FOL1` Folio de cotización anterior | Referencia anterior | Text input | Método = `Cotización o pedido anterior` | `Número de pedido o cotización`; payload detalle | `colCFL_Draft` | Opcional si pedido existe. | No excluye pedido. |
| `FOL2` Folio de pedido anterior | Referencia anterior | Text input | Método = `Cotización o pedido anterior` | `Número de pedido o cotización`; payload detalle | `colCFL_Draft` | Opcional si cotizacion existe. | No excluye cotizacion. |
| `FOL3` Comentarios / alcance de la referencia | Referencia anterior | Text input | Método = `Cotización o pedido anterior` | `PayloadSistemaJson.ComentariosReferencia` | `colCFL_Draft` | Texto recomendado. | Sin columna directa. |
| `D` Acabado | Datos comunes del sistema | Dropdown | Siempre en Carton Flow | `Galvanizado`; `Tipo de galvanizado`; payload acabado | `colCFL_Draft` | Debe elegir una opcion. | Reutiliza patron comun. |
| `D1` Pintado | Acabado | Opcion de dropdown | Acabado seleccionado | `PayloadSistemaJson.Acabado`; `Galvanizado = false` | `colCFL_Draft` | Opcion valida. | No muestra precio por kg. |
| `D2` Galvanizado en frío | Acabado | Opcion de dropdown | Acabado seleccionado | `Galvanizado`; `Tipo de galvanizado`; `Precio por kilogramo galvanizado` | `colCFL_Draft` | Opcion valida. | Muestra precio por kg. |
| `D3` Galvanizado en caliente | Acabado | Opcion de dropdown | Acabado seleccionado | `Galvanizado`; `Tipo de galvanizado`; `Precio por kilogramo galvanizado` | `colCFL_Draft` | Opcion valida. | Muestra precio por kg. |
| `D4` Pregalvanizado | Acabado | Opcion de dropdown | Acabado seleccionado | `Galvanizado`; `Tipo de galvanizado`; payload acabado | `colCFL_Draft` | Opcion valida. | No muestra precio por kg. |
| `P` Precio por kilogramo | Acabado | Text input numerico | Acabado = galvanizado frio/caliente | `Precio por kilogramo galvanizado` | `colCFL_Draft` | Requerido para frio/caliente. | Columna requerida. |
| `E` Tabla: Colores por pieza | Colores por pieza | Tabla editable + combo | Siempre en Carton Flow | `PayloadSistemaJson.Colores` | `colListadoColores` | Requiere pieza/color por renglon. | Sin columna directa. |
| `F` ¿Requiere instalación? | Instalación | Toggle | Siempre en Carton Flow | `Instalación`; payload detalle | `colCFL_Draft` | Si Sí, capturar costo/comentarios. | Decision, no text input. |
| `F1` Costo de instalación | Instalación | Text input numerico | `F` = Sí | `PayloadSistemaJson.CostoInstalacion` | `colCFL_Draft` | Requerido si toggle Sí. | Sin columna directa. |
| `F2` Comentarios de instalación | Instalación | Text input | `F` = Sí | `PayloadSistemaJson.ComentariosInstalacion` | `colCFL_Draft` | Texto recomendado. | Sin columna directa. |
| `G` ¿Requiere memoria de cálculo? | Memoria de cálculo | Toggle | Siempre en Carton Flow | `Memoria de cálculo`; payload detalle | `colCFL_Draft` | Si Sí, capturar costo. | Decision, no text input. |
| `G1` Costo de memoria de cálculo | Memoria de cálculo | Text input numerico | `G` = Sí | `PayloadSistemaJson.CostoMemCalculo` | `colCFL_Draft` | Requerido si toggle Sí. | Sin columna directa. |
| `U` ¿Unirse a estructura del cliente? | Estructura del cliente | Toggle | Siempre en Carton Flow | `Unirse a estructura de otro proveedor`; payload detalle | `colCFL_Draft` | Si Sí, capturar requisitos. | Decision, no text input. |
| `U1` Comentarios / requisitos | Estructura del cliente | Text input | `U` = Sí | `PayloadSistemaJson.ComentariosEstructura` | `colCFL_Draft` | Requerido si toggle Sí. | Sin columna directa. |
| `H` ¿Se consideran proveedores externos? | Proveedores externos | Toggle | Siempre en Carton Flow | `Proveedores externos`; payload detalle | `colCFL_Draft` | Si Sí, mostrar tabla. | Decision, no text input. |
| `H1` Tabla: Proveedores externos | Proveedores externos | Tabla editable | `H` = Sí | `PayloadSistemaJson.ProveedoresExternos` | `colProveedoresExternos` | Requiere proveedor por renglon. | Sin columna directa. |
| `I` Comentarios generales del sistema | Comentarios generales | Text input | Siempre en Carton Flow | `Consideraciones especiales`; payload detalle | `colCFL_Draft` | Texto recomendado. | Columna requerida. |
