# FDI Mezzanine Limpio Process Map

Fuente funcional: [docs/diagrams/diseno-sistema-mezzanine-limpio.mmd](../diagrams/diseno-sistema-mezzanine-limpio.mmd).

Este documento es la referencia tecnica externa para la captura de Sistema
Mezzanine Limpio en `scrFDI`. No debe renderizarse como tabla informativa dentro de
la canvas app.

> **Nota:** mezzanine limpio = estructura de **puras columnas**, multi‑piso, que
> puede ser **mixto**: zonas **moduladas** (con estanteria → pickeo → producto) y/o
> zonas **limpias** (tarimas en el piso). Reusa el marco comun y la base del
> mezzanine, y agrega logica condicional:
> - Primero pregunta **¿Sera modulado?** (y **¿en donde?**) y **¿Cuantos pisos?**.
> - **Modulado = Sí** ⇒ es para pickeo ⇒ abre la **tabla de Producto**.
> - **¿Tarimas en zona no modulada? = Sí** ⇒ abre la **tabla de Tarima** (clasica).
> - Extra **Carga por m²**; **Configuracion de columnas** = separacion (Manual / Por cálculo).
> - Conserva del mezzanine: **elevador (→ capacidad), tipo de piso (Rejilla Irving /
>   MDF), carrito de pickeo (→ medidas/ruedas/peso), escaleras (toggle)**.
> - Sin montacargas; limitante de niveles = altura de nave.
>
> Es una **propuesta**: nombres de colecciones, claves del payload, `TipoKey` y
> columnas SharePoint los **confirma Codex** al implementar. Cualquier columna/lista
> nueva en SharePoint requiere **visto bueno previo** (regla del proyecto).

## Estado SharePoint

La app y la auditoria local no incluyen una fuente/lista SharePoint llamada
`Sistema Mezzanine Limpio`. Igual que en los demas sistemas, la implementacion
deberia dejar el sistema disponible en el catalogo, capturar datos en colecciones
locales y crear el registro puente en `Sistemas por cotización`, sin intentar
`Patch('Sistema Mezzanine Limpio', ...)` sobre una lista inexistente. El detalle
propio (mezzanine, productos, tarimas, columnas) viaja en `PayloadSistemaJson`.

Columnas requeridas para activar persistencia de detalle (comunes con los demas):

| Columna requerida | Tipo esperado | Uso |
| --- | --- | --- |
| `CotizaciónID` | Lookup a `Cotizaciones 2026` | Relacionar el sistema con la cotizacion. |
| `SistemasID` | Lookup a `Sistemas por cotización` | Relacionar el detalle con el registro puente. |
| `Folio` | Texto | Trazabilidad de cotizacion. |
| `Title` | Texto | Nombre del sistema en la tab. |
| `PayloadSistemaJson` | Texto multilinea | Payload completo (mezzanine, productos, tarimas, columnas). |
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

> Datos de **Configuracion del mezzanine** (pisos, carga/m², modulado, elevador, piso,
> carrito, escaleras), **Producto** (tabla), **Tarima** (tabla) y **columnas**
> (separacion) van en `PayloadSistemaJson` (`.Mezzanine`, `.Productos`, `.Tarimas`,
> `.Columnas`). Columnas propias → con Codex (requiere visto bueno de schema).

## Mapa de procesos

| Nodo del diagrama | Sección UI | Tipo de control esperado | Visible cuando | Campo/columna SharePoint | Colección local si aplica | Validación | Observaciones |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `A` Sistema mezzanine limpio | Sistema Mezzanine Limpio | Contenedor de captura | Tab activo `TipoKey = "MZL"` | Lista requerida `Sistema Mezzanine Limpio`; registro puente en `Sistemas por cotización` | `colMZL_Draft` | Debe existir tab en catalogo. | Nodo raiz del flujo. |
| `B` Método de captura | Método de captura | Dropdown | Siempre en Mezzanine Limpio | Requerida `Tipo de diseño`; `PayloadSistemaJson.MetodoCaptura` | `colMZL_Draft` | Opciones: `Diseño`, `Listado de piezas`, `Planos/diseño de cliente`, `Cotización o pedido anterior`. | Controla secciones visibles. |
| `subGraph0` Captura por diseño | Captura por diseño | Contenedor condicional | Método = `Diseño` | `PayloadSistemaJson` | `colMZL_Draft` | Solo visible para captura por diseno. | Agrupa mezzanine, columnas, producto, tarima, area, niveles, seguridad y piezas especiales. |
| `subGraph1` Referencia anterior | Referencia anterior | Grupo de campos | Método = `Cotización o pedido anterior` | `Número de pedido o cotización`; `PayloadSistemaJson` | `colMZL_Draft` | Cotizacion y pedido pueden coexistir. | No es decision excluyente. |
| `subGraph2` Datos comunes del sistema | Datos comunes del sistema | Grupo de campos | Siempre en Mezzanine Limpio | Columnas comunes requeridas; `PayloadSistemaJson` | `colMZL_Draft` | Siempre capturable. | Se reutiliza patron comun. |
| `MEZ` Sección: Configuración del mezzanine | Configuración del mezzanine | Grupo de campos | Método = `Diseño` | `PayloadSistemaJson.Mezzanine` | `colMZL_Draft` | Visible solo en diseno. | Define pisos, carga, modulado/limpio y servicios. |
| `MEZ1` ¿Cuántos pisos? | Configuración del mezzanine | Text input numerico | Método = `Diseño` | `PayloadSistemaJson.Mezzanine.CantidadPisos` | `colMZL_Draft` | Entero recomendado. | Multi-piso. |
| `MEZ2` Carga por m² | Configuración del mezzanine | Text input numerico | Método = `Diseño` | `PayloadSistemaJson.Mezzanine.CargaPorM2` | `colMZL_Draft` | Numero recomendado. | Dato extra para calculo estructural. |
| `MOD` ¿Será modulado? | Configuración del mezzanine | Toggle | Método = `Diseño` | `PayloadSistemaJson.Mezzanine.EsModulado` | `colMZL_Draft` | Si Sí, indicar zona y capturar producto. | Puede ser combinacion (modulado + limpio). |
| `MODZONA` ¿En dónde? (zona modulada) | Configuración del mezzanine | Text input | `MOD` = Sí | `PayloadSistemaJson.Mezzanine.ZonaModulada` | `colMZL_Draft` | Texto libre. | P. ej. piso superior / inferior / por piso. |
| `TAR` ¿Se usarán tarimas en la zona no modulada? | Configuración del mezzanine | Toggle | Método = `Diseño` | `PayloadSistemaJson.Mezzanine.UsaTarimas` | `colMZL_Draft` | Si Sí, capturar tabla de tarimas. | Zona limpia con tarimas. |
| `MEZ3` ¿Requiere elevador? | Configuración del mezzanine | Toggle | Método = `Diseño` | `PayloadSistemaJson.Mezzanine.RequiereElevador` | `colMZL_Draft` | Si Sí, capturar capacidad/especificacion. | Decision, no text input. |
| `MEZ3A` Capacidad / especificación del elevador | Configuración del mezzanine | Text input | `MEZ3` = Sí | `PayloadSistemaJson.Mezzanine.ElevadorSpec` | `colMZL_Draft` | Requerido si toggle Sí. | Sin columna directa. |
| `MEZ4` Tipo de piso | Configuración del mezzanine | Dropdown | Método = `Diseño` | `PayloadSistemaJson.Mezzanine.TipoPiso` | `colMZL_Draft` | Opciones `Rejilla Irving` / `MDF`. | Solo esas dos opciones actualmente. |
| `MEZ4A` Rejilla Irving | Configuración del mezzanine | Opcion de dropdown | Selector de piso | `PayloadSistemaJson.Mezzanine.TipoPiso` | `colMZL_Draft` | Opcion valida. | Opcion fija. |
| `MEZ4B` MDF | Configuración del mezzanine | Opcion de dropdown | Selector de piso | `PayloadSistemaJson.Mezzanine.TipoPiso` | `colMZL_Draft` | Opcion valida. | Opcion fija. |
| `MEZ5` ¿Se usará carrito para pickear? | Configuración del mezzanine | Toggle | Método = `Diseño` | `PayloadSistemaJson.Mezzanine.UsaCarrito` | `colMZL_Draft` | Si Sí, capturar datos del carrito. | Decision, no text input. |
| `MEZ5A` Medidas del carrito | Configuración del mezzanine | Text input | `MEZ5` = Sí | `PayloadSistemaJson.Carrito.Medidas` | `colMZL_Draft` | Requerido si carrito Sí. | Relevante para pasillo de pickeo. |
| `MEZ5B` Número de ruedas | Configuración del mezzanine | Text input numerico | `MEZ5` = Sí | `PayloadSistemaJson.Carrito.NumeroRuedas` | `colMZL_Draft` | Entero recomendado. | Sin columna directa. |
| `MEZ5C` Tipo de rueda | Configuración del mezzanine | Text input | `MEZ5` = Sí | `PayloadSistemaJson.Carrito.TipoRueda` | `colMZL_Draft` | Texto libre. | Sin columna directa. |
| `MEZ5D` Medida de rueda | Configuración del mezzanine | Text input | `MEZ5` = Sí | `PayloadSistemaJson.Carrito.MedidaRueda` | `colMZL_Draft` | Texto/numero. | Sin columna directa. |
| `MEZ5E` Peso del carrito | Configuración del mezzanine | Text input numerico | `MEZ5` = Sí | `PayloadSistemaJson.Carrito.Peso` | `colMZL_Draft` | Numero recomendado. | Carga viva adicional. |
| `MEZ6` ¿Requiere escaleras? | Configuración del mezzanine | Toggle | Método = `Diseño` | `PayloadSistemaJson.Mezzanine.RequiereEscaleras` | `colMZL_Draft` | Sí/No. | Solo toggle (sin cantidad). |
| `COL` Sección: Configuración de columnas | Configuración de columnas | Grupo de campos | Método = `Diseño` | `PayloadSistemaJson.Columnas` | `colMZL_Draft` | Visible solo en diseno. | Estructura de puras columnas. |
| `COL1` Separación entre columnas | Configuración de columnas | Dropdown | Método = `Diseño` | `PayloadSistemaJson.Columnas.MetodoSeparacion` | `colMZL_Draft` | Opciones `Manual` / `Por cálculo`. | Decision como selector. |
| `COL1A` Insertar separación | Configuración de columnas | Text input numerico | `COL1` = `Manual` | `PayloadSistemaJson.Columnas.SeparacionManual` | `colMZL_Draft` | Requerido si manual. | Sin columna directa. |
| `COL1B` Por cálculo | Configuración de columnas | Opcion de dropdown | `COL1` = `Por cálculo` | `PayloadSistemaJson.Columnas.MetodoSeparacion` | `colMZL_Draft` | Opcion valida. | Lo deriva ingenieria. |
| `CAR` Sección: Producto (zona modulada) | Producto | Contenedor de tabla | `MOD` = Sí | `PayloadSistemaJson.Productos` | `colMZL_Productos` | Visible si modulado. | Zona modulada = pickeo. |
| `CARTBL` Tabla: Productos | Producto | Tabla editable | `MOD` = Sí | `PayloadSistemaJson.Productos` | `colMZL_Productos` | Un renglon por producto. | Igual que mezzanine. |
| `CAR1` Tipo de producto (texto abierto) | Producto | Text input (columna) | `MOD` = Sí | `PayloadSistemaJson.Productos[].Tipo` | `colMZL_Productos` | Texto libre. | Columna de la tabla. |
| `CAR2` Largo del producto | Producto | Text input numerico (columna) | `MOD` = Sí | `PayloadSistemaJson.Productos[].Largo` | `colMZL_Productos` | Numero recomendado. | Columna de la tabla. |
| `CAR3` Ancho del producto | Producto | Text input numerico (columna) | `MOD` = Sí | `PayloadSistemaJson.Productos[].Ancho` | `colMZL_Productos` | Numero recomendado. | Columna de la tabla. |
| `CAR4` Alto del producto | Producto | Text input numerico (columna) | `MOD` = Sí | `PayloadSistemaJson.Productos[].Alto` | `colMZL_Productos` | Numero recomendado. | Columna de la tabla. |
| `CAR5` Peso por pieza | Producto | Text input numerico (columna) | `MOD` = Sí | `PayloadSistemaJson.Productos[].Peso` | `colMZL_Productos` | Numero recomendado. | Columna de la tabla. |
| `CAR6` Cantidad por nivel | Producto | Text input numerico (columna) | `MOD` = Sí | `PayloadSistemaJson.Productos[].CantidadPorNivel` | `colMZL_Productos` | Numero recomendado. | Columna de la tabla. |
| `TARS` Sección: Tarima (zona no modulada) | Tarima | Contenedor de tabla | `TAR` = Sí | `PayloadSistemaJson.Tarimas` | `colListadoTarimas` | Visible si se usan tarimas. | Zona limpia con tarimas. |
| `TARTBL` Tabla: Tarimas | Tarima | Tabla editable | `TAR` = Sí | `PayloadSistemaJson.Tarimas` | `colListadoTarimas` | Un renglon por tarima. | Tabla clasica de tarima. |
| `TARP` Peso | Tarima | Text input numerico (columna) | `TAR` = Sí | `PayloadSistemaJson.Tarimas[].Peso` | `colListadoTarimas` | Numero recomendado. | Columna de la tabla. |
| `TARA` Alto | Tarima | Text input numerico (columna) | `TAR` = Sí | `PayloadSistemaJson.Tarimas[].Alto` | `colListadoTarimas` | Numero recomendado. | Columna de la tabla. |
| `TARF` Frente | Tarima | Text input numerico (columna) | `TAR` = Sí | `PayloadSistemaJson.Tarimas[].Frente` | `colListadoTarimas` | Numero recomendado. | Columna de la tabla. |
| `TARO` Fondo | Tarima | Text input numerico (columna) | `TAR` = Sí | `PayloadSistemaJson.Tarimas[].Fondo` | `colListadoTarimas` | Numero recomendado. | Columna de la tabla. |
| `TARH` Huella de tarima | Tarima | Text input (columna) | `TAR` = Sí | `PayloadSistemaJson.Tarimas[].HuellaTarima` | `colListadoTarimas` | Texto libre. | Columna de la tabla. |
| `TARE` ¿Excedente? | Tarima | Toggle por renglon | `TAR` = Sí | `PayloadSistemaJson.Tarimas[].Excedente` | `colListadoTarimas` | Si Sí, capturar frente/fondo excedente. | Decision por renglon. |
| `TAREF` Frente excedente | Tarima | Text input numerico (columna) | `TARE` = Sí | `PayloadSistemaJson.Tarimas[].ExcedenteFrente` | `colListadoTarimas` | Numero recomendado. | Columna de la tabla. |
| `TAREO` Fondo excedente | Tarima | Text input numerico (columna) | `TARE` = Sí | `PayloadSistemaJson.Tarimas[].ExcedenteFondo` | `colListadoTarimas` | Numero recomendado. | Columna de la tabla. |
| `AREA` Sección: Área disponible / pasillos | Área disponible / pasillos | Grupo de text inputs | Método = `Diseño` | Columnas area requeridas | `colMZL_Draft` | Visible solo en diseno. | Sin montacargas. |
| `P1` Ancho de área disponible | Área disponible / pasillos | Text input numerico | Método = `Diseño` | `Ancho disponible` | `colMZL_Draft` | Numero recomendado. | Columna requerida. |
| `P2` Largo disponible | Área disponible / pasillos | Text input numerico | Método = `Diseño` | `Largo disponible` | `colMZL_Draft` | Numero recomendado. | Columna requerida. |
| `P3` Ancho de pasillo de pickeo | Área disponible / pasillos | Text input numerico | Método = `Diseño` | `PayloadSistemaJson.AnchoPasilloPickeo` | `colMZL_Draft` | Numero recomendado. | Relacionado con el carrito. |
| `N` Sección: Criterios para configuración de niveles | Criterios para configuración de niveles | Grupo de toggles | Método = `Diseño` | `PayloadSistemaJson` y columnas requeridas | `colMZL_Draft` | Decisiones como toggles. | Limitante = altura de nave (no montacargas). |
| `N2` ¿Considerar altura de nave? | Criterios para configuración de niveles | Toggle | Método = `Diseño` | `PayloadSistemaJson.ConsiderarAlturaNave` | `colMZL_Draft` | Si Sí, capturar max/min. | Limitante principal. |
| `N2A` Altura máxima de nave | Criterios para configuración de niveles | Text input numerico | `N2` = Sí | `Altura crítica de niveles`; payload max | `colMZL_Draft` | Requerido si toggle Sí. | Resumen a columna. |
| `N2B` Altura mínima de nave | Criterios para configuración de niveles | Text input numerico | `N2` = Sí | `Altura crítica de niveles`; payload min | `colMZL_Draft` | Requerido si toggle Sí. | Resumen a columna. |
| `N3` ¿Adjuntar Imagen/Layout? | Criterios para configuración de niveles | Toggle | Método = `Diseño` | Adjuntos de cotizacion; payload indicador | `colMZL_Draft` | Si Sí, usar adjuntos. | No crea columna nueva. |
| `N3B` Adjuntar archivos | Criterios para configuración de niveles | Adjuntos existentes | `N3` = Sí | Adjuntos de `Cotizaciones 2026` | N/A | Archivo recomendado si toggle Sí. | Se apoya en adjuntos del formulario principal. |
| `N4` ¿Existe definición por parte del cliente? | Criterios para configuración de niveles | Toggle | Método = `Diseño` | `PayloadSistemaJson.ExisteDefCliente` | `colMZL_Draft` | Si Sí, capturar comentarios. | Decision, no text input. |
| `N4A` Comentarios de configuración del cliente | Criterios para configuración de niveles | Text input | `N4` = Sí | `Definido por el cliente` | `colMZL_Draft` | Requerido si toggle Sí. | Columna requerida. |
| `SEG` Sección: Elementos de seguridad | Elementos de seguridad | Grupo condicional | Método = `Diseño` | `Elementos de seguridad`; payload detalle | `colElementoSeguridad` | Visible solo en diseno. | Tabla compartida filtrada por `SistemaId`. |
| `SEG1` ¿Considerar elementos de seguridad? | Elementos de seguridad | Toggle | Método = `Diseño` | `PayloadSistemaJson.ElementosSeguridad` | `colMZL_Draft` | Si Sí, mostrar tabla. | Barandales, rodapie, etc. |
| `SEG2` Tabla: Listado de piezas de seguridad | Elementos de seguridad | Tabla editable | `SEG1` = Sí | `Elementos de seguridad`; payload detalle | `colElementoSeguridad` | Requiere pieza por renglon. | Resumen a columna requerida. |
| `PE` Sección: Piezas especiales | Piezas especiales | Grupo condicional | Método = `Diseño` | `PayloadSistemaJson.PiezasEspeciales` | `colPiezasEspeciales` | Visible solo en diseno. | Sin columna directa requerida. |
| `PE1` ¿Considerar piezas especiales? | Piezas especiales | Toggle | Método = `Diseño` | `PayloadSistemaJson.TienePiezasEspeciales` | `colMZL_Draft` | Si Sí, mostrar tabla. | Decision, no text input. |
| `PE2` Tabla: Piezas especiales | Piezas especiales | Tabla editable | `PE1` = Sí | `PayloadSistemaJson.PiezasEspeciales` | `colPiezasEspeciales` | Requiere pieza por renglon. | Sin columna directa. |
| `LP` Tabla: Listado de piezas | Listado de piezas | Tabla editable | Método = `Listado de piezas` | `Piezas de usuario`; `PayloadSistemaJson.Piezas` | `colListadoPiezas` | Requiere pieza por renglon. | Resumen a columna requerida. |
| `CLI` Adjuntar planos/diseño de cliente | Planos/diseño de cliente | Adjuntos existentes | Método = `Planos/diseño de cliente` | Adjuntos de `Cotizaciones 2026`; payload indicador | N/A | Archivo recomendado. | El cliente provee sus planos; aun así se captura/verifica la configuracion del mezzanine (sección `MEZ`) para corroborar que los perfiles fabricados cumplen. Se apoya en adjuntos del formulario principal. |
| `FOL1` Folio de cotización anterior | Referencia anterior | Text input | Método = `Cotización o pedido anterior` | `Número de pedido o cotización`; payload detalle | `colMZL_Draft` | Opcional si pedido existe. | No excluye pedido. |
| `FOL2` Folio de pedido anterior | Referencia anterior | Text input | Método = `Cotización o pedido anterior` | `Número de pedido o cotización`; payload detalle | `colMZL_Draft` | Opcional si cotizacion existe. | No excluye cotizacion. |
| `FOL3` Comentarios / alcance de la referencia | Referencia anterior | Text input | Método = `Cotización o pedido anterior` | `PayloadSistemaJson.ComentariosReferencia` | `colMZL_Draft` | Texto recomendado. | Sin columna directa. |
| `D` Acabado | Datos comunes del sistema | Dropdown | Siempre en Mezzanine Limpio | `Galvanizado`; `Tipo de galvanizado`; payload acabado | `colMZL_Draft` | Debe elegir una opcion. | Reutiliza patron comun. |
| `D1` Pintado | Acabado | Opcion de dropdown | Acabado seleccionado | `PayloadSistemaJson.Acabado`; `Galvanizado = false` | `colMZL_Draft` | Opcion valida. | No muestra precio por kg. |
| `D2` Galvanizado en frío | Acabado | Opcion de dropdown | Acabado seleccionado | `Galvanizado`; `Tipo de galvanizado`; `Precio por kilogramo galvanizado` | `colMZL_Draft` | Opcion valida. | Muestra precio por kg. |
| `D3` Galvanizado en caliente | Acabado | Opcion de dropdown | Acabado seleccionado | `Galvanizado`; `Tipo de galvanizado`; `Precio por kilogramo galvanizado` | `colMZL_Draft` | Opcion valida. | Muestra precio por kg. |
| `D4` Pregalvanizado | Acabado | Opcion de dropdown | Acabado seleccionado | `Galvanizado`; `Tipo de galvanizado`; payload acabado | `colMZL_Draft` | Opcion valida. | No muestra precio por kg. |
| `P` Precio por kilogramo | Acabado | Text input numerico | Acabado = galvanizado frio/caliente | `Precio por kilogramo galvanizado` | `colMZL_Draft` | Requerido para frio/caliente. | Columna requerida. |
| `E` Tabla: Colores por pieza | Colores por pieza | Tabla editable + combo | Siempre en Mezzanine Limpio | `PayloadSistemaJson.Colores` | `colListadoColores` | Requiere pieza/color por renglon. | Sin columna directa. |
| `F` ¿Requiere instalación? | Instalación | Toggle | Siempre en Mezzanine Limpio | `Instalación`; payload detalle | `colMZL_Draft` | Si Sí, capturar costo/comentarios. | Decision, no text input. |
| `F1` Costo de instalación | Instalación | Text input numerico | `F` = Sí | `PayloadSistemaJson.CostoInstalacion` | `colMZL_Draft` | Requerido si toggle Sí. | Sin columna directa. |
| `F2` Comentarios de instalación | Instalación | Text input | `F` = Sí | `PayloadSistemaJson.ComentariosInstalacion` | `colMZL_Draft` | Texto recomendado. | Sin columna directa. |
| `G` ¿Requiere memoria de cálculo? | Memoria de cálculo | Toggle | Siempre en Mezzanine Limpio | `Memoria de cálculo`; payload detalle | `colMZL_Draft` | Si Sí, capturar costo. | Decision, no text input. |
| `G1` Costo de memoria de cálculo | Memoria de cálculo | Text input numerico | `G` = Sí | `PayloadSistemaJson.CostoMemCalculo` | `colMZL_Draft` | Requerido si toggle Sí. | Sin columna directa. |
| `U` ¿Unirse a estructura del cliente? | Estructura del cliente | Toggle | Siempre en Mezzanine Limpio | `Unirse a estructura de otro proveedor`; payload detalle | `colMZL_Draft` | Si Sí, capturar requisitos. | Decision, no text input. |
| `U1` Comentarios / requisitos | Estructura del cliente | Text input | `U` = Sí | `PayloadSistemaJson.ComentariosEstructura` | `colMZL_Draft` | Requerido si toggle Sí. | Sin columna directa. |
| `H` ¿Se consideran proveedores externos? | Proveedores externos | Toggle | Siempre en Mezzanine Limpio | `Proveedores externos`; payload detalle | `colMZL_Draft` | Si Sí, mostrar tabla. | Decision, no text input. |
| `H1` Tabla: Proveedores externos | Proveedores externos | Tabla editable | `H` = Sí | `PayloadSistemaJson.ProveedoresExternos` | `colProveedoresExternos` | Requiere proveedor por renglon. | Sin columna directa. |
| `I` Comentarios generales del sistema | Comentarios generales | Text input | Siempre en Mezzanine Limpio | `Consideraciones especiales`; payload detalle | `colMZL_Draft` | Texto recomendado. | Columna requerida. |
