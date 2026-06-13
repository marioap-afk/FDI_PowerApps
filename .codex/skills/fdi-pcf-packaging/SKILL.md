---
name: fdi-pcf-packaging
description: >-
  Compilar y empaquetar el code component PCF FDI HtmlEditor como solución
  independiente para Power Platform. Úsala cuando cambie el código del PCF
  (pcf/FDIHtmlEditor/) y haya que regenerar el bundle y/o el ZIP de solución PCF.
  Regla central: el PCF NUNCA se integra al canvas app editando el .msapp a mano;
  la integración inicial siempre se hace desde Power Apps Studio.
---

# FDI — Empaquetado del PCF (FDI HtmlEditor)

Compila y empaqueta el code component **`FDI.HtmlEditor`** (editor HTML para los
cuerpos de correo) como **solución PCF independiente**. El PCF vive en su propia
solución (`FDIHtmlEditor`, publisher `fdi`), separada de la solución FDI principal.

Fuente: `pcf/FDIHtmlEditor/`
Manifest: `pcf/FDIHtmlEditor/FDIHtmlEditor/ControlManifest.Input.xml`

## ⚠️ Regla central (no negociable)

**El PCF NUNCA se inyecta al canvas app editando la metadata del `.msapp` a mano.**
Se probó repetidamente: editar `References/Templates.json` / `DynamicControlDefinitionJson`
/ los `Controls/*.json` a mano produce un `.msapp` que **importa pero no abre**
("Error al abrir el archivo"), tanto con el template registrado como sin registrar.

**La integración inicial del PCF en la app se hace SIEMPRE desde Power Apps Studio:**
Studio → *Configuración → Próximas funciones → Componentes de código para canvas* →
*Insertar → Obtener más componentes → Código → `FDI.HtmlEditor`* → conectar
`DefaultHtml`/`HtmlText` → **Guardar y Publicar** → **Exportar** la solución.
Ese `.msapp` autorizado por Studio es el baseline. Edits posteriores: solo
`Src/*.pa.yaml` y repaquetar con `pac canvas pack` (sin tocar la metadata del PCF).

## 0. Preparación

```bash
git pull                        # sincronizar con el remoto (obligatorio antes de todo)
git branch --show-current       # reportar rama actual
git rev-parse HEAD              # reportar HEAD
git log -1 --oneline            # reportar último commit
git status --short              # el árbol debe estar limpio
git checkout <COMMIT_HASH>      # o: omitir si ya estás en el tip que quieres empaquetar
git branch --show-current       # confirmar rama / detached tras el checkout
git rev-parse HEAD              # commit que se reportará
cd pcf/FDIHtmlEditor
```

**Reportar al inicio** (antes de cualquier build o validación):
- Rama: `git branch --show-current`
- HEAD: `git rev-parse HEAD`
- Último commit: `git log -1 --oneline`

Requiere `node`/`npm` (y `pac` para empaquetar la solución). Si no están en el PATH
del entorno → reportar que el build del PCF no puede ejecutarse aquí y entregar
los pasos manuales.

## 1. Build

```bash
npm install        # primera vez o si cambió package.json
npm run build      # pcf-scripts build → genera bundle.js
```

## 2. Validar build exitoso

- `npm run build` termina sin errores.
- Se generó `out/controls/.../bundle.js` (build de producción, sin `eval()` —
  Power Apps bloquea `eval` por CSP).

## 3. Validar el manifest (`ControlManifest.Input.xml`)

- **namespace/control**: `namespace="FDI"` constructor `="HtmlEditor"` →
  identificador del control `fdi_FDI.HtmlEditor` (prefijo del publisher `fdi`).
  **No cambiar** namespace/constructor/prefijo: cambiarlos genera otro
  identificador y rompe las referencias ya instaladas en la canvas app.
- **version**: subir en cada cambio funcional (p. ej. 1.5.1 → 1.5.2). El bump de
  versión del manifest es lo que fuerza a Power Apps a descargar el bundle nuevo.
- **Propiedades input/output**:
  - `DefaultHtml` — `of-type="Multiple"`, `usage="input"` (HTML inicial).
  - `HtmlText` — `of-type="Multiple"`, `usage="bound"` (salida sanitizada).
- **Etiqueta de versión vs manifest**: la versión mostrada en el footer del editor
  NO debe estar hardcodeada divergiendo del manifest (incidente: `index.ts` decía
  `"v1.5.0"` con manifest en 1.5.1). Idealmente derivar la versión del manifest en
  build; mínimo, mantenerlas iguales.

## 4. Empaquetar la solución PCF (cuando aplique)

La solución PCF es independiente:
- `UniqueName` = `FDIHtmlEditor` (no el genérico `Solution`).
- Publisher `fdi` / prefijo `fdi`.
- Contiene `Controls/fdi_FDI.HtmlEditor/` (bundle.js, css, resx, ControlManifest.xml),
  `customizations.xml` (registra `<CustomControl>`), `solution.xml`, `[Content_Types].xml`.

```bash
# vía cdsproj / msbuild o:
pac solution pack --zipfile solutions/FDI_PCFHtmlEditor_unmanaged_<ver>_<fecha>.zip \
  --folder pcf/FDIHtmlEditor/Solution/src
```

Validar el ZIP resultante: el `ControlManifest.xml` interno tiene la versión correcta;
`customizations.xml` registra `<CustomControl>` con `Name = fdi_FDI.HtmlEditor`
(es correcto que registre `<CustomControl>` y NO `<CanvasApp>` — es su tipo).

## 5. Orden de despliegue

La solución PCF debe importarse en el entorno **antes** que la solución FDI: la
app la referencia como componente preinstalado (`MissingDependency` en el
`solution.xml` de FDI). Para integrarla a la app, ver la regla central (§ Studio).

## 6. Reporte

Reportar: nombre del ZIP PCF, **commit hash empaquetado**, versión del manifest/control,
namespace/constructor, y recordatorio del orden de importación (PCF primero).

## 7. Commit, push y hash final

Después de validar y generar el ZIP PCF:

```bash
git status --short              # ver si el proceso dejó cambios tracked
# Si hay cambios tracked (p. ej. bump de versión en manifest):
git add <archivos relevantes>   # NO incluir solutions/*.zip (no se commitean)
git commit -m "chore: package FDI PCF HtmlEditor v<ver>"
git push
git rev-parse HEAD              # hash del commit final — este es el que se reporta
```

Si no hay cambios tracked, omitir `add`/`commit`; igualmente ejecutar `git push`
por si había commits previos sin pushear y reportar `git rev-parse HEAD`.

Ver también: [[fdi-app-packaging]] para la solución canvas app.
