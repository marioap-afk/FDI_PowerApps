# Diagramas de la app FDI

Esta carpeta contiene los diagramas Mermaid que sirven como referencia para el
diseno funcional y visual de la aplicacion Power Apps FDI.

## Diagramas

- `diseno-sistema-selectivo.mmd`: estructura propuesta para la captura de un
  sistema selectivo, separando metodo de captura, referencia anterior y datos
  comunes del sistema.
- `diseno-sistema-dinamico.mmd`: estructura propuesta para la captura de un
  sistema dinamico (rack por gravedad / flow rack). Reusa metodo de captura,
  referencia anterior y datos comunes, y agrega la seccion "Configuracion del
  rack" (rodamientos, entrecentros, alto impacto). Destinado a una tab nueva.
- `diseno-sistema-pushback.mmd`: estructura propuesta para la captura de un
  sistema pushback. Misma estructura que el sistema dinamico (metodo de captura,
  referencia anterior, datos comunes y "Configuracion del rack"); difiere por
  ahora solo en el nombre del sistema. Destinado a una tab nueva.
- `diseno-sistema-drive-in.mmd`: estructura propuesta para la captura de un
  sistema drive in. Reusa metodo de captura, referencia anterior y datos comunes,
  pero NO lleva rodamientos (la "Configuracion del rack" solo trae frentes/fondos/
  niveles buscados) y agrega la seccion "Montacargas" (medidas: altura de cabina,
  ancho total, ancho del mastil, o por modelo) con ayuda visual. Destinado a una
  tab nueva.
- `diseno-sistema-cantiliver.mmd`: estructura propuesta para la captura de un
  sistema cantiléver (cargas largas sobre brazos en voladizo). "Tarima" se cambia
  por "Carga / producto" (tipo abierto, medidas, peso, cantidad por nivel); la
  "Configuracion del rack" solo captura el tipo de gondola (sencilla/doble/ambas/por diseño) (columnas, brazos,
  altura, base, voladizo e inclinacion los deriva ingenieria); sin seccion
  Montacargas. Destinado a una tab nueva.
- `diseno-sistema-mezzanine.mmd`: estructura propuesta para la captura de un
  sistema mezzanine (entrepiso con racks, pickeo manual sin montacargas). "Tarima"
  → "Producto" como tabla (tipo abierto, largo/ancho/alto, peso, cantidad por
  nivel); agrega "Configuracion del entrepiso" (altura recomendada 2.4 m, cantidad
  de entrepisos, elevador, tipo de piso Rejilla Irving/MDF, carrito de pickeo,
  escaleras); la limitante de niveles es la altura de nave. Destinado a una tab nueva.
- `diseno-sistema-carton-flow.mmd`: estructura propuesta para la captura de un
  sistema carton flow (como el dinamico pero para pickeo manual, sin montacargas).
  "Tarima" → "Producto" como tabla; conserva frentes/fondos/niveles buscados y
  entrecentros, pero el rodamiento tiene 3 tipos (Rodillo de 3/4, Rodajas y Por diseño) y
  no lleva alto impacto; area con pasillo de pickeo. Destinado a una tab nueva.
- `diseno-sistema-mezzanine-limpio.mmd`: estructura propuesta para la captura de un
  sistema mezzanine limpio (estructura de puras columnas, multi-piso, mixto). Pregunta
  primero si sera modulado (y donde) y cuantos pisos; modulado = pickeo → tabla de
  Producto; zona no modulada con tarimas → tabla de Tarima; agrega carga por m² y
  configuracion de columnas (separacion manual/por calculo). Conserva del mezzanine
  elevador, escaleras, carrito y tipo de piso. Destinado a una tab nueva.
- `../FDI_Selectivo_Process_Map.md`: tabla de procesos,
  tipo de control y columna/almacenamiento SharePoint aplicado a `scrFDI`.
- `../sistemas/FDI_Dinamico_Process_Map.md`: tabla de procesos, validaciones,
  controles y columnas requeridas para el sistema dinamico.
- `../sistemas/FDI_Pushback_Process_Map.md`: tabla de procesos, validaciones,
  controles y columnas requeridas para el sistema pushback (propuesta modelada
  sobre el mapa de dinamico).
- `../sistemas/FDI_DriveIn_Process_Map.md`: tabla de procesos, validaciones,
  controles y columnas requeridas para el sistema drive in (sin rodamientos; con
  seccion Montacargas y su ayuda visual `assets/montacargas-medidas.webp`).
- `../sistemas/FDI_Cantiliver_Process_Map.md`: tabla de procesos, validaciones,
  controles y columnas requeridas para el sistema cantiléver (Carga/producto en
  vez de Tarima; solo tipo de gondola (sencilla/doble/ambas/por diseño); sin Montacargas).
- `../sistemas/FDI_Mezzanine_Process_Map.md`: tabla de procesos, validaciones,
  controles y columnas requeridas para el sistema mezzanine (Producto como tabla;
  Configuracion del entrepiso; sin Montacargas; pickeo manual).
- `../sistemas/FDI_CartonFlow_Process_Map.md`: tabla de procesos, validaciones,
  controles y columnas requeridas para el sistema carton flow (Producto como tabla;
  rodamiento de 2 tipos + entrecentros; sin alto impacto; sin Montacargas).
- `../sistemas/FDI_MezzanineLimpio_Process_Map.md`: tabla de procesos, validaciones,
  controles y columnas requeridas para el sistema mezzanine limpio (modulado/limpio
  condicional: Producto y/o Tarima; carga por m²; configuracion de columnas).

- Flujo de cotizaciones (scrFDI -> scrMisCotizaciones), en dos capas + bitacora:
  - `flujo-cotizaciones-macro.mmd`: ciclo de vida (estados de alto nivel; incluye
    Declinada/Perdida y la reapertura por Solicitud de actualizacion).
  - `flujo-cotizaciones-micro.mmd`: fases de trabajo dentro de "En proceso"
    (subciclo de solicitudes de informacion y subciclo de revision de documentos).
  - `flujo-cotizaciones-bitacora.mmd`: eventos que registra la Bitacora y la
    estructura de cada renglon.
  - Doc: `../FDI_Cotizaciones_Flow.md`.

## Uso

Estos archivos son fuente de documentacion y diseno. No forman parte del
paquete importable de Power Platform por si solos.
