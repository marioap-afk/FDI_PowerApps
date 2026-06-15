# FDI SharePoint system lists and fields

Referencia para crear o completar las listas SharePoint usadas por la captura de
sistemas en `scrFDI`.

Estado de fuente: el inventario `docs/sharepoint/sharepoint-schema.json` esta en
estado `pending-pnp-powershell-not-installed`, por lo que este documento no es
una exportacion de SharePoint. La referencia se deriva de:

- `CanvasApps/mapc_fdi_412ec_DocumentUri.msapp` desempacado en los commits recientes.
- Mapas de proceso en `docs/FDI_Selectivo_Process_Map.md` y `docs/sistemas/*.md`.
- Patches actuales de `scrFDI`.
- Decision de arquitectura: las tablas repetibles se guardan en listas hijas
  normalizadas y compartidas entre sistemas, no en un payload JSON principal.

## Modelo de datos

El modelo final recomendado queda en tres niveles:

| Nivel | Lista | Proposito |
| --- | --- | --- |
| Padre | `Cotizaciones` | Registro maestro de la cotizacion. |
| Puente | `Sistemas por cotización` | Una fila por sistema agregado a la cotizacion. Permite tener dos o mas sistemas del mismo tipo. |
| Detalle | `Sistema <Tipo>` | Una fila por sistema con campos escalares del formulario. |
| Tablas hijas | `Sistema Tarimas`, `Sistema Productos`, etc. | Una fila por renglon capturado en tablas repetibles. Son listas compartidas por todos los sistemas que usen esa tabla. |

`PayloadSistemaJson` ya no debe ser el almacenamiento principal. Si se conserva,
debe ser solo auditoria, compatibilidad temporal o diagnostico. La app debe
guardar columnas escalares y tablas hijas en listas normalizadas al hacer el
guardado final.

## Regla de tipos

La app captura en colecciones draft locales. Muchos valores numericos se guardan
como texto en el draft. Para crear listas sin cambiar inmediatamente los Patch de
la app, usar `Texto una linea` en esos campos es lo mas compatible. Si se crean
como `Numero`, el Patch final debe convertir con `Value(...)` y manejar blancos.

| Tipo usado aqui | Tipo SharePoint recomendado | Nota |
| --- | --- | --- |
| Texto | Una linea de texto | Valores cortos, folios, nombres, opciones guardadas como texto. |
| Texto multilinea | Varias lineas de texto, texto sin formato, sin append | Comentarios, HTML, auditoria JSON opcional. |
| Booleano | Si/No | Toggles y decisiones del flujo. |
| Opcion | Choice | Usar cuando el conjunto de valores esta controlado. |
| Lookup | Lookup | Relacion a otra lista. |
| Numero | Numero | Usar solo si el Patch convierte con `Value(...)`. |
| Numero compatible | Una linea de texto | Recomendado mientras el draft guarde texto. Puede migrarse a `Numero` despues. |

## Listado de listas requeridas

| Lista SharePoint | Tipo | Requerida | Usada por | Observaciones |
| --- | --- | --- | --- | --- |
| `Cotizaciones` | Padre | Si | Todos | Ya existe. No se redefine aqui. |
| `Sistemas por cotización` | Puente | Si | Todos | Ya existe. Debe ser la ancla de cada sistema por cotizacion. |
| `Sistema selectivo` | Detalle | Si | `SEL` | Ya se referencia en la app actual. |
| `Sistema Dinámico` | Detalle | Si | `DIN` | Requerida para persistir Dinamico fuera del draft. |
| `Sistema Pushback` | Detalle | Si | `PBK` | Requerida para persistir Pushback fuera del draft. |
| `Sistema Drive In` | Detalle | Si | `DRV` | Requerida para persistir Drive In fuera del draft. |
| `Sistema Cantiléver` | Detalle | Si | `CAN` | Requerida para persistir Cantilever fuera del draft. |
| `Sistema Mezzanine` | Detalle | Si | `MEZ` | Requerida para persistir Mezzanine fuera del draft. |
| `Sistema Carton Flow` | Detalle | Si | `CFL` | Requerida para persistir Carton Flow fuera del draft. |
| `Sistema Mezzanine Limpio` | Detalle | Si | `MZL` | Requerida para persistir Mezzanine Limpio fuera del draft. |
| `Sistema Otro` | Detalle | Si | `OT` | Ya se referencia en la app actual. |
| `Sistema Tarimas` | Tabla hija | Si | `SEL`, `DIN`, `PBK`, `DRV`, `MZL` | Una fila por tarima. Lista compartida. |
| `Sistema Productos` | Tabla hija | Si | `MEZ`, `CFL`, `MZL` | Una fila por producto. Lista compartida. |
| `Sistema Colores` | Tabla hija | Si | Todos los sistemas con colores | Una fila por pieza/color. Lista compartida. |
| `Sistema Elementos Seguridad` | Tabla hija | Si | Sistemas con elementos de seguridad | Una fila por elemento. Lista compartida. |
| `Sistema Piezas Especiales` | Tabla hija | Si | Sistemas con piezas especiales | Una fila por pieza especial. Lista compartida. |
| `Sistema Proveedores Externos` | Tabla hija | Si | Sistemas con proveedores externos | Una fila por proveedor/alcance. Lista compartida. |
| `Sistema Listado Piezas` | Tabla hija | Si | Sistemas con listado de piezas | Una fila por pieza solicitada. Lista compartida. |

## Columnas de relacion obligatorias

Estas columnas deben existir en todas las listas de detalle `Sistema <Tipo>` y
en todas las listas hijas compartidas.

| Columna | Tipo SharePoint | Requerida | Indexar | Observaciones |
| --- | --- | --- | --- | --- |
| `CotizaciónID` | Lookup a `Cotizaciones` | Si | Si | Relacion directa con la cotizacion. |
| `SistemaCotizaciónID` | Lookup a `Sistemas por cotización` | Si | Si | Relacion con la instancia exacta del sistema. Es clave cuando hay dos sistemas del mismo tipo. |
| `Folio` | Texto | Si | Si | Copia del folio para busqueda y soporte. |
| `TipoKey` | Texto | Si | Si | `SEL`, `DIN`, `PBK`, `DRV`, `CAN`, `MEZ`, `CFL`, `MZL`, `OT`. |
| `NombreSistema` | Texto | Si | No | Nombre visible del tab, por ejemplo `Selectivo 1`. |

Nota de compatibilidad: la app actual usa nombres existentes como `SistemasID`
en `Sistema selectivo` y `SistemaID` en `Sistema Otro`. Para un esquema nuevo,
usar `SistemaCotizaciónID`. Si se mantiene el nombre anterior, documentar el
alias y ajustar los Patch para que no apunten a columnas inexistentes.

## Campos comunes de detalle

Estos campos aplican a la mayoria de listas `Sistema <Tipo>`. No todos los
sistemas usan todos los campos; cada lista debe incluir solo los que su flujo
requiere.

| Columna | Tipo SharePoint recomendado | Observaciones |
| --- | --- | --- |
| `Title` | Texto | Puede duplicar `NombreSistema` por compatibilidad SharePoint. |
| `Tipo de diseño` | Opcion | Valores: `Diseño`, `Listado de piezas`, `Planos/diseño de cliente`, `Pedido o cotización anterior`. |
| `Ancho disponible` | Numero compatible | Area disponible. |
| `Largo disponible` | Numero compatible | Area disponible. |
| `Pasillo máximo` | Numero compatible | No aplica a todos los sistemas. |
| `Pasillo mínimo` | Numero compatible | No aplica a todos los sistemas. |
| `Ancho pasillo pickeo` | Numero compatible | Aplica a sistemas con pickeo o flujo de producto. |
| `Altura crítica de montacargas` | Numero compatible | Solo cuando el flujo evalua montacargas. |
| `Altura crítica de niveles` | Texto | Resumen de alturas max/min o condicion equivalente. |
| `Definido por el cliente` | Texto multilinea | Comentarios o descripcion de definicion del cliente. |
| `Número de pedido o cotización` | Texto | Referencia de pedido/cotizacion anterior. |
| `Requiere adjuntar layout` | Booleano | Indicador de layout o imagen requerida. |
| `Existe definición cliente` | Booleano | Toggle que habilita comentarios de definicion. |
| `Acabado` | Opcion | Campo capturado. Valores: `Pintado`, `Galvanizado en frío`, `Galvanizado en caliente`, `Pregalvanizado`. Es la unica pregunta de acabado. |
| `Galvanizado` | Booleano | Derivado opcional para compatibilidad/reportes. No se captura en UI. `true` para cualquier acabado galvanizado y `false` para `Pintado`. |
| `Tipo de galvanizado` | Opcion | Derivado opcional para compatibilidad/reportes. No se captura en UI. Vacio para `Pintado`; `Frio`, `Caliente` o `Pregalvanizado` segun `Acabado`. |
| `Precio por kilogramo galvanizado` | Numero compatible | Capturable solo si `Acabado` es `Galvanizado en frío` o `Galvanizado en caliente`; no aplica a `Pintado` ni `Pregalvanizado`. |
| `Instalación` | Booleano | Requiere instalacion. |
| `Costo instalación` | Numero compatible | Costo o importe de instalacion si aplica. |
| `Comentarios instalación` | Texto multilinea | Detalle de instalacion. |
| `Memoria de cálculo` | Booleano | Requiere memoria de calculo. |
| `Costo memoria cálculo` | Numero compatible | Costo de memoria si aplica. |
| `Unirse a estructura de otro proveedor` | Booleano | Indicador de union a estructura existente. |
| `Comentarios estructura` | Texto multilinea | Detalle de estructura de otro proveedor. |
| `Proveedores externos` | Booleano | Indica si hay proveedores externos en tabla hija. |
| `Consideraciones especiales` | Texto multilinea | Comentarios generales. |
| `PayloadSistemaJson` | Texto multilinea | Opcional, solo auditoria o respaldo temporal. No usar como fuente principal. |

Regla de acabado: la UI debe mostrar un solo selector `Acabado`. Si una lista
nueva no necesita los campos derivados para compatibilidad, reportes o integracion
con Excel, puede omitir `Galvanizado` y `Tipo de galvanizado` y derivarlos al
consultar desde el valor de `Acabado`.

## Listas de detalle por sistema

Cada lista de detalle incluye las columnas de relacion obligatorias y las
columnas comunes que correspondan al flujo. Las tablas repetibles no van aqui:
se guardan en las listas hijas compartidas.

### `Sistemas por cotización`

| Columna | Tipo SharePoint | Requerida | Observaciones |
| --- | --- | --- | --- |
| `Title` | Texto | Si | Nombre del tipo de sistema, por ejemplo `Selectivo`. |
| `Nombre` | Texto | Si | Nombre de tab, por ejemplo `Selectivo 1`. |
| `SistemaID` | Numero | Si | ID local usado por la app para distinguir tabs. |
| `TipoKey` | Texto | Si | Clave normalizada del sistema. Recomendado aunque no exista aun. |
| `CotizaciónID` | Lookup a `Cotizaciones` | Si | Relacion con cotizacion. Indexar. |
| `Folio` | Texto | Si | Trazabilidad. Indexar. |

### `Sistema selectivo`

| Columna | Tipo SharePoint recomendado | Observaciones |
| --- | --- | --- |
| Columnas de relacion obligatorias | Ver seccion anterior | En lista existente puede llamarse `SistemasID` en vez de `SistemaCotizaciónID`. |
| Campos comunes de detalle | Ver seccion anterior | Incluir los campos aplicables. |
| `Configuración de niveles` | Opcion | Metodo o criterio de niveles si aplica. |
| `Considerar altura máxima montacargas` | Booleano | Decision del flujo. |
| `Considerar altura nave` | Booleano | Decision del flujo. |
| `Altura máxima nave` | Numero compatible | Visible si se considera altura de nave. |
| `Altura mínima nave` | Numero compatible | Visible si se considera altura de nave. |
| `Comentarios configuración cliente` | Texto multilinea | Visible si existe definicion del cliente. |

### `Sistema Dinámico`

| Columna | Tipo SharePoint recomendado | Observaciones |
| --- | --- | --- |
| Columnas de relacion obligatorias | Ver seccion anterior | Requeridas. |
| Campos comunes de detalle | Ver seccion anterior | Incluir los campos aplicables. |
| `Frentes buscados` | Numero compatible | Configuracion del rack. |
| `Fondos buscados` | Numero compatible | Configuracion del rack. |
| `Niveles buscados` | Numero compatible | Configuracion del rack. |
| `Tipo rodamiento` | Opcion | Valores actuales: `Rodillo 2.5`, `Rodillo 1.9`, `Rodillo 2.5 fácil limpieza`, `Rodillo 1.9 fácil limpieza`, `Llantas`, `Por cálculo`. |
| `Método cálculo entrecentros` | Opcion | `Manual` o `Por cálculo`. |
| `Entrecentros manual` | Numero compatible | Visible si metodo manual. |
| `Utilizar rodamiento alto impacto` | Booleano | Decision del flujo. |
| `Especificación rodamiento alto impacto` | Texto multilinea | Visible si el toggle esta activo. |

### `Sistema Pushback`

| Columna | Tipo SharePoint recomendado | Observaciones |
| --- | --- | --- |
| Columnas de relacion obligatorias | Ver seccion anterior | Requeridas. |
| Campos comunes de detalle | Ver seccion anterior | Incluir los campos aplicables. |
| `Frentes buscados` | Numero compatible | Configuracion del rack. |
| `Fondos buscados` | Numero compatible | Configuracion del rack. |
| `Niveles buscados` | Numero compatible | Configuracion del rack. |
| `Tipo rodamiento` | Opcion | Valores equivalentes a Dinamico cuando aplique. |
| `Método cálculo entrecentros` | Opcion | `Manual` o `Por cálculo`. |
| `Entrecentros manual` | Numero compatible | Visible si metodo manual. |
| `Utilizar rodamiento alto impacto` | Booleano | Decision del flujo. |
| `Especificación rodamiento alto impacto` | Texto multilinea | Visible si el toggle esta activo. |

### `Sistema Drive In`

| Columna | Tipo SharePoint recomendado | Observaciones |
| --- | --- | --- |
| Columnas de relacion obligatorias | Ver seccion anterior | Requeridas. |
| Campos comunes de detalle | Ver seccion anterior | Incluir los campos aplicables. |
| `Frentes buscados` | Numero compatible | Configuracion del rack. |
| `Fondos buscados` | Numero compatible | Configuracion del rack. |
| `Niveles buscados` | Numero compatible | Configuracion del rack. |
| `Tipo captura montacargas` | Opcion | `Medidas` o `Modelo`. |
| `Altura cabina montacargas` | Numero compatible | Visible si tipo captura = `Medidas`. |
| `Ancho total montacargas` | Numero compatible | Visible si tipo captura = `Medidas`. |
| `Ancho mástil montacargas` | Numero compatible | Visible si tipo captura = `Medidas`. |
| `Modelo montacargas` | Texto | Visible si tipo captura = `Modelo`. |

### `Sistema Cantiléver`

| Columna | Tipo SharePoint recomendado | Observaciones |
| --- | --- | --- |
| Columnas de relacion obligatorias | Ver seccion anterior | Requeridas. |
| Campos comunes de detalle | Ver seccion anterior | Incluir los campos aplicables. |
| `Tipo producto` | Texto | Tipo de carga o producto. |
| `Longitud carga` | Numero compatible | Longitud de carga. |
| `Sección carga` | Numero compatible | Seccion, diametro o ancho segun producto. |
| `Peso carga` | Numero compatible | Peso de carga. |
| `Cantidad por nivel` | Numero compatible | Cantidad por nivel de brazos. |
| `Tipo góndola` | Opcion | `Góndola sencilla` o `Góndola doble`. |

### `Sistema Mezzanine`

| Columna | Tipo SharePoint recomendado | Observaciones |
| --- | --- | --- |
| Columnas de relacion obligatorias | Ver seccion anterior | Requeridas. |
| Campos comunes de detalle | Ver seccion anterior | Incluir los campos aplicables. |
| `Altura recomendada entrepiso` | Numero compatible | Valor default actual observado: `2.4`. |
| `Cantidad entrepisos` | Numero compatible | Numero de niveles o entrepisos. |
| `Requiere elevador` | Booleano | Decision del flujo. |
| `Especificación elevador` | Texto multilinea | Visible si requiere elevador. |
| `Tipo piso` | Opcion | Tipo de piso requerido. |
| `Usa carrito` | Booleano | Decision del flujo. |
| `Medidas carrito` | Texto | Visible si usa carrito. |
| `Número ruedas` | Numero compatible | Visible si usa carrito. |
| `Tipo rueda` | Texto | Visible si usa carrito. |
| `Medida rueda` | Texto | Visible si usa carrito. |
| `Peso carrito` | Numero compatible | Visible si usa carrito. |
| `Requiere escaleras` | Booleano | Decision del flujo. |

### `Sistema Carton Flow`

| Columna | Tipo SharePoint recomendado | Observaciones |
| --- | --- | --- |
| Columnas de relacion obligatorias | Ver seccion anterior | Requeridas. |
| Campos comunes de detalle | Ver seccion anterior | Incluir los campos aplicables. |
| `Frentes buscados` | Numero compatible | Configuracion del flujo. |
| `Fondos buscados` | Numero compatible | Configuracion del flujo. |
| `Niveles buscados` | Numero compatible | Configuracion del flujo. |
| `Tipo rodamiento` | Opcion | Valores esperados: `Rodillo 3/4`, `Rodajas` y variantes definidas por ingenieria. |
| `Método cálculo entrecentros` | Opcion | `Manual` o `Por cálculo`. |
| `Entrecentros manual` | Numero compatible | Visible si metodo manual. |

### `Sistema Mezzanine Limpio`

| Columna | Tipo SharePoint recomendado | Observaciones |
| --- | --- | --- |
| Columnas de relacion obligatorias | Ver seccion anterior | Requeridas. |
| Campos comunes de detalle | Ver seccion anterior | Incluir los campos aplicables. |
| `Cantidad pisos` | Numero compatible | Cantidad de pisos. |
| `Carga por m2` | Numero compatible | Capacidad requerida. |
| `Es modulado` | Booleano | Decision del flujo. |
| `Zona modulada` | Texto | Visible si es modulado. |
| `Usa tarimas` | Booleano | Habilita tabla `Sistema Tarimas`. |
| `Requiere elevador` | Booleano | Decision del flujo. |
| `Especificación elevador` | Texto multilinea | Visible si requiere elevador. |
| `Tipo piso` | Opcion | Tipo de piso requerido. |
| `Usa carrito` | Booleano | Decision del flujo. |
| `Medidas carrito` | Texto | Visible si usa carrito. |
| `Número ruedas` | Numero compatible | Visible si usa carrito. |
| `Tipo rueda` | Texto | Visible si usa carrito. |
| `Medida rueda` | Texto | Visible si usa carrito. |
| `Peso carrito` | Numero compatible | Visible si usa carrito. |
| `Requiere escaleras` | Booleano | Decision del flujo. |
| `Método separación columnas` | Opcion | `Manual` o calculado, segun flujo. |
| `Separación columnas manual` | Numero compatible | Visible si metodo manual. |

### `Sistema Otro`

| Columna | Tipo SharePoint recomendado | Observaciones |
| --- | --- | --- |
| Columnas de relacion obligatorias | Ver seccion anterior | En lista existente puede llamarse `SistemaID` en vez de `SistemaCotizaciónID`. |
| `Title` | Texto | Nombre del sistema/tab. |
| `HTML` | Texto multilinea | Contenido del editor HTML. |

## Listas hijas compartidas

Todas las listas hijas deben incluir estas columnas base ademas de sus campos
propios.

| Columna | Tipo SharePoint | Requerida | Indexar | Observaciones |
| --- | --- | --- | --- | --- |
| `Title` | Texto | No | No | Etiqueta de renglon, por ejemplo `Tarima 1`. |
| `CotizaciónID` | Lookup a `Cotizaciones` | Si | Si | Relacion con cotizacion. |
| `SistemaCotizaciónID` | Lookup a `Sistemas por cotización` | Si | Si | Relacion con la instancia exacta del sistema. |
| `Folio` | Texto | Si | Si | Trazabilidad. |
| `TipoKey` | Texto | Si | Si | Sistema que genero el renglon. |
| `NombreSistema` | Texto | Si | No | Nombre de tab. |
| `Orden` | Numero | Si | No | Orden visual del renglon. |
| `RowId` | Texto | No | No | GUID/local id recomendado para upsert desde la app. |

### `Sistema Tarimas`

| Columna | Tipo SharePoint recomendado | Observaciones |
| --- | --- | --- |
| Columnas base de lista hija | Ver seccion anterior | Requeridas. |
| `Tipo tarima` | Texto | Tipo o descripcion de tarima. |
| `Peso tarima` | Numero compatible | Peso capturado. |
| `Alto tarima` | Numero compatible | Alto capturado. |
| `Frente tarima` | Numero compatible | Frente capturado. |
| `Fondo tarima` | Numero compatible | Fondo capturado. |
| `Huella tarima` | Texto | Huella o configuracion. |
| `Excedente` | Booleano | Toggle por renglon. |
| `Excedente frente` | Numero compatible | Visible si `Excedente` activo. |
| `Excedente fondo` | Numero compatible | Visible si `Excedente` activo. |

### `Sistema Productos`

| Columna | Tipo SharePoint recomendado | Observaciones |
| --- | --- | --- |
| Columnas base de lista hija | Ver seccion anterior | Requeridas. |
| `Tipo producto` | Texto | Tipo o descripcion del producto. |
| `Largo producto` | Numero compatible | Capturado como texto si no hay conversion. |
| `Ancho producto` | Numero compatible | Capturado como texto si no hay conversion. |
| `Alto producto` | Numero compatible | Capturado como texto si no hay conversion. |
| `Peso producto` | Numero compatible | Capturado como texto si no hay conversion. |
| `Cantidad por nivel` | Numero compatible | Capturado como texto si no hay conversion. |

### `Sistema Colores`

| Columna | Tipo SharePoint recomendado | Observaciones |
| --- | --- | --- |
| Columnas base de lista hija | Ver seccion anterior | Requeridas. |
| `Pieza` | Texto | Pieza, componente o zona que recibe color. |
| `ColorKey` | Texto | Clave normalizada si existe catalogo. |
| `ColorNombre` | Texto | Nombre visible del color. |
| `ColorTexto` | Texto | Campo libre opcional cuando no hay catalogo. |

### `Sistema Elementos Seguridad`

| Columna | Tipo SharePoint recomendado | Observaciones |
| --- | --- | --- |
| Columnas base de lista hija | Ver seccion anterior | Requeridas. |
| `Elemento` | Texto | Elemento de seguridad seleccionado o capturado. |
| `Comentarios` | Texto multilinea | Comentarios o especificacion. |

### `Sistema Piezas Especiales`

| Columna | Tipo SharePoint recomendado | Observaciones |
| --- | --- | --- |
| Columnas base de lista hija | Ver seccion anterior | Requeridas. |
| `Pieza` | Texto | Pieza especial. |
| `Comentarios` | Texto multilinea | Comentarios o especificacion. |

### `Sistema Proveedores Externos`

| Columna | Tipo SharePoint recomendado | Observaciones |
| --- | --- | --- |
| Columnas base de lista hija | Ver seccion anterior | Requeridas. |
| `Proveedor` | Texto | Nombre del proveedor. |
| `Alcance` | Texto multilinea | Que suministra o que queda fuera del alcance FDI. |

### `Sistema Listado Piezas`

| Columna | Tipo SharePoint recomendado | Observaciones |
| --- | --- | --- |
| Columnas base de lista hija | Ver seccion anterior | Requeridas. |
| `Pieza` | Texto | Pieza solicitada por el cliente o usuario. |
| `Cantidad` | Numero compatible | Si se captura cantidad. |
| `Comentarios` | Texto multilinea | Comentarios de la pieza. |

## Patron de persistencia esperado

Al guardar la cotizacion desde `scrFDI`, el Patch debe seguir este orden:

1. Guardar o actualizar `Cotizaciones`.
2. Crear una fila en `Sistemas por cotización` por cada sistema capturado.
3. Crear o actualizar una fila en la lista de detalle `Sistema <Tipo>` con los
   campos escalares del draft local.
4. Guardar cada tabla repetible con `ForAll(...)` hacia su lista hija compartida,
   usando `SistemaCotizaciónID` para relacionar cada renglon con su sistema.
5. Si se edita una cotizacion existente, reemplazar o actualizar renglones hijos
   por `SistemaCotizaciónID` y `RowId` para no mezclar datos entre sistemas.

Las colecciones draft locales (`colSEL_Draft`, `colDIN_Draft`, `colPBK_Draft`,
etc.) siguen siendo correctas para la captura en pantalla. SharePoint solo debe
recibir datos en el guardado final.

## Indices recomendados

Indexar estas columnas antes de cargar datos:

| Lista | Columnas a indexar |
| --- | --- |
| `Sistemas por cotización` | `CotizaciónID`, `Folio`, `TipoKey` |
| Listas `Sistema <Tipo>` | `CotizaciónID`, `SistemaCotizaciónID`, `Folio`, `TipoKey` |
| Listas hijas compartidas | `CotizaciónID`, `SistemaCotizaciónID`, `TipoKey`, `Folio` |

El indice mas importante es `SistemaCotizaciónID` en las listas hijas. Sin ese
lookup, no se puede distinguir correctamente entre dos sistemas del mismo tipo
en la misma cotizacion.

## Estado de implementacion en la app

Este documento describe el esquema SharePoint recomendado para carga y
persistencia final. La app actual ya captura en draft local y tiene persistencia
parcial para listas existentes como `Sistema selectivo`, `Sistema Otro` y la
lista puente. Para usar este esquema completo se requiere agregar las listas
como datasources en Power Apps y ajustar el Patch final para crear registros en
las listas de detalle y listas hijas compartidas.
