# Mapa de captura Selectivo a SharePoint

Referencia funcional: `docs/diagrams/diseno-sistema-selectivo.mmd`.

Este mapa aplica la estructura del diseno de sistema selectivo a la ventana de
generacion de cotizacion (`scrFDI`). Cuando no existe una columna directa en
SharePoint, el dato debe quedar en `Sistema selectivo.PayloadSistemaJson` o
marcado como pendiente de columna/adjunto.

| Proceso | Tipo de control | Columna SharePoint / almacenamiento |
| --- | --- | --- |
| Metodo de captura | Dropdown | `Sistema selectivo.Tipo de diseño` |
| Listado de piezas | Tabla editable | `Sistema selectivo.Piezas de usuario` como resumen y `PayloadSistemaJson.Piezas` como detalle |
| Tarima | Tabla editable | `PayloadSistemaJson.Tarimas` |
| Tarima - peso | Entrada numerica | Pendiente: `PayloadSistemaJson.Tarimas.Peso` |
| Area disponible / pasillos | Entradas de texto | `Pasillo máximo`, `Pasillo mínimo`, `Ancho disponible`, `Largo disponible` |
| Configuracion de niveles | Dropdown + texto | `Configuración de niveles`, `Altura crítica de montacargas`, `Altura crítica de niveles`, `Definido por el cliente` |
| Imagen o layout | Adjuntos | Pendiente: adjuntos de `Cotizaciones 2026` o `PayloadSistemaJson.Layout` |
| Elementos de seguridad | Toggle + tabla editable | `Elementos de seguridad` como resumen y `PayloadSistemaJson.ElementosSeguridad` como detalle |
| Piezas especiales | Toggle + tabla editable | Pendiente: `PayloadSistemaJson.PiezasEspeciales` |
| Referencia anterior | Entrada de texto | `Número de pedido o cotización` |
| Acabado | Selector / toggle | `Galvanizado`, `Tipo de galvanizado`, `Precio por kilogramo galvanizado` |
| Colores por pieza | Tabla editable + combo | `PayloadSistemaJson.Colores` |
| Instalacion | Toggle | `Instalación` |
| Memoria de calculo | Toggle | `Memoria de cálculo` |
| Unirse a estructura del cliente | Toggle + comentarios | `Unirse a estructura de otro proveedor` y `Consideraciones especiales` |
| Proveedores externos | Toggle + tabla editable | `Proveedores externos` y pendiente `PayloadSistemaJson.ProveedoresExternos` |
| Comentarios generales | Texto | `Consideraciones especiales` |

Notas:

- La tabla visible en `scrFDI` es informativa y responsiva; no crea columnas
  nuevas por si misma.
- `PayloadSistemaJson` sigue siendo el almacenamiento oficial para tablas
  repetibles o datos sin columna directa.
- Las columnas pendientes requieren decision de SharePoint antes de separarlas
  del payload.
