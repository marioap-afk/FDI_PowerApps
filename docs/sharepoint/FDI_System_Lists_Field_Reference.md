# FDI system lists and field reference

Referencia para crear o completar listas SharePoint usadas por la captura de
sistemas en `scrFDI`.

Estado de fuente: el inventario `docs/sharepoint/sharepoint-schema.json` esta en
estado `pending-pnp-powershell-not-installed`, por lo que no contiene columnas
reales exportadas desde SharePoint. Esta referencia se deriva de:

- `CanvasApps/mapc_fdi_412ec_DocumentUri.msapp` desempacado en los commits recientes.
- Mapas de proceso en `docs/FDI_Selectivo_Process_Map.md` y `docs/sistemas/*.md`.
- Patches actuales de `scrFDI`.

## Regla de tipos

La app guarda la captura en colecciones draft locales. Los campos capturados con
`cmpCardTxt` o `TextInput` se guardan como texto, aunque representen numeros.
Para crear listas sin cambiar la app, usar `Texto una linea` en esos campos es
lo mas compatible. Si se crean como `Numero`, hay que ajustar el Patch final para
convertir con `Value(...)`.

| Tipo usado en este documento | Tipo SharePoint recomendado | Nota |
| --- | --- | --- |
| Texto | Una linea de texto | Valores cortos, folios, opciones guardadas como texto. |
| Texto multilinea | Varias lineas de texto, texto sin formato, sin append | Payload JSON, comentarios y resumenes. |
| Booleano | Si/No | Toggles y banderas. |
| Opcion | Choice | Usar cuando el conjunto de valores esta controlado. |
| Lookup | Lookup | Relacion a otra lista. |
| Numero compatible | Una linea de texto | Recomendado mientras la app guarde textos. Puede migrarse a Numero con conversion en Patch. |

## Catalogo de listas

| Sistema | TipoKey | Lista SharePoint | Estado actual en repo | Contenedor UI | Draft local | Colecciones locales repetibles |
| --- | --- | --- | --- | --- | --- | --- |
| Selectivo | `SEL` | `Sistema selectivo` | Referenciada y persistida | `cntSEL` | `colSEL_Draft` | `colListadoTarimas`, `colListadoPiezas`, `colElementoSeguridad`, `colPiezasEspeciales`, `colProveedoresExternos`, `colListadoColores` |
| Dinamico | `DIN` | `Sistema Dinamico` / `Sistema Dinámico` | Requerida, no referenciada como datasource | `cntDIN` | `colDIN_Draft` | `colListadoTarimas`, compartidas comunes |
| Pushback | `PBK` | `Sistema Pushback` | Requerida, no referenciada como datasource | `cntPBK` | `colPBK_Draft` | `colListadoTarimas`, compartidas comunes |
| Drive In | `DRV` | `Sistema Drive In` | Requerida, no referenciada como datasource | `cntDRV` | `colDRV_Draft` | `colListadoTarimas`, compartidas comunes |
| Cantilever | `CAN` | `Sistema Cantiléver` | Requerida, no referenciada como datasource | `cntCAN` | `colCAN_Draft` | Compartidas comunes |
| Mezzanine | `MEZ` | `Sistema Mezzanine` | Requerida, no referenciada como datasource | `cntMEZ` | `colMEZ_Draft` | `colMEZ_Productos`, compartidas comunes |
| Carton Flow | `CFL` | `Sistema Carton Flow` | Requerida, no referenciada como datasource | `cntCFL` | `colCFL_Draft` | `colCFL_Productos`, compartidas comunes |
| Mezzanine Limpio | `MZL` | `Sistema Mezzanine Limpio` | Requerida, no referenciada como datasource | `cntMZL` | `colMZL_Draft` | `colMZL_Productos`, `colListadoTarimas`, compartidas comunes |
| Otro | `OT` | `Sistema Otro` | Referenciada y persistida | `cntOT` | `colOT_Draft` | N/A |

## Listas base

### `Sistemas por cotización`

Lista puente obligatoria para todos los sistemas.

| Columna | Tipo SharePoint | Requerida | Fuente app | Observaciones |
| --- | --- | --- | --- | --- |
| `Title` | Texto | Si | `t.TipoNombre` | Nombre del tipo de sistema, por ejemplo `Selectivo`. |
| `Nombre` | Texto | Si | `t.NombreSistema` | Nombre de tab, por ejemplo `Selectivo 1`. |
| `SistemaID` | Numero | Si | `t.SistemaId` | ID local de tab. |
| `CotizaciónID` | Lookup a `Cotizaciones 2026` | Si | `varCotizacionFinal.ID` | Relacion con cotizacion. |
| `Folio` | Texto | Si | `varCotizacionFinal.Folio` | Trazabilidad. |

### `Sistema selectivo`

Lista de detalle actualmente persistida por `scrFDI`.

| Columna | Tipo SharePoint recomendado | Fuente app | Observaciones |
| --- | --- | --- | --- |
| `CotizaciónID` | Lookup a `Cotizaciones 2026` | `varCotizacionFinal.ID` | Requerida. |
| `SistemasID` | Lookup a `Sistemas por cotización` | `_puente.PuenteID` | Requerida. |
| `Folio` | Texto | Folio de cotizacion | Requerida. |
| `Title` | Texto | `s.NombreSistema` | Nombre del sistema/tab. |
| `Tipo de diseño` | Opcion | `s.TipoDiseño` | Valores: `Diseño`, `Listado de piezas`, `Planos/diseño de cliente`, `Pedido o cotización anterior`. |
| `PayloadSistemaJson` | Texto multilinea | JSON completo | Campo clave para reconstruir tablas y campos sin columna directa. |
| `Proveedores externos` | Booleano | `s.ProvExternos` | Indicador comun. |
| `Pasillo máximo` | Numero compatible | `s.PasilloMax` | Capturado como texto. |
| `Pasillo mínimo` | Numero compatible | `s.PasilloMin` | Capturado como texto. |
| `Ancho disponible` | Numero compatible | `s.AnchoDisp` | Capturado como texto. |
| `Largo disponible` | Numero compatible | `s.LargoDisp` | Capturado como texto. |
| `Configuración de niveles` | Opcion | `s.ConfNiv` | Puede quedar en blanco. |
| `Altura crítica de montacargas` | Numero compatible | `s.AltCritMonta` | Solo si se considera altura de montacargas. |
| `Altura crítica de niveles` | Texto | Resumen max/min nave | Ejemplo: `Máx 8 / Mín 6`. |
| `Definido por el cliente` | Texto multilinea | Comentarios cliente | Solo si el toggle esta activo. |
| `Elementos de seguridad` | Texto multilinea | Resumen de `colElementoSeguridad` | Detalle tambien va en payload. |
| `Piezas de usuario` | Texto multilinea | Resumen de `colListadoPiezas` | Detalle tambien va en payload. |
| `Número de pedido o cotización` | Texto | Folio cotizacion/pedido anterior | Resumen de referencia. |
| `Galvanizado` | Booleano | `s.GalvList` | Derivado de acabado. |
| `Tipo de galvanizado` | Opcion | `s.TipoGalv` | Valores actuales normalizados: `Frio`, `Caliente`, `Pregalvanizado`. |
| `Precio por kilogramo galvanizado` | Numero compatible | `s.PpkgGalv` | Solo frio/caliente. |
| `Instalación` | Booleano | `s.Ins` | Indicador comun. |
| `Memoria de cálculo` | Booleano | `s.MemCalc` | Indicador comun. |
| `Unirse a estructura de otro proveedor` | Booleano | `s.EstProv` | Indicador comun. |
| `Consideraciones especiales` | Texto multilinea | `s.ConsEsp` | Comentarios generales. |

### `Sistema Otro`

Lista de detalle actualmente persistida por `scrFDI`.

| Columna | Tipo SharePoint recomendado | Fuente app | Observaciones |
| --- | --- | --- | --- |
| `CotizaciónID` | Lookup a `Cotizaciones 2026` | `varCotizacionFinal.ID` | Requerida. |
| `SistemaID` | Lookup a `Sistemas por cotización` | `_puente.PuenteID` | En esta lista el nombre usado por la app es singular. |
| `Folio` | Texto | Folio de cotizacion | Requerida. |
| `Title` | Texto | `s.NombreSistema` | Nombre del sistema/tab. |
| `HTML` | Texto multilinea | `s.HTMLCol` | Contenido del editor HTML. |

## Columnas comunes para listas de detalle pendientes

Usar esta base para `Sistema Dinamico`, `Sistema Pushback`, `Sistema Drive In`,
`Sistema Cantiléver`, `Sistema Mezzanine`, `Sistema Carton Flow` y
`Sistema Mezzanine Limpio` si se decide crear persistencia de detalle.

| Columna | Tipo SharePoint recomendado | Sistemas | Observaciones |
| --- | --- | --- | --- |
| `CotizaciónID` | Lookup a `Cotizaciones 2026` | Todos | Relaciona el detalle con la cotizacion. |
| `SistemasID` | Lookup a `Sistemas por cotización` | Todos | Relaciona el detalle con el registro puente. |
| `Folio` | Texto | Todos | Trazabilidad. |
| `Title` | Texto | Todos | Nombre del sistema/tab. |
| `PayloadSistemaJson` | Texto multilinea | Todos | Campo obligatorio recomendado para no perder tablas ni campos propios. |
| `Tipo de diseño` | Opcion o Texto | Todos | Metodo de captura normalizado. |
| `Piezas de usuario` | Texto multilinea | Todos | Resumen de `colListadoPiezas`. |
| `Elementos de seguridad` | Texto multilinea | Todos | Resumen de `colElementoSeguridad`. |
| `Número de pedido o cotización` | Texto | Todos | Resumen de referencia anterior. |
| `Proveedores externos` | Booleano | Todos | Indicador comun. |
| `Pasillo máximo` | Numero compatible | `DIN`, `PBK`, `DRV`, `CAN` | No aplica a `MEZ`, `CFL`, `MZL`. |
| `Pasillo mínimo` | Numero compatible | `DIN`, `PBK`, `DRV`, `CAN` | No aplica a `MEZ`, `CFL`, `MZL`. |
| `Ancho disponible` | Numero compatible | Todos | Area disponible. |
| `Largo disponible` | Numero compatible | Todos | Area disponible. |
| `Altura crítica de montacargas` | Numero compatible | `DIN`, `PBK`, `DRV`, `CAN` | No aplica a `MEZ`, `CFL`, `MZL`. |
| `Altura crítica de niveles` | Texto | Todos | Resumen de altura de nave o niveles. |
| `Definido por el cliente` | Texto multilinea | Todos | Comentarios de configuracion del cliente. |
| `Galvanizado` | Booleano | Todos | Derivado de acabado. |
| `Tipo de galvanizado` | Opcion o Texto | Todos | Derivado de acabado. |
| `Precio por kilogramo galvanizado` | Numero compatible | Todos | Solo frio/caliente. |
| `Instalación` | Booleano | Todos | Indicador comun. |
| `Memoria de cálculo` | Booleano | Todos | Indicador comun. |
| `Unirse a estructura de otro proveedor` | Booleano | Todos | Indicador comun. |
| `Consideraciones especiales` | Texto multilinea | Todos | Comentarios generales. |

## Campos propios por sistema

Estos campos pueden vivir solo dentro de `PayloadSistemaJson`. Crear columnas
planas para ellos es opcional y requiere ajustar el Patch final.

## Patron de componentes en `scrFDI`

| Bloque UI | Componentes/controles usados | Sistemas | Persistencia local |
| --- | --- | --- | --- |
| Tab de sistema | `cntSEL`, `cntDIN`, `cntPBK`, `cntDRV`, `cntCAN`, `cntMEZ`, `cntCFL`, `cntMZL`, `cntOT` | Todos | Visibilidad por `locTabSel.TipoKey`. |
| Metodo de captura | `cmpCarddrpTipoCotización*` (`cmpCarddrp`) | Todos excepto `OT` | Campo `MetodoCaptura` y `TipoDiseño` en `col*_Draft`. |
| Campos de texto | `cmpCardTxt`, `Classic/TextInput` en galerias | Todos | Texto en `col*_Draft` o coleccion repetible. |
| Decisiones | `cmpCardTgl`, `Toggle@1.1.5` en galerias | Todos excepto `OT` | Booleanos en `col*_Draft` o renglon repetible. |
| Tablas repetibles | `Gallery@2.15.0` + inputs por renglon | Sistemas con tablas | `colListadoPiezas`, `colListadoTarimas`, `colElementoSeguridad`, `colPiezasEspeciales`, `colProveedoresExternos`, `colListadoColores`, `colMEZ_Productos`, `colCFL_Productos`, `colMZL_Productos`. |
| Editor libre | PCF `fdi_FDI.HtmlEditor` | `OT` | `colOT_Draft.HTMLCol`, lista `Sistema Otro`. |

### Selectivo (`SEL`)

| Campo payload / local | Tipo recomendado | Coleccion | Observaciones |
| --- | --- | --- | --- |
| `Tarimas[].Tipo` | Texto | `colListadoTarimas` | Tipo de tarima si aplica. |
| `Tarimas[].Peso` | Numero compatible | `colListadoTarimas` | Capturado como texto. |
| `Tarimas[].Alto` | Numero compatible | `colListadoTarimas` | Capturado como texto. |
| `Tarimas[].Frente` | Numero compatible | `colListadoTarimas` | Capturado como texto. |
| `Tarimas[].Fondo` | Numero compatible | `colListadoTarimas` | Capturado como texto. |
| `Tarimas[].HuellaTarima` | Texto | `colListadoTarimas` | Texto libre. |
| `Tarimas[].Excedente` | Booleano | `colListadoTarimas` | Toggle por renglon. |
| `Tarimas[].ExcedenteFrente` | Numero compatible | `colListadoTarimas` | Visible si excedente. |
| `Tarimas[].ExcedenteFondo` | Numero compatible | `colListadoTarimas` | Visible si excedente. |
| `ConsiderarAlturaMaxMonta` | Booleano | `colSEL_Draft` | Criterio de niveles. |
| `ConsiderarAlturaNave` | Booleano | `colSEL_Draft` | Criterio de niveles. |
| `AdjuntarImagenLayout` | Booleano | `colSEL_Draft` | Adjuntos viven en `Cotizaciones 2026`. |
| `ExisteDefCliente` | Booleano | `colSEL_Draft` | Habilita comentarios. |

### Dinamico (`DIN`) y Pushback (`PBK`)

| Campo payload / local | Tipo recomendado | Coleccion | Observaciones |
| --- | --- | --- | --- |
| `FrentesBuscados` | Numero compatible | `colDIN_Draft` / `colPBK_Draft` | Configuracion del rack. |
| `FondosBuscados` | Numero compatible | `colDIN_Draft` / `colPBK_Draft` | Configuracion del rack. |
| `NivelesBuscados` | Numero compatible | `colDIN_Draft` / `colPBK_Draft` | Configuracion del rack. |
| `TipoRodamiento` | Opcion | `colDIN_Draft` / `colPBK_Draft` | `Rodillo 2.5`, `Rodillo 1.9`, `Rodillo 2.5 fácil limpieza`, `Rodillo 1.9 fácil limpieza`, `Llantas`, `Por cálculo`. |
| `MetodoCalculoEntrecentros` | Opcion | `colDIN_Draft` / `colPBK_Draft` | `Manual`, `Por cálculo`. |
| `EntrecentrosManual` | Numero compatible | `colDIN_Draft` / `colPBK_Draft` | Solo si metodo manual. |
| `UtilizarRodamientoAltoImpacto` | Booleano | `colDIN_Draft` / `colPBK_Draft` | Toggle. |
| `EspecificacionRodamientoAltoImpacto` | Texto multilinea | `colDIN_Draft` / `colPBK_Draft` | Visible si toggle activo. |
| `Tarimas[]` | Ver campos de Selectivo | `colListadoTarimas` | Misma tabla compartida. |

### Drive In (`DRV`)

| Campo payload / local | Tipo recomendado | Coleccion | Observaciones |
| --- | --- | --- | --- |
| `FrentesBuscados` | Numero compatible | `colDRV_Draft` | Configuracion del rack. |
| `FondosBuscados` | Numero compatible | `colDRV_Draft` | Configuracion del rack. |
| `NivelesBuscados` | Numero compatible | `colDRV_Draft` | Configuracion del rack. |
| `TipoCapturaMontacargas` | Opcion | `colDRV_Draft` | `Medidas`, `Modelo`. |
| `AlturaCabinaMontacargas` | Numero compatible | `colDRV_Draft` | Visible si tipo captura = `Medidas`. |
| `AnchoTotalMontacargas` | Numero compatible | `colDRV_Draft` | Visible si tipo captura = `Medidas`. |
| `AnchoMastilMontacargas` | Numero compatible | `colDRV_Draft` | Visible si tipo captura = `Medidas`. |
| `ModeloMontacargas` | Texto | `colDRV_Draft` | Visible si tipo captura = `Modelo`. |
| `Tarimas[]` | Ver campos de Selectivo | `colListadoTarimas` | Misma tabla compartida. |

### Cantilever (`CAN`)

| Campo payload / local | Tipo recomendado | Coleccion | Observaciones |
| --- | --- | --- | --- |
| `TipoProducto` | Texto | `colCAN_Draft` | Texto abierto. |
| `LongitudCarga` | Numero compatible | `colCAN_Draft` | Capturado como texto. |
| `SeccionCarga` | Numero compatible | `colCAN_Draft` | Seccion, diametro o ancho. |
| `PesoCarga` | Numero compatible | `colCAN_Draft` | Peso por pieza o nivel. |
| `CantidadPorNivel` | Numero compatible | `colCAN_Draft` | Por nivel de brazos. |
| `TipoGondola` | Opcion | `colCAN_Draft` | `Góndola sencilla`, `Góndola doble`. |

### Mezzanine (`MEZ`)

| Campo payload / local | Tipo recomendado | Coleccion | Observaciones |
| --- | --- | --- | --- |
| `Productos[].TipoProducto` | Texto | `colMEZ_Productos` | Tabla de productos. |
| `Productos[].LargoProducto` | Numero compatible | `colMEZ_Productos` | Capturado como texto. |
| `Productos[].AnchoProducto` | Numero compatible | `colMEZ_Productos` | Capturado como texto. |
| `Productos[].AltoProducto` | Numero compatible | `colMEZ_Productos` | Capturado como texto. |
| `Productos[].PesoProducto` | Numero compatible | `colMEZ_Productos` | Capturado como texto. |
| `Productos[].CantidadPorNivel` | Numero compatible | `colMEZ_Productos` | Capturado como texto. |
| `AlturaRecomendadaEntrepiso` | Numero compatible | `colMEZ_Draft` | Valor default actual `2.4`. |
| `CantidadEntrepisos` | Numero compatible | `colMEZ_Draft` | Capturado como texto. |
| `RequiereElevador` | Booleano | `colMEZ_Draft` | Toggle. |
| `ElevadorSpec` | Texto multilinea | `colMEZ_Draft` | Visible si requiere elevador. |
| `TipoPiso` | Opcion | `colMEZ_Draft` | `Rejilla Irving`, `MDF`. |
| `UsaCarrito` | Booleano | `colMEZ_Draft` | Toggle. |
| `MedidasCarrito` | Texto | `colMEZ_Draft` | Visible si usa carrito. |
| `NumeroRuedas` | Numero compatible | `colMEZ_Draft` | Visible si usa carrito. |
| `TipoRueda` | Texto | `colMEZ_Draft` | Visible si usa carrito. |
| `MedidaRueda` | Texto | `colMEZ_Draft` | Visible si usa carrito. |
| `PesoCarrito` | Numero compatible | `colMEZ_Draft` | Visible si usa carrito. |
| `RequiereEscaleras` | Booleano | `colMEZ_Draft` | Toggle. |
| `AnchoPasilloPickeo` | Numero compatible | `colMEZ_Draft` | Sin columna directa comun. |

### Carton Flow (`CFL`)

| Campo payload / local | Tipo recomendado | Coleccion | Observaciones |
| --- | --- | --- | --- |
| `Productos[].TipoProducto` | Texto | `colCFL_Productos` | Tabla de productos. |
| `Productos[].LargoProducto` | Numero compatible | `colCFL_Productos` | Capturado como texto. |
| `Productos[].AnchoProducto` | Numero compatible | `colCFL_Productos` | Capturado como texto. |
| `Productos[].AltoProducto` | Numero compatible | `colCFL_Productos` | Capturado como texto. |
| `Productos[].PesoProducto` | Numero compatible | `colCFL_Productos` | Capturado como texto. |
| `Productos[].CantidadPorNivel` | Numero compatible | `colCFL_Productos` | Capturado como texto. |
| `FrentesBuscados` | Numero compatible | `colCFL_Draft` | Configuracion del rack. |
| `FondosBuscados` | Numero compatible | `colCFL_Draft` | Configuracion del rack. |
| `NivelesBuscados` | Numero compatible | `colCFL_Draft` | Configuracion del rack. |
| `TipoRodamiento` | Opcion | `colCFL_Draft` | `Rodillo de 3/4`, `Rodajas`. |
| `MetodoCalculoEntrecentros` | Opcion | `colCFL_Draft` | `Manual`, `Por cálculo`. |
| `EntrecentrosManual` | Numero compatible | `colCFL_Draft` | Solo si metodo manual. |
| `AnchoPasilloPickeo` | Numero compatible | `colCFL_Draft` | Sin columna directa comun. |

### Mezzanine Limpio (`MZL`)

| Campo payload / local | Tipo recomendado | Coleccion | Observaciones |
| --- | --- | --- | --- |
| `CantidadPisos` | Numero compatible | `colMZL_Draft` | Capturado como texto. |
| `CargaPorM2` | Numero compatible | `colMZL_Draft` | Capturado como texto. |
| `EsModulado` | Booleano | `colMZL_Draft` | Si es true muestra zona/productos. |
| `ZonaModulada` | Texto multilinea | `colMZL_Draft` | Visible si modulado. |
| `UsaTarimas` | Booleano | `colMZL_Draft` | Si es true muestra tabla de tarimas. |
| `RequiereElevador` | Booleano | `colMZL_Draft` | Toggle. |
| `ElevadorSpec` | Texto multilinea | `colMZL_Draft` | Visible si requiere elevador. |
| `TipoPiso` | Opcion | `colMZL_Draft` | `Rejilla Irving`, `MDF`. |
| `UsaCarrito` | Booleano | `colMZL_Draft` | Toggle. |
| `MedidasCarrito` | Texto | `colMZL_Draft` | Visible si usa carrito. |
| `NumeroRuedas` | Numero compatible | `colMZL_Draft` | Visible si usa carrito. |
| `TipoRueda` | Texto | `colMZL_Draft` | Visible si usa carrito. |
| `MedidaRueda` | Texto | `colMZL_Draft` | Visible si usa carrito. |
| `PesoCarrito` | Numero compatible | `colMZL_Draft` | Visible si usa carrito. |
| `RequiereEscaleras` | Booleano | `colMZL_Draft` | Toggle. |
| `MetodoSeparacionColumnas` | Opcion | `colMZL_Draft` | `Manual`, `Por cálculo`. |
| `SeparacionColumnasManual` | Numero compatible | `colMZL_Draft` | Visible si separacion manual. |
| `Productos[]` | Ver campos de Mezzanine | `colMZL_Productos` | Visible si `EsModulado`. |
| `Tarimas[]` | Ver campos de Selectivo | `colListadoTarimas` | Visible si `UsaTarimas`. |
| `AnchoPasilloPickeo` | Numero compatible | `colMZL_Draft` | Sin columna directa comun. |

## Colecciones compartidas

| Coleccion | Campos | Tipo recomendado | Uso |
| --- | --- | --- | --- |
| `colListadoPiezas` | `RowId`, `SistemaId`, `Pieza`, `Comentarios` | GUID, Numero, Texto, Texto multilinea | Listado de piezas por sistema. |
| `colListadoTarimas` | `RowId`, `SistemaId`, `Tipo`, `Peso`, `Alto`, `Frente`, `Fondo`, `HuellaTarima`, `Excedente`, `ExcedenteFrente`, `ExcedenteFondo` | GUID, Numero, Texto, Numero compatible, Booleano | Tarimas por sistema. |
| `colElementoSeguridad` | `RowId`, `SistemaId`, `Pieza`, `Comentario` | GUID, Numero, Texto, Texto multilinea | Elementos de seguridad. |
| `colPiezasEspeciales` | `RowId`, `SistemaId`, `Pieza`, `Comentario` | GUID, Numero, Texto, Texto multilinea | Piezas especiales. |
| `colProveedoresExternos` | `RowId`, `SistemaId`, `Proveedor`, `Alcance` | GUID, Numero, Texto, Texto multilinea | Proveedores externos. |
| `colListadoColores` | `RowId`, `SistemaId`, `Pieza`, `Color` | GUID, Numero, Texto, Texto | Colores por pieza. `Color` viene del catalogo local `colColores`. |

## Recomendacion de carga inicial

1. Mantener `PayloadSistemaJson` en todas las listas de detalle nuevas.
2. Crear primero `Sistemas por cotización`; todas las listas de detalle dependen de ella.
3. Crear las listas pendientes con las columnas comunes de este documento.
4. No crear columnas propias antes de confirmar si se quieren fuera del payload.
5. Si se elige tipo `Numero` para medidas/costos, planear cambio en Power Apps para convertir strings con `Value(...)` en el Patch final.
6. Despues de crear una lista nueva, agregar el datasource en Power Apps Studio y luego implementar el Patch final correspondiente. No editar el `.msapp` a mano para conectar fuentes nuevas.
