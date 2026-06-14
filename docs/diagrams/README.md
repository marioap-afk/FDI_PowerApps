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

## Uso

Estos archivos son fuente de documentacion y diseno. No forman parte del
paquete importable de Power Platform por si solos.
