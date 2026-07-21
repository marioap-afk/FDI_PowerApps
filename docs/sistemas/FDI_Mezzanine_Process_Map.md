# FDI Mezzanine Process Map

Fuente funcional: [docs/diagrams/diseno-sistema-mezzanine.mmd](../diagrams/diseno-sistema-mezzanine.mmd).

Este documento es la referencia tecnica externa para la captura de Sistema
Mezzanine (entrepiso fabricado con racks) en `scrFDI`. No debe renderizarse como
tabla informativa dentro de la canvas app.

> **Nota:** el mezzanine es un selectivo "habitable": **pickeo manual, sin
> montacargas**. Reusa el marco comun (metodo de captura, referencia anterior,
> datos comunes) y difiere asi:
> - "Tarima" → **"Producto" (tabla, un renglon por producto)**: tipo abierto,
>   largo/ancho/alto, peso por pieza, cantidad por nivel.
> - **Sin seccion "Montacargas".** La limitante de niveles es la **altura de nave**
>   y el **producto**, no el montacargas (se quita "¿altura maxima de montacargas?").
> - Area/pasillos sin montacargas: ancho/largo disponible + **ancho de pasillo de pickeo**.
> - 🆕 **"Configuracion del entrepiso"**: altura recomendada (def. 2.4 m), cantidad
>   de entrepisos, ¿elevador? (→ capacidad/especificacion), tipo de piso (Rejilla
>   Irving / MDF), ¿carrito de pickeo? (→ medidas, numero de ruedas, tipo y medida de
>   rueda, peso), ¿requiere escaleras? (toggle).
>
> Es una **propuesta**: nombres de colecciones, claves del payload, `TipoKey` y
> columnas SharePoint los **confirma Codex** al implementar. Cualquier columna/lista
> nueva en SharePoint requiere **visto bueno previo** (regla del proyecto).

## Estado SharePoint

La app y la auditoria local no incluyen una fuente/lista SharePoint llamada
`Sistema Mezzanine`. Igual que en los demas sistemas, la implementacion deberia dejar
el sistema disponible en el catalogo, capturar datos en colecciones locales y crear el
registro puente en `Sistemas por cotización`, sin intentar
`Patch('Sistema Mezzanine', ...)` sobre una lista inexistente. El detalle propio
(productos, entrepiso) viaja en `PayloadSistemaJson` hasta que exista la lista.

Columnas requeridas para activar persistencia de detalle (comunes con los demas):

| Columna requerida | Tipo esperado | Uso |
| --- | --- | --- |
| `CotizaciónID` | Lookup a `Cotizaciones` | Relacionar el sistema con la cotizacion. |
| `SistemasID` | Lookup a `Sistemas por cotización` | Relacionar el detalle con el registro puente. |
| `Folio` | Texto | Trazabilidad de cotizacion. |
| `Title` | Texto | Nombre del sistema en la tab. |
| `PayloadSistemaJson` | Texto multilinea | Payload completo de Mezzanine (productos, entrepiso, carrito). |
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

> Datos de **Producto** (tabla), **Configuracion del entrepiso** y **carrito** van en
> `PayloadSistemaJson` (`.Productos`, `.Entrepiso`, `.Carrito`). El **ancho de pasillo
> de pickeo** tambien al payload salvo que se defina columna. Columnas propias →
> con Codex (requiere visto bueno de schema).

## Mapa de procesos

| Nodo del diagrama | Sección UI | Tipo de control esperado | Visible cuando | Campo/columna SharePoint | Colección local si aplica | Validación | Observaciones |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `A` Sistema mezzanine | Sistema Mezzanine | Contenedor de captura | Tab activo `TipoKey = "MEZ"` | Lista requerida `Sistema Mezzanine`; registro puente en `Sistemas por cotización` | `colMEZ_Draft` | Debe existir tab Mezzanine en catalogo. | Nodo raiz del flujo. |
| `B` Método de captura | Método de captura | Dropdown | Siempre en Mezzanine | Requerida `Tipo de diseño`; `PayloadSistemaJson.MetodoCaptura` | `colMEZ_Draft` | Opciones: `Diseño`, `Listado de piezas`, `Planos/diseño de cliente`, `Cotización o pedido anterior`. | Controla secciones visibles. |
| `subGraph0` Captura por diseño | Captura por diseño | Contenedor condicional | Método = `Diseño` | `PayloadSistemaJson` | `colMEZ_Draft` | Solo visible para captura por diseno. | Agrupa producto, entrepiso, area, niveles, seguridad y piezas especiales. |
| `subGraph1` Referencia anterior | Referencia anterior | Grupo de campos | Método = `Cotización o pedido anterior` | `Número de pedido o cotización`; `PayloadSistemaJson` | `colMEZ_Draft` | Cotizacion y pedido pueden coexistir. | No es decision excluyente. |
| `subGraph2` Datos comunes del sistema | Datos comunes del sistema | Grupo de campos | Siempre en Mezzanine | Columnas comunes requeridas; `PayloadSistemaJson` | `colMEZ_Draft` | Siempre capturable. | Se reutiliza patron comun. |
| `CAR` Sección: Producto | Producto | Contenedor de tabla | Método = `Diseño` o `Planos/diseño de cliente` | `PayloadSistemaJson.Productos` | `colMEZ_Productos` | Reemplaza la Tarima. Con planos del cliente se usa para verificar perfiles. | Pickeo manual; el producto puede variar mucho. |
| `CARTBL` Tabla: Productos | Producto | Tabla editable | Método = `Diseño` o `Planos/diseño de cliente` | `PayloadSistemaJson.Productos` | `colMEZ_Productos` | Un renglon por producto distinto. | No se conoce de antemano cuantos productos hay. |
| `CAR1` Tipo de producto (texto abierto) | Producto | Text input (columna) | En tabla de productos | `PayloadSistemaJson.Productos[].Tipo` | `colMEZ_Productos` | Texto libre (no dropdown). | Columna de la tabla. |
| `CAR2` Largo del producto | Producto | Text input numerico (columna) | En tabla de productos | `PayloadSistemaJson.Productos[].Largo` | `colMEZ_Productos` | Numero recomendado. | Columna de la tabla. |
| `CAR3` Ancho del producto | Producto | Text input numerico (columna) | En tabla de productos | `PayloadSistemaJson.Productos[].Ancho` | `colMEZ_Productos` | Numero recomendado. | Columna de la tabla. |
| `CAR4` Alto del producto | Producto | Text input numerico (columna) | En tabla de productos | `PayloadSistemaJson.Productos[].Alto` | `colMEZ_Productos` | Numero recomendado. | Columna de la tabla. |
| `CAR5` Peso por pieza | Producto | Text input numerico (columna) | En tabla de productos | `PayloadSistemaJson.Productos[].Peso` | `colMEZ_Productos` | Numero recomendado. | Columna de la tabla. |
| `CAR6` Cantidad por nivel | Producto | Text input numerico (columna) | En tabla de productos | `PayloadSistemaJson.Productos[].CantidadPorNivel` | `colMEZ_Productos` | Numero recomendado. | Columna de la tabla. |
| `ENT` Sección: Configuración del entrepiso | Configuración del entrepiso | Grupo de campos | Método = `Diseño` | `PayloadSistemaJson.Entrepiso` | `colMEZ_Draft` | Visible solo en diseno. | Exclusiva de mezzanine. |
| `ENT1` Altura recomendada del entrepiso | Configuración del entrepiso | Text input numerico | Método = `Diseño` | `PayloadSistemaJson.Entrepiso.AlturaRecomendada` | `colMEZ_Draft` | Default sugerido 2.4 m. | Editable; 2.4 m como recomendacion. |
| `ENT2` Cantidad de entrepisos | Configuración del entrepiso | Text input numerico | Método = `Diseño` | `PayloadSistemaJson.Entrepiso.CantidadEntrepisos` | `colMEZ_Draft` | Entero recomendado. | Numero de pisos. |
| `ENT3` ¿Requiere elevador? | Configuración del entrepiso | Toggle | Método = `Diseño` | `PayloadSistemaJson.Entrepiso.RequiereElevador` | `colMEZ_Draft` | Si Sí, capturar capacidad/especificacion. | Decision, no text input. |
| `ENT3A` Capacidad / especificación del elevador | Configuración del entrepiso | Text input | `ENT3` = Sí | `PayloadSistemaJson.Entrepiso.ElevadorSpec` | `colMEZ_Draft` | Requerido si toggle Sí. | Sin columna directa. |
| `ENT4` Tipo de piso | Configuración del entrepiso | Dropdown | Método = `Diseño` | `PayloadSistemaJson.Entrepiso.TipoPiso` | `colMEZ_Draft` | Opciones `Rejilla Irving` / `MDF`. | Solo esas dos opciones actualmente. |
| `ENT4A` Rejilla Irving | Configuración del entrepiso | Opcion de dropdown | Selector de piso | `PayloadSistemaJson.Entrepiso.TipoPiso` | `colMEZ_Draft` | Opcion valida. | Opcion fija. |
| `ENT4B` MDF | Configuración del entrepiso | Opcion de dropdown | Selector de piso | `PayloadSistemaJson.Entrepiso.TipoPiso` | `colMEZ_Draft` | Opcion valida. | Opcion fija. |
| `ENT5` ¿Se usará carrito para pickear? | Configuración del entrepiso | Toggle | Método = `Diseño` | `PayloadSistemaJson.Entrepiso.UsaCarrito` | `colMEZ_Draft` | Si Sí, capturar datos del carrito. | Decision, no text input. |
| `ENT5A` Medidas del carrito | Configuración del entrepiso | Text input | `ENT5` = Sí | `PayloadSistemaJson.Carrito.Medidas` | `colMEZ_Draft` | Requerido si carrito Sí. | Relevante para el ancho de pasillo de pickeo. |
| `ENT5B` Número de ruedas | Configuración del entrepiso | Text input numerico | `ENT5` = Sí | `PayloadSistemaJson.Carrito.NumeroRuedas` | `colMEZ_Draft` | Entero recomendado. | Sin columna directa. |
| `ENT5C` Tipo de rueda | Configuración del entrepiso | Text input | `ENT5` = Sí | `PayloadSistemaJson.Carrito.TipoRueda` | `colMEZ_Draft` | Texto libre. | Sin columna directa. |
| `ENT5D` Medida de rueda | Configuración del entrepiso | Text input | `ENT5` = Sí | `PayloadSistemaJson.Carrito.MedidaRueda` | `colMEZ_Draft` | Texto/numero. | Sin columna directa. |
| `ENT5E` Peso del carrito | Configuración del entrepiso | Text input numerico | `ENT5` = Sí | `PayloadSistemaJson.Carrito.Peso` | `colMEZ_Draft` | Numero recomendado. | Carga viva adicional sobre el entrepiso. |
| `ENT6` ¿Requiere escaleras? | Configuración del entrepiso | Toggle | Método = `Diseño` | `PayloadSistemaJson.Entrepiso.RequiereEscaleras` | `colMEZ_Draft` | Sí/No. | Solo toggle (sin cantidad). |
| `AREA` Sección: Área disponible / pasillos | Área disponible / pasillos | Grupo de text inputs | Método = `Diseño` | Columnas area requeridas | `colMEZ_Draft` | Visible solo en diseno. | Sin montacargas. |
| `P1` Ancho de área disponible | Área disponible / pasillos | Text input numerico | Método = `Diseño` | `Ancho disponible` | `colMEZ_Draft` | Numero recomendado. | Columna requerida. |
| `P2` Largo disponible | Área disponible / pasillos | Text input numerico | Método = `Diseño` | `Largo disponible` | `colMEZ_Draft` | Numero recomendado. | Columna requerida. |
| `P3` Ancho de pasillo de pickeo | Área disponible / pasillos | Text input numerico | Método = `Diseño` | `PayloadSistemaJson.AnchoPasilloPickeo` | `colMEZ_Draft` | Numero recomendado. | Reemplaza el pasillo de montacargas; relacionado con el carrito. |
| `N` Sección: Criterios para configuración de niveles | Criterios para configuración de niveles | Grupo de toggles | Método = `Diseño` | `PayloadSistemaJson` y columnas requeridas | `colMEZ_Draft` | Decisiones como toggles. | Limitante = altura de nave + producto (no montacargas). |
| `N2` ¿Considerar altura de nave? | Criterios para configuración de niveles | Toggle | Método = `Diseño` | `PayloadSistemaJson.ConsiderarAlturaNave` | `colMEZ_Draft` | Si Sí, capturar max/min. | Limitante principal de niveles. |
| `N2A` Altura máxima de nave | Criterios para configuración de niveles | Text input numerico | `N2` = Sí | `Altura crítica de niveles`; payload max | `colMEZ_Draft` | Requerido si toggle Sí. | Resumen a columna. |
| `N2B` Altura mínima de nave | Criterios para configuración de niveles | Text input numerico | `N2` = Sí | `Altura crítica de niveles`; payload min | `colMEZ_Draft` | Requerido si toggle Sí. | Resumen a columna. |
| `N3` ¿Adjuntar Imagen/Layout? | Criterios para configuración de niveles | Toggle | Método = `Diseño` | Adjuntos de cotizacion; payload indicador | `colMEZ_Draft` | Si Sí, usar adjuntos. | No crea columna nueva. |
| `N3B` Adjuntar archivos | Criterios para configuración de niveles | Adjuntos existentes | `N3` = Sí | Adjuntos de `Cotizaciones` | N/A | Archivo recomendado si toggle Sí. | Se apoya en adjuntos del formulario principal. |
| `N4` ¿Existe definición por parte del cliente? | Criterios para configuración de niveles | Toggle | Método = `Diseño` | `PayloadSistemaJson.ExisteDefCliente` | `colMEZ_Draft` | Si Sí, capturar comentarios. | Decision, no text input. |
| `N4A` Comentarios de configuración del cliente | Criterios para configuración de niveles | Text input | `N4` = Sí | `Definido por el cliente` | `colMEZ_Draft` | Requerido si toggle Sí. | Columna requerida. |
| `SEG` Sección: Elementos de seguridad | Elementos de seguridad | Grupo condicional | Método = `Diseño` | `Elementos de seguridad`; payload detalle | `colElementoSeguridad` | Visible solo en diseno. | Tabla compartida filtrada por `SistemaId`. |
| `SEG1` ¿Considerar elementos de seguridad? | Elementos de seguridad | Toggle | Método = `Diseño` | `PayloadSistemaJson.ElementosSeguridad` | `colMEZ_Draft` | Si Sí, mostrar tabla. | En mezzanine: barandales, rodapie, etc. (tabla abierta). |
| `SEG2` Tabla: Listado de piezas de seguridad | Elementos de seguridad | Tabla editable | `SEG1` = Sí | `Elementos de seguridad`; payload detalle | `colElementoSeguridad` | Requiere pieza por renglon. | Resumen a columna requerida. |
| `PE` Sección: Piezas especiales | Piezas especiales | Grupo condicional | Método = `Diseño` | `PayloadSistemaJson.PiezasEspeciales` | `colPiezasEspeciales` | Visible solo en diseno. | Sin columna directa requerida. |
| `PE1` ¿Considerar piezas especiales? | Piezas especiales | Toggle | Método = `Diseño` | `PayloadSistemaJson.TienePiezasEspeciales` | `colMEZ_Draft` | Si Sí, mostrar tabla. | Decision, no text input. |
| `PE2` Tabla: Piezas especiales | Piezas especiales | Tabla editable | `PE1` = Sí | `PayloadSistemaJson.PiezasEspeciales` | `colPiezasEspeciales` | Requiere pieza por renglon. | Sin columna directa. |
| `LP` Tabla: Listado de piezas | Listado de piezas | Tabla editable | Método = `Listado de piezas` | `Piezas de usuario`; `PayloadSistemaJson.Piezas` | `colListadoPiezas` | Requiere pieza por renglon. | Resumen a columna requerida. |
| `CLI` Adjuntar planos/diseño de cliente | Planos/diseño de cliente | Adjuntos existentes | Método = `Planos/diseño de cliente` | Adjuntos de `Cotizaciones`; payload indicador | N/A | Archivo recomendado. | El cliente provee sus planos; aun así se captura/verifica el Producto (sección `CAR`) para corroborar que los perfiles fabricados cumplen. Se apoya en adjuntos del formulario principal. |
| `FOL1` Folio de cotización anterior | Referencia anterior | Text input | Método = `Cotización o pedido anterior` | `Número de pedido o cotización`; payload detalle | `colMEZ_Draft` | Opcional si pedido existe. | No excluye pedido. |
| `FOL2` Folio de pedido anterior | Referencia anterior | Text input | Método = `Cotización o pedido anterior` | `Número de pedido o cotización`; payload detalle | `colMEZ_Draft` | Opcional si cotizacion existe. | No excluye cotizacion. |
| `FOL3` Comentarios / alcance de la referencia | Referencia anterior | Text input | Método = `Cotización o pedido anterior` | `PayloadSistemaJson.ComentariosReferencia` | `colMEZ_Draft` | Texto recomendado. | Sin columna directa. |
| `D` Acabado | Datos comunes del sistema | Dropdown | Siempre en Mezzanine | `Galvanizado`; `Tipo de galvanizado`; payload acabado | `colMEZ_Draft` | Debe elegir una opcion. | Reutiliza patron comun. |
| `D1` Pintado | Acabado | Opcion de dropdown | Acabado seleccionado | `PayloadSistemaJson.Acabado`; `Galvanizado = false` | `colMEZ_Draft` | Opcion valida. | No muestra precio por kg. |
| `D2` Galvanizado en frío | Acabado | Opcion de dropdown | Acabado seleccionado | `Galvanizado`; `Tipo de galvanizado`; `Precio por kilogramo galvanizado` | `colMEZ_Draft` | Opcion valida. | Muestra precio por kg. |
| `D3` Galvanizado en caliente | Acabado | Opcion de dropdown | Acabado seleccionado | `Galvanizado`; `Tipo de galvanizado`; `Precio por kilogramo galvanizado` | `colMEZ_Draft` | Opcion valida. | Muestra precio por kg. |
| `D4` Pregalvanizado | Acabado | Opcion de dropdown | Acabado seleccionado | `Galvanizado`; `Tipo de galvanizado`; payload acabado | `colMEZ_Draft` | Opcion valida. | No muestra precio por kg. |
| `P` Precio por kilogramo | Acabado | Text input numerico | Acabado = galvanizado frio/caliente | `Precio por kilogramo galvanizado` | `colMEZ_Draft` | Requerido para frio/caliente. | Columna requerida. |
| `E` Tabla: Colores por pieza | Colores por pieza | Tabla editable + combo | Siempre en Mezzanine | `PayloadSistemaJson.Colores` | `colListadoColores` | Requiere pieza/color por renglon. | Sin columna directa. |
| `F` ¿Requiere instalación? | Instalación | Toggle | Siempre en Mezzanine | `Instalación`; payload detalle | `colMEZ_Draft` | Si Sí, capturar costo/comentarios. | Decision, no text input. |
| `F1` Costo de instalación | Instalación | Text input numerico | `F` = Sí | `PayloadSistemaJson.CostoInstalacion` | `colMEZ_Draft` | Requerido si toggle Sí. | Sin columna directa. |
| `F2` Comentarios de instalación | Instalación | Text input | `F` = Sí | `PayloadSistemaJson.ComentariosInstalacion` | `colMEZ_Draft` | Texto recomendado. | Sin columna directa. |
| `G` ¿Requiere memoria de cálculo? | Memoria de cálculo | Toggle | Siempre en Mezzanine | `Memoria de cálculo`; payload detalle | `colMEZ_Draft` | Si Sí, capturar costo. | Decision, no text input. |
| `G1` Costo de memoria de cálculo | Memoria de cálculo | Text input numerico | `G` = Sí | `PayloadSistemaJson.CostoMemCalculo` | `colMEZ_Draft` | Requerido si toggle Sí. | Sin columna directa. |
| `U` ¿Unirse a estructura del cliente? | Estructura del cliente | Toggle | Siempre en Mezzanine | `Unirse a estructura de otro proveedor`; payload detalle | `colMEZ_Draft` | Si Sí, capturar requisitos. | Decision, no text input. |
| `U1` Comentarios / requisitos | Estructura del cliente | Text input | `U` = Sí | `PayloadSistemaJson.ComentariosEstructura` | `colMEZ_Draft` | Requerido si toggle Sí. | Sin columna directa. |
| `H` ¿Se consideran proveedores externos? | Proveedores externos | Toggle | Siempre en Mezzanine | `Proveedores externos`; payload detalle | `colMEZ_Draft` | Si Sí, mostrar tabla. | Decision, no text input. |
| `H1` Tabla: Proveedores externos | Proveedores externos | Tabla editable | `H` = Sí | `PayloadSistemaJson.ProveedoresExternos` | `colProveedoresExternos` | Requiere proveedor por renglon. | Sin columna directa. |
| `I` Comentarios generales del sistema | Comentarios generales | Text input | Siempre en Mezzanine | `Consideraciones especiales`; payload detalle | `colMEZ_Draft` | Texto recomendado. | Columna requerida. |
