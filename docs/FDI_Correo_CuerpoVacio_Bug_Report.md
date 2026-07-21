# FDI — Bug: Enviar correo bloquea "Completa… cuerpo" aunque el cuerpo se ve lleno

> **Autor:** Claude Release. Diagnóstico sobre la fuente real (`scrCorreo.pa.yaml`) + captura del
> usuario (pantalla de correo, banner de validación). **Arreglo: Codex.** El usuario ya llegó a
> `scrCorreo` (OnSuccess + contacto + flujo destrabados); ahora el botón **Enviar** rechaza el envío
> con "Completa destinatario, asunto y cuerpo del correo antes de enviar" pese a tener los tres campos.

## Causa raíz: `DefaultHtml` (entrada) vs `HtmlText` (salida) del PCF `FDI.HtmlEditor`

El botón Enviar (`cmpbtnBody.OnSelect`) valida:

```powerapps
UpdateContext({
    locemailDestinatario: Concat(Destinatario, Mail & ";"),
    locCuerpoHtml: HtmlEditor1.HtmlText            // ← propiedad de SALIDA del PCF
});
If(
    IsBlank(locemailDestinatario) || IsBlank(Trim(TextInput1.Text)) || IsBlank(Trim(locCuerpoHtml)),
    Notify("Completa destinatario, asunto y cuerpo del correo antes de enviar.", NotificationType.Error),
    ... Confirm ... Correo_Teams_Solicitud_Cotización.Run(locemailDestinatario, TextInput1.Text, locCuerpoHtml, locemailCC) ...
)
```

El cuerpo visible es el **`DefaultHtml`** (propiedad de **entrada** del PCF, armada con el folio/cliente/
contacto). El PCF **solo emite `HtmlText` cuando el usuario edita** el editor (`notifyOutputChanged`
ocurre al teclear, no al render inicial). Si el usuario **no toca** el cuerpo (deja el texto
autogenerado), `HtmlText` queda **vacío** → `locCuerpoHtml` vacío → la condición
`IsBlank(Trim(locCuerpoHtml))` es **true** → bloquea con "Completa… cuerpo", aunque en pantalla se vea
el texto. Destinatario y Asunto evalúan bien; el único "vacío" es el cuerpo.

**Riesgo adicional:** aun saltándose la validación, `.Run(..., locCuerpoHtml, ...)` enviaría el correo
con **cuerpo vacío**, porque usa el mismo `HtmlText` sin tocar.

## Confirmación / workaround

Hacer **clic en el cuerpo y teclear cualquier cosa** (un espacio) dispara la salida del PCF →
`HtmlText` se llena → Enviar funciona. Confirma el diagnóstico al 100%.

## Arreglo (Codex) — usar el default como respaldo

1. En `scrCorreo.OnVisible`, construir el cuerpo por defecto en una variable, p. ej.:
   ```powerapps
   Set(varCuerpoDefault,
       "<p>Hola,</p><p>Solicito apoyo para cotizar la FDI <strong>" & Coalesce(varCotizacionFinal.Folio,"") & "</strong>.</p>" &
       "<p><strong>Cliente:</strong> " & Coalesce(varCotizacionFinal.Title,"") & "<br/>" &
       "<strong>Contacto:</strong> " & Coalesce(varCotizacionFinal.'Nombre de contacto',"") & "</p><p>Gracias.</p>");
   ```
   y usarla como `DefaultHtml` del PCF (misma cadena) para mantener consistencia.
2. En el botón Enviar, leer el cuerpo con respaldo en **validación y envío**:
   ```powerapps
   locCuerpoHtml: Coalesce(HtmlEditor1.HtmlText, varCuerpoDefault)
   ```
   (pasar ese mismo `locCuerpoHtml` al `.Run(...)`).
3. Alternativa robusta a nivel PCF (`FDI.HtmlEditor` v1.5.2): emitir `HtmlText = DefaultHtml` en la
   inicialización (un `notifyOutputChanged` tras setear el contenido por defecto), para que la salida
   nunca arranque vacía. Ver [[fdi-pcf-packaging]] si se toca el PCF.

## Nota de proceso

- Este bug está en la **fuente actual** (`scrCorreo`); no lo detecta ninguna validación de empaquetado
  (es semántico). Se confirma en Studio / runtime.
- Es el **último eslabón** del flujo Enviar: OnSuccess (`Color`), autollenado de contacto y flujo
  Creación FDI ya quedaron resueltos por el usuario. Tras este fix + Guardar/Publicar en Studio, el
  end-to-end debería cerrar.
