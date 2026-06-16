# FDI — Bug report: pantalla de correo (scrCorreo) rota + navegación bloqueada

> **Autor:** Claude Release (rol: validar/empaquetar). Esto es **diagnóstico** sobre la fuente
> real del `.msapp` de `git HEAD`, comparada contra un baseline que funcionaba
> (`solutions/FDI_unmanaged_2026-06-13_09c3916.zip`). El **arreglo es de Codex**.
> Commits implicados: **`9a1d298` "Corrige pantalla de correo FDI"** y
> **`fd1f6f1` "Corrige serializacion YAML de correo"**.

## Síntomas reportados por el usuario
1. `scrCorreo` muestra controles con error (X rojas) en el área de Destinatario / CC / Asunto.
2. Al pulsar **"Enviar solicitud"** (en `scrFDI`) **no abre** `scrCorreo`.
3. El botón **se bloquea** y no transiciona a la pantalla de correo.
4. Muchos controles muestran fórmulas tipo `%Live.RESERVED%.Off`, `%BorderStyle.RESERVED%.Solid`.

---

## Estado (actualizado tras `f214298` / verificado en `19d4409`)

Codex aplicó **`f214298` "Corrige people picker de correo FDI"**. Verificado en la fuente del `.msapp`:

- ✅ **§1.1 esquema unificado** — ahora usa `With({u: UsuariosdeOffice365.UserProfile(...)}, {DisplayName, UserPrincipalName, Mail})` para proyectar a un esquema consistente.
- ✅ **§1.2 `Collect` dentro de `ForAll`** — ahora es `Collect(CC, ForAll(...))` (forma basada en conjuntos).
- ✅ **§2 navegación en fuente** — `CotizaciónForm.OnFailure` resetea `varEnviando` y `OnSuccess` mantiene `Navigate(scrCorreo, ScreenTransition.None)`. **Pendiente:** confirmar en Studio que el correo abre/envía sin X rojas.
- ✅ **§3 `scrCorreoPlantilla` fuente actualizada** — ya no referencia `MyPeople`; usa `Destinatario` con esquema proyectado `{DisplayName, UserPrincipalName, Mail}` y limpia `Destinatario`/`CC` en `OnVisible`.

**Salvedad:** no corro el analizador offline; "cero X rojas" se confirma abriendo en Studio. Los
patrones de causa raíz (§1) ya están resueltos en la fuente.

---

## 0. FALSO POSITIVO — descartar primero: `%…RESERVED%`

Las fórmulas `%Align.RESERVED%.Left`, `%BorderStyle.RESERVED%.Solid`, `%Live.RESERVED%.Off`,
`%Overflow.RESERVED%.Hidden`, `%TextRole.RESERVED%.Default`, `%VerticalAlign.RESERVED%.Middle`,
etc. **NO son el bug**:

- Son la **serialización interna normal** de valores de enum en el `.pa.yaml` y en el tema.
- `References/Themes.json`: **73 ocurrencias en el baseline que funcionaba = 73 ahora** (idéntico).
- Las 6 líneas en `Src/scrFDI.pa.yaml` tienen **texto idéntico** al baseline (solo cambió el nº de línea).
- Se ven en "muchos controles" porque son **defaults del tema** — ya era así en la versión buena.
- Único cambio real: ahora también aparecen en `Controls/508.json` (scrFDI compilado), donde el
  baseline tenía 0. Es un **artefacto del round-trip YAML** (benigno). **Acción menor:** reabrir y
  reguardar `scrFDI` en Studio para re-normalizar el compilado. No es lo que rompe el correo.

---

## 1. CAUSA RAÍZ — refactor de `scrCorreo`

Codex partió el people-picker único (`MyPeople`) en **dos colecciones `Destinatario` y `CC`**,
renombró controles (`TextSearchBox1` → `TextSearchBox1_2`/`_3`; `PeopleBrowseGallery1` →
`PeopleBrowseGallery1_1`/`_2`) y reescribió `scrCorreo.OnVisible` para sembrarlas desde `Cotizadores`.

### 1.1 Esquemas mezclados en `Destinatario` / `CC` (probable origen de las X rojas)
Se hace `Collect` sobre la **misma** colección con **tres esquemas distintos**:

| Origen | Fórmula (resumen) | Esquema |
| --- | --- | --- |
| `OnVisible` | `Collect(Destinatario, UsuariosdeOffice365.UserProfile(varCoordinador.Nombre.Email))` | registro **completo** de UserProfile (decenas de columnas) |
| Search box `OnSelect` | `Collect(Destinatario, {DisplayName:…, UserPrincipalName:…, Mail:…})` | **3 columnas** |
| Browse gallery select | `Collect(Destinatario, ThisItem)` | esquema de `SearchUser` |

Mezclar estos esquemas en una sola colección dispara **conflictos de tipo** en los controles del
picker → las X rojas. Mismo patrón para `CC`.

**Recomendación (Codex):** unificar el esquema. Sembrar y agregar **siempre** con la misma forma,
p. ej. proyectar a `{DisplayName, UserPrincipalName, Mail}` en los tres puntos:
```powerapps
Collect(Destinatario,
    With({u: UsuariosdeOffice365.UserProfile(varCoordinador.Nombre.Email)},
        {DisplayName: u.DisplayName, UserPrincipalName: u.UserPrincipalName, Mail: u.Mail}))
```

### 1.2 `Collect` dentro de `ForAll` (siembra de `CC` en `OnVisible`)
```powerapps
ForAll(
    Filter(Cotizadores, Puesto.Value <> "Coordinador"),
    With({ emailUsuario: Nombre.Email },
        If(!IsBlank(emailUsuario) && IsBlank(LookUp(CC, Mail = emailUsuario)),
            Collect(CC, UsuariosdeOffice365.UserProfile(emailUsuario)))))
```
Power Apps marca el uso de funciones de comportamiento (`Collect`) dentro de `ForAll`.

**Recomendación (Codex):** forma basada en conjuntos, sin `Collect` interno:
```powerapps
Collect(CC,
    ForAll(
        Filter(Cotizadores, Puesto.Value <> "Coordinador" && !IsBlank(Nombre.Email)),
        With({u: UsuariosdeOffice365.UserProfile(Nombre.Email)},
            {DisplayName: u.DisplayName, UserPrincipalName: u.UserPrincipalName, Mail: u.Mail})));
// dedupe aparte si hace falta
```

---

## 2. Navegación bloqueada ("Enviar solicitud" no abre scrCorreo)

- El botón **"Enviar solicitud"** (en `scrFDI`) ejecuta `SubmitForm(CotizaciónForm)`.
- La navegación está en el **camino de éxito** del envío:
  `…ResetForm(CotizaciónForm); NewForm(CotizaciónForm); Navigate(scrCorreo, ScreenTransition.None)`.
- Si `SubmitForm` no llega a éxito (validación/error) **o** `scrCorreo` tiene errores que impiden
  abrirla, el `Navigate` **no ocurre** y el botón queda en estado "enviando" (`varEnviando` /
  `locEnviandoCorreo` no se resetea) → **se ve bloqueado**.

**Recomendación (Codex):**
1. Arreglar primero los errores de §1 (al quedar `scrCorreo` sin errores, la navegación se restablece).
2. Asegurar que `varEnviando` (y cualquier flag de "enviando") se **resetee en `OnFailure`** del form,
   para que el botón no quede bloqueado si el submit falla.
3. Confirmar que el `Navigate(scrCorreo)` vive en `OnSuccess` del form (no en una rama que nunca corre).

---

## 3. Inconsistencia colateral

`scrCorreoPlantilla` **sigue referenciando la colección vieja `MyPeople`**, que `scrCorreo` ya no
crea (ahora usa `Destinatario`/`CC`). Codex renombró en una pantalla pero no en la otra.
**Revisar** si `scrCorreoPlantilla` quedó a medias o usa su propia colección a propósito.

> **Estado fuente:** `scrCorreoPlantilla` ya usa `Destinatario` en lugar de `MyPeople`, conserva el
> esquema proyectado `{DisplayName, UserPrincipalName, Mail}` y limpia `Destinatario`/`CC` en
> `OnVisible`. Falta abrir en Studio, Guardar/Publicar y validar que no haya X rojas.

---

## 4. Notas de proceso (Claude Release)

- **No pude correr el analizador de Power Fx offline** (`pac canvas unpack` falla con `PA3002` en
  esta app), así que esto es **análisis estático** sobre la fuente real, no la salida del compilador.
  La **lista definitiva de errores sale abriendo la app en Studio** (que sí corre el analizador).
- El `AppCheckerResult.sarif` embebido en el `.msapp` estaba **stale** (0 hallazgos), por eso no
  reflejó el estado roto.
- ⚠️ Las validaciones de empaquetado (SHA / mojibake / JSON / templates) **no detectan errores
  semánticos de fórmula**: por eso los paquetes `9a1d298` y `fd1f6f1` salieron "limpios" pese a la
  app rota. **Tras el fix, reempaco.**

## 5. Resumen accionable para Codex

| # | Qué | Dónde | Prioridad | Estado |
| --- | --- | --- | --- | --- |
| 1 | Unificar esquema de `Collect` (proyectar a `{DisplayName, UserPrincipalName, Mail}`) en los 3 puntos | `scrCorreo` (OnVisible, search OnSelect, browse gallery) — `Destinatario` y `CC` | 🔴 Alta | ✅ `f214298` |
| 2 | Quitar `Collect` dentro de `ForAll`; usar `Collect(CC, ForAll(...))` | `scrCorreo.OnVisible` | 🔴 Alta | ✅ `f214298` |
| 3 | Resetear `varEnviando` en `OnFailure`; confirmar `Navigate(scrCorreo)` en `OnSuccess` | `scrFDI` (botón Enviar solicitud / `CotizaciónForm`) | 🔴 Alta | ✅ fuente confirmada; ⏳ probar en Studio |
| 4 | **Alinear `scrCorreoPlantilla` (`MyPeople` → `Destinatario`/`CC`)** | `scrCorreoPlantilla` | 🟠 Media | ✅ fuente actualizada; ⏳ probar en Studio |
| 5 | Reabrir/reguardar `scrFDI` en Studio para re-normalizar `Controls/508.json` (`%RESERVED%`) | `scrFDI` | 🟡 Baja | ⏳ pendiente |
