# FDI Drive In Process Map

Fuente funcional: [docs/diagrams/diseno-sistema-drive-in.mmd](../diagrams/diseno-sistema-drive-in.mmd).

Este documento es la referencia tecnica externa para la captura de Sistema
Drive In en `scrFDI`. No debe renderizarse como tabla informativa dentro de la
canvas app.

> **Nota:** el sistema Drive In reusa el patron de captura comun (metodo de
> captura, referencia anterior, datos comunes) pero **difiere** de Dinamico/Pushback
> en dos cosas: (1) la **"Configuracion del rack" NO lleva rodamientos** (drive in
> no usa rodillos) — solo frentes/fondos/niveles buscados; (2) agrega la **seccion
> "Montacargas"** (medidas del montacargas o por modelo), con una **ayuda visual**.
> Es una **propuesta**: los nombres exactos de colecciones, claves del payload,
> `TipoKey` y columnas SharePoint los **confirma Codex** al implementar. Cualquier
> columna/lista nueva en SharePoint requiere **visto bueno previo** (regla del proyecto).

## Estado SharePoint

La app y la auditoria local no incluyen una fuente/lista SharePoint llamada
`Sistema Drive In`. Igual que en Dinamico/Pushback, la implementacion deberia dejar
el sistema disponible en el catalogo, capturar datos en colecciones locales y crear
el registro puente en `Sistemas por cotización`, sin intentar
`Patch('Sistema Drive In', ...)` sobre una lista inexistente. El detalle propio
(incl. montacargas) viaja en `PayloadSistemaJson` hasta que exista la lista.

Columnas requeridas para activar persistencia de detalle (mismas comunes que Dinamico):

| Columna requerida | Tipo esperado | Uso |
| --- | --- | --- |
| `CotizaciónID` | Lookup a `Cotizaciones` | Relacionar el sistema con la cotizacion. |
| `SistemasID` | Lookup a `Sistemas por cotización` | Relacionar el detalle con el registro puente. |
| `Folio` | Texto | Trazabilidad de cotizacion. |
| `Title` | Texto | Nombre del sistema en la tab. |
| `PayloadSistemaJson` | Texto multilinea | Payload completo de Drive In, incluyendo tablas y montacargas. |
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

> Datos de **Montacargas** (tipo de captura, medidas o modelo) no requieren columna
> dedicada nueva: van en `PayloadSistemaJson.Montacargas`. Si se quiere persistir en
> columnas propias, definirlas con Codex (requiere visto bueno de schema).

## Mapa de procesos

| Nodo del diagrama | Sección UI | Tipo de control esperado | Visible cuando | Campo/columna SharePoint | Colección local si aplica | Validación | Observaciones |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `A` Sistema drive in | Sistema Drive In | Contenedor de captura | Tab activo `TipoKey = "DRV"` | Lista requerida `Sistema Drive In`; registro puente en `Sistemas por cotización` | `colDRV_Draft` | Debe existir tab Drive In en catalogo. | Nodo raiz del flujo. |
| `B` Método de captura | Método de captura | Dropdown | Siempre en Drive In | Requerida `Tipo de diseño`; `PayloadSistemaJson.MetodoCaptura` | `colDRV_Draft` | Opciones: `Diseño`, `Listado de piezas`, `Planos/diseño de cliente`, `Cotización o pedido anterior`. | Controla secciones visibles. |
| `subGraph0` Captura por diseño | Captura por diseño | Contenedor condicional | Método = `Diseño` | `PayloadSistemaJson` | `colDRV_Draft` | Solo visible para captura por diseno. | Agrupa tarima, rack, area, montacargas, niveles, seguridad y piezas especiales. |
| `subGraph1` Referencia anterior | Referencia anterior | Grupo de campos | Método = `Cotización o pedido anterior` | `Número de pedido o cotización`; `PayloadSistemaJson` | `colDRV_Draft` | Cotizacion y pedido pueden coexistir. | No es decision excluyente. |
| `subGraph2` Datos comunes del sistema | Datos comunes del sistema | Grupo de campos | Siempre en Drive In | Columnas comunes requeridas; `PayloadSistemaJson` | `colDRV_Draft` | Siempre capturable. | Se reutiliza patron de Dinamico/Selectivo. |
| `T` Sección: Tarima | Tarimas | Tabla editable | Método = `Diseño` o `Planos/diseño de cliente` | `PayloadSistemaJson.Tarimas` | `colListadoTarimas` | Al menos detalle si se agregan renglones. Con planos del cliente se usa para verificar perfiles. | Tabla compartida filtrada por `SistemaId`. |
| `T1` Peso | Tarimas | Text input numerico | Método = `Diseño` | `PayloadSistemaJson.Tarimas.Peso` | `colListadoTarimas` | Numero recomendado. | Sin columna directa. |
| `T2` Alto | Tarimas | Text input numerico | Método = `Diseño` | `PayloadSistemaJson.Tarimas.Alto` | `colListadoTarimas` | Numero recomendado. | Sin columna directa. |
| `T3` Frente | Tarimas | Text input numerico | Método = `Diseño` | `PayloadSistemaJson.Tarimas.Frente` | `colListadoTarimas` | Numero recomendado. | Sin columna directa. |
| `T4` Fondo | Tarimas | Text input numerico | Método = `Diseño` | `PayloadSistemaJson.Tarimas.Fondo` | `colListadoTarimas` | Numero recomendado. | Sin columna directa. |
| `T5` ¿Excedente? | Tarimas | Toggle por renglon | Método = `Diseño` | `PayloadSistemaJson.Tarimas.Excedente` | `colListadoTarimas` | Si es Sí, capturar frente/fondo excedente. | Decision, no text input. |
| `T6` Huella de tarima | Tarimas | Text input | Método = `Diseño` | `PayloadSistemaJson.Tarimas.HuellaTarima` | `colListadoTarimas` | Texto libre. | Sin columna directa. |
| `T5A` Frente excedente | Tarimas | Text input numerico | `T5` = Sí | `PayloadSistemaJson.Tarimas.ExcedenteFrente` | `colListadoTarimas` | Numero recomendado. | Sin columna directa. |
| `T5B` Fondo excedente | Tarimas | Text input numerico | `T5` = Sí | `PayloadSistemaJson.Tarimas.ExcedenteFondo` | `colListadoTarimas` | Numero recomendado. | Sin columna directa. |
| `CONF` Sección: Configuración del rack | Configuración del rack | Grupo de campos | Método = `Diseño` | `PayloadSistemaJson.ConfiguracionRack` | `colDRV_Draft` | Visible solo en diseno. | **Drive In: sin rodamientos** (no usa rodillos). |
| `CONF1` Frentes buscados | Configuración del rack | Text input numerico | Método = `Diseño` | `PayloadSistemaJson.FrentesBuscados` | `colDRV_Draft` | Numero recomendado. | Sin columna directa. |
| `CONF2` Fondos buscados | Configuración del rack | Text input numerico | Método = `Diseño` | `PayloadSistemaJson.FondosBuscados` | `colDRV_Draft` | Numero recomendado. | Sin columna directa. |
| `CONF3` Niveles buscados | Configuración del rack | Text input numerico | Método = `Diseño` | `PayloadSistemaJson.NivelesBuscados` | `colDRV_Draft` | Numero recomendado. | Sin columna directa. |
| `AREA` Sección: Área disponible / pasillos | Área disponible / pasillos | Grupo de text inputs | Método = `Diseño` | Columnas area/pasillos requeridas | `colDRV_Draft` | Visible solo en diseno. | Reutiliza patron comun. |
| `P1` Pasillo máximo de montacargas | Área disponible / pasillos | Text input numerico | Método = `Diseño` | `Pasillo máximo` | `colDRV_Draft` | Numero recomendado. | Columna requerida. |
| `P2` Pasillo mínimo de montacargas | Área disponible / pasillos | Text input numerico | Método = `Diseño` | `Pasillo mínimo` | `colDRV_Draft` | Numero recomendado. | Columna requerida. |
| `P3` Ancho de área disponible | Área disponible / pasillos | Text input numerico | Método = `Diseño` | `Ancho disponible` | `colDRV_Draft` | Numero recomendado. | Label UI puede ser `Ancho disponible`. |
| `P4` Largo disponible | Área disponible / pasillos | Text input numerico | Método = `Diseño` | `Largo disponible` | `colDRV_Draft` | Numero recomendado. | Columna requerida. |
| `MONTA` Sección: Montacargas | Montacargas | Grupo condicional | Método = `Diseño` | `PayloadSistemaJson.Montacargas` | `colDRV_Draft` | Visible solo en diseno. | **Exclusiva de Drive In** (el montacargas entra al rack). |
| `MONTA1` Tipo de captura de datos de montacargas | Montacargas | Dropdown | Método = `Diseño` | `PayloadSistemaJson.Montacargas.TipoCaptura` | `colDRV_Draft` | Opciones `Medidas` y `Modelo`. | Decision como selector, **no toggle**. |
| `MONTA1A` Medidas | Montacargas | Opcion de dropdown | `MONTA1` = `Medidas` | `PayloadSistemaJson.Montacargas.TipoCaptura` | `colDRV_Draft` | Captura las 3 medidas. | Muestra ayuda visual (ver `MONTA1AImg`). |
| `MONTA1A1` Altura de la cabina | Montacargas | Text input numerico | `MONTA1` = `Medidas` | `PayloadSistemaJson.Montacargas.AlturaCabina` | `colDRV_Draft` | Numero recomendado. | Sin columna directa. |
| `MONTA1A2` Ancho total del montacargas | Montacargas | Text input numerico | `MONTA1` = `Medidas` | `PayloadSistemaJson.Montacargas.AnchoTotal` | `colDRV_Draft` | Numero recomendado. | Sin columna directa. |
| `MONTA1A3` Ancho del mástil | Montacargas | Text input numerico | `MONTA1` = `Medidas` | `PayloadSistemaJson.Montacargas.AnchoMastil` | `colDRV_Draft` | Numero recomendado. | Sin columna directa. |
| `MONTA1AImg` Ayuda visual | Montacargas | Image (estatico) | `MONTA1` = `Medidas` | N/A | N/A | No captura dato. | Asset `docs/diagrams/assets/montacargas-medidas.webp`; esquema de las 3 medidas. |
| `MONTA1B` Modelo | Montacargas | Text input | `MONTA1` = `Modelo` | `PayloadSistemaJson.Montacargas.Modelo` | `colDRV_Draft` | Texto recomendado. | Alternativa a capturar medidas. |
| `N` Sección: Criterios para configuración de niveles | Criterios para configuración de niveles | Grupo de toggles | Método = `Diseño` | `PayloadSistemaJson` y columnas requeridas | `colDRV_Draft` | Decisiones como toggles. | Reutiliza patron comun. |
| `N1` ¿Considerar altura máxima de montacargas? | Criterios para configuración de niveles | Toggle | Método = `Diseño` | `PayloadSistemaJson.ConsiderarAlturaMaxMonta` | `colDRV_Draft` | Si Sí, capturar altura. | Decision, no text input. |
| `N1A` Altura máxima de montacargas | Criterios para configuración de niveles | Text input numerico | `N1` = Sí | `Altura crítica de montacargas` | `colDRV_Draft` | Requerido si toggle Sí. | Columna requerida. |
| `N2` ¿Considerar altura de nave? | Criterios para configuración de niveles | Toggle | Método = `Diseño` | `PayloadSistemaJson.ConsiderarAlturaNave` | `colDRV_Draft` | Si Sí, capturar max/min. | Decision, no text input. |
| `N2A` Altura máxima de nave | Criterios para configuración de niveles | Text input numerico | `N2` = Sí | `Altura crítica de niveles`; payload max | `colDRV_Draft` | Requerido si toggle Sí. | Resumen a columna. |
| `N2B` Altura mínima de nave | Criterios para configuración de niveles | Text input numerico | `N2` = Sí | `Altura crítica de niveles`; payload min | `colDRV_Draft` | Requerido si toggle Sí. | Resumen a columna. |
| `N3` ¿Adjuntar Imagen/Layout? | Criterios para configuración de niveles | Toggle | Método = `Diseño` | Adjuntos de cotizacion; payload indicador | `colDRV_Draft` | Si Sí, usar adjuntos. | No crea columna nueva. |
| `N3B` Adjuntar archivos | Criterios para configuración de niveles | Adjuntos existentes | `N3` = Sí | Adjuntos de `Cotizaciones` | N/A | Archivo recomendado si toggle Sí. | Se apoya en adjuntos del formulario principal. |
| `N4` ¿Existe definición por parte del cliente? | Criterios para configuración de niveles | Toggle | Método = `Diseño` | `PayloadSistemaJson.ExisteDefCliente` | `colDRV_Draft` | Si Sí, capturar comentarios. | Decision, no text input. |
| `N4A` Comentarios de configuración del cliente | Criterios para configuración de niveles | Text input | `N4` = Sí | `Definido por el cliente` | `colDRV_Draft` | Requerido si toggle Sí. | Columna requerida. |
| `SEG` Sección: Elementos de seguridad | Elementos de seguridad | Grupo condicional | Método = `Diseño` | `Elementos de seguridad`; payload detalle | `colElementoSeguridad` | Visible solo en diseno. | Tabla compartida filtrada por `SistemaId`. |
| `SEG1` ¿Considerar elementos de seguridad? | Elementos de seguridad | Toggle | Método = `Diseño` | `PayloadSistemaJson.ElementosSeguridad` | `colDRV_Draft` | Si Sí, mostrar tabla. | Decision, no text input. |
| `SEG2` Tabla: Listado de piezas de seguridad | Elementos de seguridad | Tabla editable | `SEG1` = Sí | `Elementos de seguridad`; payload detalle | `colElementoSeguridad` | Requiere pieza por renglon. | Resumen a columna requerida. |
| `PE` Sección: Piezas especiales | Piezas especiales | Grupo condicional | Método = `Diseño` | `PayloadSistemaJson.PiezasEspeciales` | `colPiezasEspeciales` | Visible solo en diseno. | Sin columna directa requerida. |
| `PE1` ¿Considerar piezas especiales? | Piezas especiales | Toggle | Método = `Diseño` | `PayloadSistemaJson.TienePiezasEspeciales` | `colDRV_Draft` | Si Sí, mostrar tabla. | Decision, no text input. |
| `PE2` Tabla: Piezas especiales | Piezas especiales | Tabla editable | `PE1` = Sí | `PayloadSistemaJson.PiezasEspeciales` | `colPiezasEspeciales` | Requiere pieza por renglon. | Sin columna directa. |
| `LP` Tabla: Listado de piezas | Listado de piezas | Tabla editable | Método = `Listado de piezas` | `Piezas de usuario`; `PayloadSistemaJson.Piezas` | `colListadoPiezas` | Requiere pieza por renglon. | Resumen a columna requerida. |
| `CLI` Adjuntar planos/diseño de cliente | Planos/diseño de cliente | Adjuntos existentes | Método = `Planos/diseño de cliente` | Adjuntos de `Cotizaciones`; payload indicador | N/A | Archivo recomendado. | El cliente provee sus planos; aun así se captura/verifica la Tarima (sección `T`) para corroborar que los perfiles fabricados cumplen. Se apoya en adjuntos del formulario principal. |
| `FOL1` Folio de cotización anterior | Referencia anterior | Text input | Método = `Cotización o pedido anterior` | `Número de pedido o cotización`; payload detalle | `colDRV_Draft` | Opcional si pedido existe. | No excluye pedido. |
| `FOL2` Folio de pedido anterior | Referencia anterior | Text input | Método = `Cotización o pedido anterior` | `Número de pedido o cotización`; payload detalle | `colDRV_Draft` | Opcional si cotizacion existe. | No excluye cotizacion. |
| `FOL3` Comentarios / alcance de la referencia | Referencia anterior | Text input | Método = `Cotización o pedido anterior` | `PayloadSistemaJson.ComentariosReferencia` | `colDRV_Draft` | Texto recomendado. | Sin columna directa. |
| `D` Acabado | Datos comunes del sistema | Dropdown | Siempre en Drive In | `Galvanizado`; `Tipo de galvanizado`; payload acabado | `colDRV_Draft` | Debe elegir una opcion. | Reutiliza patron comun. |
| `D1` Pintado | Acabado | Opcion de dropdown | Acabado seleccionado | `PayloadSistemaJson.Acabado`; `Galvanizado = false` | `colDRV_Draft` | Opcion valida. | No muestra precio por kg. |
| `D2` Galvanizado en frío | Acabado | Opcion de dropdown | Acabado seleccionado | `Galvanizado`; `Tipo de galvanizado`; `Precio por kilogramo galvanizado` | `colDRV_Draft` | Opcion valida. | Muestra precio por kg. |
| `D3` Galvanizado en caliente | Acabado | Opcion de dropdown | Acabado seleccionado | `Galvanizado`; `Tipo de galvanizado`; `Precio por kilogramo galvanizado` | `colDRV_Draft` | Opcion valida. | Muestra precio por kg. |
| `D4` Pregalvanizado | Acabado | Opcion de dropdown | Acabado seleccionado | `Galvanizado`; `Tipo de galvanizado`; payload acabado | `colDRV_Draft` | Opcion valida. | No muestra precio por kg. |
| `P` Precio por kilogramo | Acabado | Text input numerico | Acabado = galvanizado frio/caliente | `Precio por kilogramo galvanizado` | `colDRV_Draft` | Requerido para frio/caliente. | Columna requerida. |
| `E` Tabla: Colores por pieza | Colores por pieza | Tabla editable + combo | Siempre en Drive In | `PayloadSistemaJson.Colores` | `colListadoColores` | Requiere pieza/color por renglon. | Sin columna directa. |
| `F` ¿Requiere instalación? | Instalación | Toggle | Siempre en Drive In | `Instalación`; payload detalle | `colDRV_Draft` | Si Sí, capturar costo/comentarios. | Decision, no text input. |
| `F1` Costo de instalación | Instalación | Text input numerico | `F` = Sí | `PayloadSistemaJson.CostoInstalacion` | `colDRV_Draft` | Requerido si toggle Sí. | Sin columna directa. |
| `F2` Comentarios de instalación | Instalación | Text input | `F` = Sí | `PayloadSistemaJson.ComentariosInstalacion` | `colDRV_Draft` | Texto recomendado. | Sin columna directa. |
| `G` ¿Requiere memoria de cálculo? | Memoria de cálculo | Toggle | Siempre en Drive In | `Memoria de cálculo`; payload detalle | `colDRV_Draft` | Si Sí, capturar costo. | Decision, no text input. |
| `G1` Costo de memoria de cálculo | Memoria de cálculo | Text input numerico | `G` = Sí | `PayloadSistemaJson.CostoMemCalculo` | `colDRV_Draft` | Requerido si toggle Sí. | Sin columna directa. |
| `U` ¿Unirse a estructura del cliente? | Estructura del cliente | Toggle | Siempre en Drive In | `Unirse a estructura de otro proveedor`; payload detalle | `colDRV_Draft` | Si Sí, capturar requisitos. | Decision, no text input. |
| `U1` Comentarios / requisitos | Estructura del cliente | Text input | `U` = Sí | `PayloadSistemaJson.ComentariosEstructura` | `colDRV_Draft` | Requerido si toggle Sí. | Sin columna directa. |
| `H` ¿Se consideran proveedores externos? | Proveedores externos | Toggle | Siempre en Drive In | `Proveedores externos`; payload detalle | `colDRV_Draft` | Si Sí, mostrar tabla. | Decision, no text input. |
| `H1` Tabla: Proveedores externos | Proveedores externos | Tabla editable | `H` = Sí | `PayloadSistemaJson.ProveedoresExternos` | `colProveedoresExternos` | Requiere proveedor por renglon. | Sin columna directa. |
| `I` Comentarios generales del sistema | Comentarios generales | Text input | Siempre en Drive In | `Consideraciones especiales`; payload detalle | `colDRV_Draft` | Texto recomendado. | Columna requerida. |
