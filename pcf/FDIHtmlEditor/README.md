# FDI HTML Editor PCF

Editor HTML para el cuerpo de correo de FDI en Power Apps Canvas.

## Propiedades

- `DefaultHtml`: HTML inicial que se carga en el editor.
- `HtmlText`: HTML sanitizado que debe usar `scrCorreo` para enviar el correo.

## Integración en `scrCorreo`

1. Importar este PCF como code component de la solución.
2. En Power Apps Studio, insertar el componente `FDI.HtmlEditor` en `scrCorreo`.
3. Nombrar la instancia `RichTextEditorCorreo` para conservar la fórmula existente:

   ```powerfx
   locCuerpoHtml: RichTextEditorCorreo.HtmlText
   ```

4. Mover al nuevo PCF el `Default` del rich text actual como `DefaultHtml`.
5. Quitar el rich text nativo anterior después de confirmar que el botón `Enviar` lee `HtmlText`.

No cambia el contrato del flujo ni la lógica de envío.

Nota: no se recomienda reemplazar un control Canvas por PCF editando directamente el `.msapp`; Power Apps debe registrar primero el code component en la solución. Mantener el nombre `RichTextEditorCorreo` evita tocar la fórmula del botón de envío.

## Build local

```powershell
cd pcf/FDIHtmlEditor
npm install
npm run build
```

Si se usa Power Platform CLI, agregar el control a la solución con:

```powershell
pac solution add-reference --path .\pcf\FDIHtmlEditor
```

El proyecto PCF está en `FDIHtmlEditor.pcfproj`.

## Capacidades

- Negritas, cursiva y subrayado.
- Tachado.
- Deshacer y rehacer.
- Formatos de parrafo, titulos y cita.
- Alineación izquierda, centro, derecha y justificada.
- Listas ordenadas y no ordenadas.
- Sangria y disminuir sangria.
- Links con panel propio, sin `prompt()` del navegador.
- Inserción de tablas con selector visual.
- Edición contextual de tablas:
  - insertar fila arriba o abajo;
  - insertar columna izquierda o derecha;
  - eliminar fila;
  - eliminar columna;
  - alternar fila de encabezado;
  - eliminar tabla.
- Linea horizontal.
- Pegado de imágenes con `Ctrl+V`.
- Inserción de imágenes desde archivo.
- Redimensionado de imágenes por arrastre.
- Limpieza de formato.
- Contador de palabras y caracteres.
- Sanitización básica sin servicios externos.
