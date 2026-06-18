# FDI Selectivo Process Map

Fuente funcional: [docs/diagrams/diseno-sistema-selectivo.mmd](diagrams/diseno-sistema-selectivo.mmd).

Este documento es la referencia tecnica externa para la captura de Sistema
Selectivo en `scrFDI`. No debe renderizarse como tabla informativa dentro de la
canvas app.

| Nodo del diagrama | Sección UI | Tipo de control esperado | Visible cuando | Campo/columna SharePoint | Colección local si aplica | Observaciones |
| --- | --- | --- | --- | --- | --- | --- |
| `A` Sistema selectivo | Sistema Selectivo | Contenedor de captura | Tab activo `TipoKey = "SEL"` | Lista `Sistema selectivo`; `PayloadSistemaJson` | `colSEL_Draft` | Nodo raiz del flujo. |
| `B` Método de captura | Método de captura | Dropdown | Siempre en Selectivo | `Tipo de diseño`; `PayloadSistemaJson.MetodoCaptura` | `colSEL_Draft` | Opciones UI: `Diseño`, `Listado de piezas`, `Planos/diseño de cliente`, `Cotización o pedido anterior`. |
| `subGraph0` Captura por diseño | Captura por diseño | Contenedor condicional | Método = `Diseño` | Sin columna directa | `colSEL_Draft` | Agrupa tarima, area, niveles, seguridad y piezas especiales. |
| `LP` Tabla: Listado de piezas | Listado de piezas | Tabla editable | Método = `Listado de piezas` | `Piezas de usuario`; `PayloadSistemaJson.Piezas` | `colListadoPiezas` | La columna guarda resumen; el payload conserva detalle. |
| `CLI` Adjuntar planos/diseño de cliente | Planos/diseño de cliente | Adjuntos existentes de cotización | Método = `Planos/diseño de cliente` | Adjuntos de `Cotizaciones`; `PayloadSistemaJson` indicador | N/A | El cliente provee sus planos; aun así se captura/verifica la Tarima (sección `T`) para corroborar que los perfiles fabricados cumplen. Se apoya en adjuntos del formulario. |
| `subGraph1` Referencia anterior | Referencia anterior | Grupo de campos | Método = `Cotización o pedido anterior` | `Número de pedido o cotización`; `PayloadSistemaJson` | `colSEL_Draft` | Cotización y pedido no son excluyentes. |
| `subGraph2` Datos comunes del sistema | Datos comunes del sistema | Grupo de campos | Siempre en Selectivo | `PayloadSistemaJson` y columnas directas disponibles | `colSEL_Draft` | Datos compartidos para cualquier método de captura. |
| `T` Sección: Tarima | Tarimas | Tabla editable | Método = `Diseño` o `Planos/diseño de cliente` | `PayloadSistemaJson.Tarimas` | `colListadoTarimas` | Captura una o varias tarimas. Con planos del cliente se usa para verificar perfiles. |
| `T1` Peso | Tarimas | Text input numerico | Método = `Diseño` | `PayloadSistemaJson.Tarimas.Peso` | `colListadoTarimas` | No existe columna directa separada. |
| `T2` Alto | Tarimas | Text input numerico | Método = `Diseño` | `PayloadSistemaJson.Tarimas.Alto` | `colListadoTarimas` | No existe columna directa separada. |
| `T3` Frente | Tarimas | Text input numerico | Método = `Diseño` | `PayloadSistemaJson.Tarimas.Frente` | `colListadoTarimas` | No existe columna directa separada. |
| `T4` Fondo | Tarimas | Text input numerico | Método = `Diseño` | `PayloadSistemaJson.Tarimas.Fondo` | `colListadoTarimas` | No existe columna directa separada. |
| `T5` ¿Excedente? | Tarimas | Toggle por renglon | Método = `Diseño` | `PayloadSistemaJson.Tarimas` | `colListadoTarimas` | Controla campos de excedente en la tabla. |
| `T6` Huella de tarima | Tarimas | Text input | Método = `Diseño` | `PayloadSistemaJson.Tarimas.HuellaTarima` | `colListadoTarimas` | Texto libre; alineado con los demás sistemas. |
| `T5A` Frente excedente | Tarimas | Text input numerico | `T5` = Sí | `PayloadSistemaJson.Tarimas.ExcedenteFrente` | `colListadoTarimas` | No existe columna directa separada. |
| `T5B` Fondo excedente | Tarimas | Text input numerico | `T5` = Sí | `PayloadSistemaJson.Tarimas.ExcedenteFondo` | `colListadoTarimas` | No existe columna directa separada. |
| `AREA` Sección: Área disponible / pasillos | Área disponible / pasillos | Grupo de text inputs | Método = `Diseño` | Columnas directas de area/pasillos | `colSEL_Draft` | Se mantiene como campos planos. |
| `P1` Pasillo máximo de montacargas | Área disponible / pasillos | Text input numerico | Método = `Diseño` | `Pasillo máximo` | `colSEL_Draft` | Valor directo en SharePoint. |
| `P2` Pasillo mínimo de montacargas | Área disponible / pasillos | Text input numerico | Método = `Diseño` | `Pasillo mínimo` | `colSEL_Draft` | Valor directo en SharePoint. |
| `P3` Ancho de área disponible | Área disponible / pasillos | Text input numerico | Método = `Diseño` | `Ancho disponible` | `colSEL_Draft` | Label UI actual: `Ancho disponible`. |
| `P4` Largo disponible | Área disponible / pasillos | Text input numerico | Método = `Diseño` | `Largo disponible` | `colSEL_Draft` | Valor directo en SharePoint. |
| `N` Sección: Criterios para configuración de niveles | Criterios para configuración de niveles | Grupo de toggles | Método = `Diseño` | `PayloadSistemaJson` | `colSEL_Draft` | Reemplaza el dropdown anterior. |
| `N1` ¿Considerar altura máxima de montacargas? | Criterios para configuración de niveles | Toggle | Método = `Diseño` | `PayloadSistemaJson.ConsiderarAlturaMaxMonta` | `colSEL_Draft` | Usa el mismo label del diagrama. |
| `N1A` Altura máxima de montacargas | Criterios para configuración de niveles | Text input numerico | `N1` = Sí | `Altura crítica de montacargas`; `PayloadSistemaJson.AltCritMonta` | `colSEL_Draft` | Columna directa existente se conserva. |
| `N2` ¿Considerar altura de nave? | Criterios para configuración de niveles | Toggle | Método = `Diseño` | `PayloadSistemaJson.ConsiderarAlturaNave` | `colSEL_Draft` | Usa el mismo label del diagrama. |
| `N2A` Altura máxima de nave | Criterios para configuración de niveles | Text input numerico | `N2` = Sí | `Altura crítica de niveles`; `PayloadSistemaJson.AlturaMaxNave` | `colSEL_Draft` | La columna directa recibe resumen max/min. |
| `N2B` Altura mínima de nave | Criterios para configuración de niveles | Text input numerico | `N2` = Sí | `Altura crítica de niveles`; `PayloadSistemaJson.AlturaMinNave` | `colSEL_Draft` | La columna directa recibe resumen max/min. |
| `N3` ¿Adjuntar Imagen/Layout? | Criterios para configuración de niveles | Toggle | Método = `Diseño` | `PayloadSistemaJson.AdjuntarImagenLayout` | `colSEL_Draft` | Activa la indicación de adjuntos. |
| `N3B` Adjuntar archivos | Criterios para configuración de niveles | Adjuntos existentes de cotización | `N3` = Sí | Adjuntos de `Cotizaciones` | N/A | No se crea columna nueva. |
| `N4` ¿Existe definición por parte del cliente? | Criterios para configuración de niveles | Toggle | Método = `Diseño` | `PayloadSistemaJson.ExisteDefCliente` | `colSEL_Draft` | Usa el mismo label del diagrama. |
| `N4A` Comentarios de configuración del cliente | Criterios para configuración de niveles | Text input | `N4` = Sí | `Definido por el cliente`; `PayloadSistemaJson.ComentariosConfigCliente` | `colSEL_Draft` | Columna directa existente se conserva. |
| `SEG` Sección: Elementos de seguridad | Elementos de seguridad | Grupo condicional | Método = `Diseño` | `Elementos de seguridad`; `PayloadSistemaJson.ElementosSeguridad` | `colElementoSeguridad` | Resumen a columna, detalle a payload. |
| `SEG1` ¿Considerar elementos de seguridad? | Elementos de seguridad | Toggle | Método = `Diseño` | `PayloadSistemaJson.ElementosSeguridad` | `colSEL_Draft` | Usa el mismo label del diagrama. |
| `SEG2` Tabla: Listado de piezas de seguridad | Elementos de seguridad | Tabla editable | `SEG1` = Sí | `Elementos de seguridad`; `PayloadSistemaJson.ElementosSeguridad` | `colElementoSeguridad` | Renglones de pieza y comentario. |
| `PE` Sección: Piezas especiales | Piezas especiales | Grupo condicional | Método = `Diseño` | `PayloadSistemaJson.PiezasEspeciales` | `colPiezasEspeciales` | No existe columna directa. |
| `PE1` ¿Considerar piezas especiales? | Piezas especiales | Toggle | Método = `Diseño` | `PayloadSistemaJson.TienePiezasEspeciales` | `colSEL_Draft` | Usa el mismo label del diagrama. |
| `PE2` Tabla: Piezas especiales | Piezas especiales | Tabla editable | `PE1` = Sí | `PayloadSistemaJson.PiezasEspeciales` | `colPiezasEspeciales` | Renglones de pieza y comentario. |
| `FOL1` Folio de cotización anterior | Referencia anterior | Text input | Método = `Cotización o pedido anterior` | `Número de pedido o cotización`; `PayloadSistemaJson.FolioCotizacionAnterior` | `colSEL_Draft` | Se combina en resumen con pedido cuando ambos existen. |
| `FOL2` Folio de pedido anterior | Referencia anterior | Text input | Método = `Cotización o pedido anterior` | `Número de pedido o cotización`; `PayloadSistemaJson.FolioPedidoAnterior` | `colSEL_Draft` | No excluye folio de cotización. |
| `FOL3` Comentarios / alcance de la referencia | Referencia anterior | Text input multilinea | Método = `Cotización o pedido anterior` | `PayloadSistemaJson.ComentariosReferencia` | `colSEL_Draft` | Sin columna directa separada. |
| `D` Acabado | Datos comunes del sistema | Dropdown | Siempre en Selectivo | `Galvanizado`; `Tipo de galvanizado`; `PayloadSistemaJson.Acabado` | `colSEL_Draft` | Sustituye el toggle visible de galvanizado. |
| `D1` Pintado | Acabado | Opción de dropdown | Acabado seleccionado | `PayloadSistemaJson.Acabado`; `Galvanizado = false` | `colSEL_Draft` | No requiere precio por kg. |
| `D2` Galvanizado en frío | Acabado | Opción de dropdown | Acabado seleccionado | `Galvanizado`; `Tipo de galvanizado`; `Precio por kilogramo galvanizado` | `colSEL_Draft` | Muestra precio por kilogramo. |
| `D3` Galvanizado en caliente | Acabado | Opción de dropdown | Acabado seleccionado | `Galvanizado`; `Tipo de galvanizado`; `Precio por kilogramo galvanizado` | `colSEL_Draft` | Muestra precio por kilogramo. |
| `D4` Pregalvanizado | Acabado | Opción de dropdown | Acabado seleccionado | `Galvanizado`; `Tipo de galvanizado`; `PayloadSistemaJson.Acabado` | `colSEL_Draft` | No muestra precio por kg. |
| `P` Precio por kilogramo | Acabado | Text input numerico | Acabado = galvanizado en frío o caliente | `Precio por kilogramo galvanizado`; `PayloadSistemaJson.PpkgGalv` | `colSEL_Draft` | Condicional por acabado. |
| `E` Tabla: Colores por pieza | Colores por pieza | Tabla editable + combo | Siempre en Selectivo | `PayloadSistemaJson.Colores` | `colListadoColores` | No existe columna directa por renglon. |
| `F` ¿Requiere instalación? | Instalación | Toggle | Siempre en Selectivo | `Instalación`; `PayloadSistemaJson.Instalacion` | `colSEL_Draft` | Usa el mismo label del diagrama. |
| `F1` Costo de instalación | Instalación | Text input numerico | `F` = Sí | `PayloadSistemaJson.CostoInstalacion` | `colSEL_Draft` | Sin columna directa separada. |
| `F2` Comentarios de instalación | Instalación | Text input | `F` = Sí | `PayloadSistemaJson.ComentariosInstalacion` | `colSEL_Draft` | Sin columna directa separada. |
| `G` ¿Requiere memoria de cálculo? | Memoria de cálculo | Toggle | Siempre en Selectivo | `Memoria de cálculo`; `PayloadSistemaJson.MemCalc` | `colSEL_Draft` | Usa el mismo label del diagrama. |
| `G1` Costo de memoria de cálculo | Memoria de cálculo | Text input numerico | `G` = Sí | `PayloadSistemaJson.CostoMemCalculo` | `colSEL_Draft` | Sin columna directa separada. |
| `U` ¿Unirse a estructura del cliente? | Estructura del cliente | Toggle | Siempre en Selectivo | `Unirse a estructura de otro proveedor`; `PayloadSistemaJson.EstProv` | `colSEL_Draft` | Usa el mismo label del diagrama. |
| `U1` Comentarios / requisitos | Estructura del cliente | Text input | `U` = Sí | `PayloadSistemaJson.ComentariosEstructura` | `colSEL_Draft` | Sin columna directa separada. |
| `H` ¿Se consideran proveedores externos? | Proveedores externos | Toggle | Siempre en Selectivo | `Proveedores externos`; `PayloadSistemaJson.ProvExternos` | `colSEL_Draft` | Usa el mismo label del diagrama. |
| `H1` Tabla: Proveedores externos | Proveedores externos | Tabla editable | `H` = Sí | `PayloadSistemaJson.ProveedoresExternos` | `colProveedoresExternos` | Renglones de proveedor y alcance. |
| `I` Comentarios generales del sistema | Comentarios generales | Text input | Siempre en Selectivo | `Consideraciones especiales`; `PayloadSistemaJson.ConsEsp` | `colSEL_Draft` | Columna directa existente se conserva. |

## Notas de implementación

- Los datos sin columna directa permanecen en `Sistema selectivo.PayloadSistemaJson`.
- No se modifica schema de SharePoint; cualquier columna nueva debe aprobarse antes.
- La app no debe mostrar esta tabla como UI; esta es una referencia del repo.
