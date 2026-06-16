# FDI SharePoint — listas y campos de captura de sistemas

Referencia para **crear** las listas SharePoint que persisten la captura de sistemas
de `scrFDI`. Cada lista queda definida de forma **exacta** (todas sus columnas).

Derivado de los **diagramas de flujo de los sistemas** ya revisados
(`docs/diagrams/diseno-sistema-*.mmd`) y sus process maps (`docs/sistemas/*.md`,
`docs/FDI_Selectivo_Process_Map.md`).

> **Fuera de alcance (por ahora):** las listas del flujo de cotizaciones
> (`Bitácora cotizaciones`, `Solicitudes en cotizaciones`, `Carpeta cotizaciones`).
> Se documentan aparte.

## Modelo de datos (3 niveles + tablas hijas)

| Nivel | Lista | Propósito |
| --- | --- | --- |
| Padre | `Cotizaciones` | Registro maestro de la cotización. **Decisión:** la lista padre se llama `Cotizaciones` (sin `2026`); la app debe apuntar sus datasources/Patch a este nombre. |
| Puente | `Sistemas por cotización` | Una fila por sistema agregado a la cotización (permite ≥2 sistemas del mismo tipo). |
| Detalle | `Sistema <Tipo>` | Campos escalares del formulario de cada sistema. |
| Tablas hijas | `Sistema Tarimas`, `Sistema Productos`, etc. | Una fila por renglón de una tabla repetible. **Compartidas** entre sistemas. |

Los campos escalares van en la lista de **detalle**; las **tablas** del diagrama
(Tarimas, Productos, Colores, Elementos de seguridad, Piezas especiales, Proveedores,
Listado de piezas) van en **listas hijas**. `PayloadSistemaJson` queda **opcional**
(solo auditoría/respaldo), no como almacenamiento principal.

## Regla de tipos

| Tipo usado aquí | Tipo SharePoint | Nota |
| --- | --- | --- |
| Texto | Una línea de texto | Valores cortos, folios, nombres, opciones guardadas como texto. |
| Texto multilínea | Varias líneas (sin formato, sin append) | Comentarios, especificaciones, HTML, auditoría JSON opcional. |
| Booleano | Sí/No | Toggles del flujo. |
| Opción | Choice | Conjunto de valores controlado. |
| Lookup | Lookup | Relación a otra lista. |
| Número compatible | Una línea de texto | **Decisión:** las medidas se guardan como **texto** (no se fija una unidad estándar; el usuario incluye la unidad en el valor). **No** migrar a `Número` nativo salvo que se decida fijar unidades por campo. Solo `SistemaID` y `Orden` (valores internos de la app) son `Número`. |

## Bloques de columnas reutilizables

Cada lista declara abajo **qué bloques** incluye + sus columnas propias.

### Bloque R — Relación (en cada lista de detalle)

| Columna | Tipo | Req. | Indexar | Nota |
| --- | --- | --- | --- | --- |
| `CotizaciónID` | Lookup a `Cotizaciones` | Sí | Sí | Relación con la cotización padre **existente**. |
| `SistemaCotizaciónID` | Lookup a `Sistemas por cotización` | Sí | Sí | Instancia exacta del sistema (clave si hay ≥2 del mismo tipo). |
| `Folio` | Texto | Sí | Sí | Copia del folio para búsqueda/soporte. |
| `NombreSistema` | Texto | Sí | No | Nombre visible del tab (p. ej. `Selectivo 1`). |

> Compatibilidad: la lista existente `Sistema selectivo` usa `SistemasID` y `Sistema Otro`
> usa `SistemaID` para el lookup al puente. En listas nuevas usar `SistemaCotizaciónID`;
> en las existentes, documentar el alias y no apuntar a columnas inexistentes.

> **`TipoKey` se omite en las listas de detalle**: sería constante (la lista ya define el tipo).
> Sí va en el **Bloque H** (listas hijas compartidas, donde varía) y en el **puente** (`Sistemas
> por cotización`, que mezcla sistemas de distintos tipos).

### Bloque C — Comunes del sistema (en todas las listas de detalle)

| Columna | Tipo | Nota |
| --- | --- | --- |
| `Title` | Texto | Puede duplicar `NombreSistema`. |
| `Tipo de diseño` | Opción | `Diseño`, `Listado de piezas`, `Planos/diseño de cliente`, `Pedido o cotización anterior`. |
| `Folio de cotización anterior` | Texto | Método *Pedido o cotización anterior*. Es una entrada distinta del folio de pedido; **pueden coexistir**. |
| `Folio de pedido anterior` | Texto | Método *Pedido o cotización anterior*. Entrada distinta del folio de cotización; **pueden coexistir**. |
| `Comentarios / alcance de la referencia` | Texto multilínea | Alcance/comentarios de la referencia anterior. |
| `Acabado` | Opción | **Único selector de acabado.** Valores: `Pintado`, `Galvanizado en frío`, `Galvanizado en caliente`, `Pregalvanizado`. |
| `Galvanizado` | Booleano | Derivado (reportes/Excel). `false` solo para `Pintado`. No se captura en UI. |
| `Tipo de galvanizado` | Opción | Derivado. Vacío para `Pintado`; `Frío` / `Caliente` / `Pregalvanizado` según `Acabado`. No se captura en UI. |
| `Precio por kilogramo galvanizado` | Número compatible | Capturable solo si `Acabado` es `Galvanizado en frío` o `Galvanizado en caliente`. |
| `Instalación` | Booleano | ¿Requiere instalación? |
| `Costo instalación` | Número compatible | Si `Instalación` = Sí. |
| `Comentarios instalación` | Texto multilínea | Si `Instalación` = Sí. |
| `Memoria de cálculo` | Booleano | ¿Requiere memoria de cálculo? |
| `Costo memoria cálculo` | Número compatible | Si `Memoria de cálculo` = Sí. |
| `Unirse a estructura de otro proveedor` | Booleano | ¿Unirse a estructura del cliente? |
| `Comentarios estructura` | Texto multilínea | Si lo anterior = Sí. |
| `Proveedores externos` | Booleano | ¿Se consideran proveedores externos? (detalle en lista hija). |
| `Consideraciones especiales` | Texto multilínea | Comentarios generales del sistema. |
| `Requiere adjuntar layout` | Booleano | ¿Adjuntar imagen/layout? (usa adjuntos de la cotización). |
| `Existe definición cliente` | Booleano | ¿Existe definición por parte del cliente? |
| `Definido por el cliente` | Texto multilínea | Comentarios de configuración del cliente (si lo anterior = Sí). |

### Bloque A-M — Área y niveles con montacargas (SEL, DIN, PBK, DRV, CAN)

| Columna | Tipo | Nota |
| --- | --- | --- |
| `Pasillo máximo` | Número compatible | Pasillo máximo de montacargas. |
| `Pasillo mínimo` | Número compatible | Pasillo mínimo de montacargas. |
| `Ancho disponible` | Número compatible | Ancho de área disponible. |
| `Largo disponible` | Número compatible | Largo disponible. |
| `Considerar altura máxima montacargas` | Booleano | Toggle del criterio de niveles. |
| `Altura crítica de montacargas` | Número compatible | Si lo anterior = Sí. |
| `Considerar altura nave` | Booleano | Toggle del criterio de niveles. |
| `Altura máxima nave` | Número compatible | Si `Considerar altura nave` = Sí. |
| `Altura mínima nave` | Número compatible | Si `Considerar altura nave` = Sí. |

### Bloque A-P — Área y niveles con pickeo, sin montacargas (MEZ, CFL, MZL)

| Columna | Tipo | Nota |
| --- | --- | --- |
| `Ancho disponible` | Número compatible | Ancho de área disponible. |
| `Largo disponible` | Número compatible | Largo disponible. |
| `Ancho pasillo pickeo` | Número compatible | Reemplaza el pasillo de montacargas. |
| `Considerar altura nave` | Booleano | Limitante de niveles (no hay montacargas). |
| `Altura máxima nave` | Número compatible | Si `Considerar altura nave` = Sí. |
| `Altura mínima nave` | Número compatible | Si `Considerar altura nave` = Sí. |

### Bloque H — Base de lista hija (en cada lista hija)

| Columna | Tipo | Req. | Indexar | Nota |
| --- | --- | --- | --- | --- |
| `Title` | Texto | No | No | Etiqueta del renglón (p. ej. `Tarima 1`). |
| `CotizaciónID` | Lookup a `Cotizaciones` | Sí | Sí | Relación con la cotización. |
| `SistemaCotizaciónID` | Lookup a `Sistemas por cotización` | Sí | Sí | Instancia exacta del sistema. |
| `Folio` | Texto | Sí | Sí | Trazabilidad. |
| `TipoKey` | Texto | Sí | Sí | Sistema que generó el renglón. |
| `NombreSistema` | Texto | Sí | No | Nombre del tab. |
| `Orden` | Número | Sí | No | Orden visual del renglón. |
| `RowId` | Texto | No | No | Id local/GUID para upsert desde la app. |

## Inventario de listas a crear

| Lista | Nivel | Columnas | Usada por |
| --- | --- | --- | --- |
| `Sistemas por cotización` | Puente | (ya existe — ver abajo) | Todos |
| `Sistema selectivo` | Detalle | R + C + A-M | `SEL` |
| `Sistema Dinámico` | Detalle | R + C + A-M + propias | `DIN` |
| `Sistema Pushback` | Detalle | R + C + A-M + propias | `PBK` |
| `Sistema Drive In` | Detalle | R + C + A-M + propias | `DRV` |
| `Sistema Cantiléver` | Detalle | R + C + A-M + propias | `CAN` |
| `Sistema Mezzanine` | Detalle | R + C + A-P + propias | `MEZ` |
| `Sistema Carton Flow` | Detalle | R + C + A-P + propias | `CFL` |
| `Sistema Mezzanine Limpio` | Detalle | R + C + A-P + propias | `MZL` |
| `Sistema Otro` | Detalle | R + Title + HTML | `OT` |
| `Sistema Tarimas` | Hija | H + propias | `SEL,DIN,PBK,DRV,MZL` |
| `Sistema Productos` | Hija | H + propias | `MEZ,CFL,MZL` |
| `Sistema Colores` | Hija | H + propias | Todos (colores por pieza) |
| `Sistema Elementos Seguridad` | Hija | H + propias | Todos (elementos de seguridad) |
| `Sistema Piezas Especiales` | Hija | H + propias | Todos (piezas especiales) |
| `Sistema Proveedores Externos` | Hija | H + propias | Todos (proveedores externos) |
| `Sistema Listado Piezas` | Hija | H + propias | Todos (método *Listado de piezas*) |

## Listas de detalle (definición exacta)

### `Sistemas por cotización` (puente, ya existe)

| Columna | Tipo | Req. | Nota |
| --- | --- | --- | --- |
| `Title` | Texto | Sí | Tipo de sistema (p. ej. `Selectivo`). |
| `NombreSistema` | Texto | Sí | Nombre del tab (p. ej. `Selectivo 1`). En la lista existente puede llamarse `Nombre`. |
| `SistemaID` | Número | Sí | Id local que usa la app para distinguir tabs. |
| `TipoKey` | Texto | Sí | Clave normalizada del sistema. |
| `CotizaciónID` | Lookup a `Cotizaciones` | Sí | Indexar. |
| `Folio` | Texto | Sí | Indexar. |

### `Sistema selectivo` (`SEL`)
**Columnas = Bloque R + Bloque C + Bloque A-M.** No tiene columnas escalares propias
(la tarima va en `Sistema Tarimas`; seguridad/piezas especiales/colores en sus hijas).

### `Sistema Dinámico` (`DIN`) y `Sistema Pushback` (`PBK`)
**Columnas = Bloque R + Bloque C + Bloque A-M + propias:**

| Columna | Tipo | Nota |
| --- | --- | --- |
| `Frentes buscados` | Número compatible | Configuración del rack. |
| `Fondos buscados` | Número compatible | Configuración del rack. |
| `Niveles buscados` | Número compatible | Configuración del rack. |
| `Tipo rodamiento` | Opción | `Rodillo 2.5`, `Rodillo 1.9`, `Rodillo 2.5 fácil limpieza`, `Rodillo 1.9 fácil limpieza`, `Llantas`, `Por cálculo`. |
| `Método cálculo entrecentros` | Opción | `Manual`, `Por cálculo`. |
| `Entrecentros manual` | Número compatible | Si método = `Manual`. |
| `Utilizar rodamiento alto impacto` | Booleano | Toggle. |
| `Especificación rodamiento alto impacto` | Texto multilínea | Si el toggle = Sí. |

### `Sistema Drive In` (`DRV`)
**Columnas = Bloque R + Bloque C + Bloque A-M + propias:**

| Columna | Tipo | Nota |
| --- | --- | --- |
| `Frentes buscados` | Número compatible | Configuración del rack (sin rodamientos). |
| `Fondos buscados` | Número compatible | Configuración del rack. |
| `Niveles buscados` | Número compatible | Configuración del rack. |
| `Tipo captura montacargas` | Opción | `Medidas`, `Modelo`. |
| `Altura cabina montacargas` | Número compatible | Si tipo captura = `Medidas`. |
| `Ancho total montacargas` | Número compatible | Si tipo captura = `Medidas`. |
| `Ancho mástil montacargas` | Número compatible | Si tipo captura = `Medidas`. |
| `Modelo montacargas` | Texto | Si tipo captura = `Modelo`. |

### `Sistema Cantiléver` (`CAN`)
**Columnas = Bloque R + Bloque C + Bloque A-M + propias:** *(la carga son campos escalares,
no una tabla; por eso NO usa `Sistema Productos`).*

| Columna | Tipo | Nota |
| --- | --- | --- |
| `Tipo producto` | Texto | Texto abierto (tubería, perfil, madera…). |
| `Longitud carga` | Número compatible | Longitud de la carga. |
| `Sección carga` | Número compatible | Sección / diámetro / ancho. |
| `Peso carga` | Número compatible | Peso por pieza / por nivel. |
| `Cantidad por nivel` | Número compatible | Cantidad por nivel de brazos. |
| `Tipo góndola` | Opción | `Góndola sencilla`, `Góndola doble`, `Ambas`, `Por diseño`. |

### `Sistema Mezzanine` (`MEZ`)
**Columnas = Bloque R + Bloque C + Bloque A-P + propias:** *(el producto va en `Sistema Productos`).*

| Columna | Tipo | Nota |
| --- | --- | --- |
| `Altura recomendada entrepiso` | Número compatible | Default sugerido `2.4`. |
| `Cantidad entrepisos` | Número compatible | Número de entrepisos. |
| `Requiere elevador` | Booleano | Toggle. |
| `Especificación elevador` | Texto multilínea | Si requiere elevador (capacidad / especificación). |
| `Tipo piso` | Opción | `Rejilla Irving`, `MDF`. |
| `Usa carrito` | Booleano | ¿Se usará carrito para pickear? |
| `Medidas carrito` | Texto | Si usa carrito. |
| `Número ruedas` | Número compatible | Si usa carrito. |
| `Tipo rueda` | Texto | Si usa carrito. |
| `Medida rueda` | Texto | Si usa carrito. |
| `Peso carrito` | Número compatible | Si usa carrito. |
| `Requiere escaleras` | Booleano | Toggle. |

### `Sistema Carton Flow` (`CFL`)
**Columnas = Bloque R + Bloque C + Bloque A-P + propias:** *(el producto va en `Sistema Productos`).*

| Columna | Tipo | Nota |
| --- | --- | --- |
| `Frentes buscados` | Número compatible | Configuración del rack. |
| `Fondos buscados` | Número compatible | Configuración del rack. |
| `Niveles buscados` | Número compatible | Configuración del rack. |
| `Tipo rodamiento` | Opción | `Rodillo 3/4`, `Rodajas`, `Por diseño` (sin alto impacto; `Por diseño` lo determina la medida/peso de la caja y la operación). |
| `Método cálculo entrecentros` | Opción | `Manual`, `Por cálculo`. |
| `Entrecentros manual` | Número compatible | Si método = `Manual`. |

### `Sistema Mezzanine Limpio` (`MZL`)
**Columnas = Bloque R + Bloque C + Bloque A-P + propias:** *(usa `Sistema Productos` en la zona
modulada y `Sistema Tarimas` en la zona no modulada).*

| Columna | Tipo | Nota |
| --- | --- | --- |
| `Cantidad pisos` | Número compatible | ¿Cuántos pisos? |
| `Carga por m2` | Número compatible | Carga por m². |
| `Es modulado` | Booleano | ¿Será modulado? |
| `Zona modulada` | Texto | ¿En dónde? (si `Es modulado` = Sí). |
| `Usa tarimas` | Booleano | ¿Tarimas en la zona no modulada? Habilita `Sistema Tarimas`. |
| `Requiere elevador` | Booleano | Toggle. |
| `Especificación elevador` | Texto multilínea | Si requiere elevador. |
| `Tipo piso` | Opción | `Rejilla Irving`, `MDF`. |
| `Usa carrito` | Booleano | ¿Se usará carrito para pickear? |
| `Medidas carrito` | Texto | Si usa carrito. |
| `Número ruedas` | Número compatible | Si usa carrito. |
| `Tipo rueda` | Texto | Si usa carrito. |
| `Medida rueda` | Texto | Si usa carrito. |
| `Peso carrito` | Número compatible | Si usa carrito. |
| `Requiere escaleras` | Booleano | Toggle. |
| `Método separación columnas` | Opción | `Manual`, `Por cálculo`. |
| `Separación columnas manual` | Número compatible | Si método = `Manual`. |

### `Sistema Otro` (`OT`)
**Columnas = Bloque R (en la lista existente el lookup puede llamarse `SistemaID`) + propias:**

| Columna | Tipo | Nota |
| --- | --- | --- |
| `Title` | Texto | Nombre del sistema/tab. |
| `HTML` | Texto multilínea | Contenido del editor HTML. |

## Listas hijas compartidas (definición exacta)

Todas incluyen el **Bloque H** + sus columnas propias.

### `Sistema Tarimas` — `SEL,DIN,PBK,DRV,MZL`

| Columna | Tipo | Nota |
| --- | --- | --- |
| `Tipo tarima` | Texto | Tipo/descripción de tarima. |
| `Peso tarima` | Número compatible | Peso. |
| `Alto tarima` | Número compatible | Alto. |
| `Frente tarima` | Número compatible | Frente. |
| `Fondo tarima` | Número compatible | Fondo. |
| `Huella tarima` | Texto | Huella de tarima. |
| `Excedente` | Booleano | Toggle por renglón. |
| `Excedente frente` | Número compatible | Si `Excedente` = Sí. |
| `Excedente fondo` | Número compatible | Si `Excedente` = Sí. |

### `Sistema Productos` — `MEZ,CFL,MZL`

| Columna | Tipo | Nota |
| --- | --- | --- |
| `Tipo producto` | Texto | Texto abierto. |
| `Largo producto` | Número compatible | |
| `Ancho producto` | Número compatible | |
| `Alto producto` | Número compatible | |
| `Peso producto` | Número compatible | Peso por pieza. |
| `Cantidad por nivel` | Número compatible | |

### `Sistema Colores` — todos

| Columna | Tipo | Nota |
| --- | --- | --- |
| `Pieza` | Texto | Pieza/zona que recibe color. |
| `ColorNombre` | Texto | Nombre visible del color. |
| `ColorKey` | Texto | Clave normalizada (si hay catálogo). |

### `Sistema Elementos Seguridad` — todos

| Columna | Tipo | Nota |
| --- | --- | --- |
| `Elemento` | Texto | Elemento de seguridad. |
| `Comentarios` | Texto multilínea | Especificación. |

### `Sistema Piezas Especiales` — todos

| Columna | Tipo | Nota |
| --- | --- | --- |
| `Pieza` | Texto | Pieza especial. |
| `Cantidad` | Número compatible | Si se captura cantidad. |
| `Comentarios` | Texto multilínea | Especificación. |

### `Sistema Proveedores Externos` — todos

| Columna | Tipo | Nota |
| --- | --- | --- |
| `Proveedor` | Texto | Nombre del proveedor. |
| `Alcance` | Texto multilínea | Qué suministra / qué queda fuera del alcance FDI. |

### `Sistema Listado Piezas` — todos (método *Listado de piezas*)

| Columna | Tipo | Nota |
| --- | --- | --- |
| `Pieza` | Texto | Pieza solicitada. |
| `Cantidad` | Número compatible | Si se captura cantidad. |
| `Comentarios` | Texto multilínea | Comentarios de la pieza. |

## Patrón de persistencia (guardado final desde `scrFDI`)

1. Guardar/actualizar la cotización en `Cotizaciones`.
2. Crear una fila en `Sistemas por cotización` por cada sistema capturado.
3. Crear/actualizar la fila de detalle en `Sistema <Tipo>` con los campos escalares.
4. Guardar cada tabla repetible con `ForAll(...)` hacia su lista hija, usando
   `SistemaCotizaciónID` para relacionar cada renglón con su sistema.
5. En edición, reemplazar/actualizar renglones hijos por `SistemaCotizaciónID` + `RowId`
   para no mezclar datos entre sistemas.

Las colecciones draft locales (`colSEL_Draft`, `colDIN_Draft`, …) siguen siendo la
captura en pantalla; SharePoint recibe datos solo en el guardado final.

## Índices recomendados

| Lista | Columnas a indexar |
| --- | --- |
| `Sistemas por cotización` | `CotizaciónID`, `Folio`, `TipoKey` |
| Listas `Sistema <Tipo>` | `CotizaciónID`, `SistemaCotizaciónID`, `Folio` |
| Listas hijas | `CotizaciónID`, `SistemaCotizaciónID`, `TipoKey`, `Folio` |

El índice más importante es `SistemaCotizaciónID` en las hijas: sin él no se distinguen
dos sistemas del mismo tipo en la misma cotización.
