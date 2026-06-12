# PCF Packaging Guide — FDI HTML Editor

Guía definitiva para empaquetar y actualizar este control PCF en Power Apps Canvas App.
Basada en errores reales encontrados durante el desarrollo.

---

## Estructura del proyecto

```
pcf/FDIHtmlEditor/
├── FDIHtmlEditor/                  ← Fuentes del control
│   ├── ControlManifest.Input.xml   ← Versión del control (bump aquí)
│   ├── index.ts                    ← Código TypeScript del control
│   ├── css/FDIHtmlEditor.css       ← Estilos
│   ├── strings/
│   │   └── FDIHtmlEditor.1033.resx ← Labels en inglés (requerido por Canvas App)
│   └── generated/                  ← Auto-generado, no editar
├── Solution/
│   ├── Solution.cdsproj            ← Proyecto de solución MSBuild
│   ├── src/
│   │   └── Other/
│   │       └── Solution.xml        ← Versión de la solución (bump aquí)
│   └── bin/Release/
│       └── Solution.zip            ← ZIP listo para importar en Power Apps
├── FDIHtmlEditor.pcfproj
└── package.json
```

---

## Regla de oro del build

> **NUNCA ejecutar `npm run build` antes del build de la solución.**
>
> `npm run build` genera un bundle en **modo desarrollo** (usa `eval()`).
> Power Apps tiene una Content Security Policy (CSP) que bloquea `eval()`, por lo que
> el componente falla silenciosamente y Power Apps muestra la versión anterior cacheada.
>
> El comando correcto invoca `pcf-scripts` con `--buildMode production` automáticamente.

---

## Comando de build (el único correcto)

```powershell
# Desde la raíz del repo (ajusta la ruta si es necesario)
cd pcf/FDIHtmlEditor

# 1. Limpiar output anterior (OBLIGATORIO para forzar rebuild de producción)
Remove-Item -Recurse -Force out -ErrorAction SilentlyContinue

# 2. Build completo en modo producción + empaquetado de solución
cd Solution
dotnet build --configuration Release
```

**En Linux/Mac:**
```bash
cd pcf/FDIHtmlEditor
rm -rf out/
cd Solution
dotnet build --configuration Release
```

El ZIP resultante queda en:
```
pcf/FDIHtmlEditor/Solution/bin/Release/Solution.zip
```

---

## Cuándo hacer bump de versión

**Siempre que cambies cualquier archivo del control**, debes subir AMBAS versiones
antes de hacer el build. Power Apps usa estas versiones para decidir si actualiza el bundle.
Si las versiones son iguales a las ya instaladas, el bundle NO se reemplaza.

### Archivo 1: `FDIHtmlEditor/ControlManifest.Input.xml`

```xml
<control namespace="FDI" constructor="HtmlEditor" version="1.5.0" ...>
<!--                                                        ↑ subir este número -->
```

### Archivo 2: `Solution/src/Other/Solution.xml`

```xml
<Version>1.5</Version>
<!--      ↑ subir este número -->
```

### Convención de versiones sugerida

| Tipo de cambio | Ejemplo |
|---|---|
| Hotfix / ajuste menor | 1.4.0 → 1.4.1 |
| Nueva feature / cambio visible | 1.4.0 → 1.5.0 |
| Cambio de propiedades del manifest | 1.4.0 → 2.0.0 |

---

## Verificar que el build es correcto

Después del build, comprueba que el bundle es producción:

```bash
# Debe imprimir 0 (ningún eval en producción)
grep -c "eval(" Solution/bin/Release/Solution.zip 2>/dev/null || \
  unzip -p Solution/bin/Release/Solution.zip "Controls/fdi_FDI.HtmlEditor/bundle.js" | grep -c "eval("

# Debe ser ~30 KB (minificado). Si es ~48 KB, es desarrollo — empieza de nuevo.
unzip -l Solution/bin/Release/Solution.zip | grep bundle.js
```

---

## Commit y push al repo

El directorio `Solution/bin/` está en `.gitignore`, por lo que el ZIP debe añadirse
con force para que esté disponible en el repo:

```bash
# Añadir fuentes y ZIP
git add pcf/FDIHtmlEditor/FDIHtmlEditor/ControlManifest.Input.xml
git add pcf/FDIHtmlEditor/FDIHtmlEditor/index.ts
git add pcf/FDIHtmlEditor/FDIHtmlEditor/css/FDIHtmlEditor.css
git add pcf/FDIHtmlEditor/Solution/src/Other/Solution.xml
git add -f pcf/FDIHtmlEditor/Solution/bin/Release/Solution.zip   # ← -f por el .gitignore

git commit -m "feat: descripción del cambio (vX.Y.Z)"
git push origin <branch>
```

---

## Importar a Power Apps

### Primera vez (instalación limpia)

1. `make.powerapps.com` → **Solutions** → **Import solution**
2. Selecciona `Solution/bin/Release/Solution.zip`
3. Sigue el asistente → **Import**
4. No debe haber errores (sí puede haber warning de idioma 1033 si la org usa español)

### Actualizaciones siguientes

> ⚠️ **Problema conocido de Power Apps**: al eliminar una solución, el componente PCF
> queda como "huérfano" en la Default Solution. Las reimportaciones actualizan la solución
> pero NO reemplazan el bundle huérfano. El Canvas App siempre carga el bundle del huérfano.

**Antes de reimportar una actualización:**

1. `make.powerapps.com` → **Solutions** → **Default Solution**
2. Filtra por tipo: **Custom controls**
3. Encuentra `FDI.HtmlEditor` → `...` → **Delete**
4. Luego reimporta el ZIP normalmente

**Alternativa con PAC CLI** (más confiable):
```powershell
pac auth create --url https://TU-ORG.crm.dynamics.com
pac solution import --path "Solution/bin/Release/Solution.zip" --force-overwrite
```

### Añadir a un Canvas App

1. Abrir la app en modo edición en Power Apps Studio
2. Panel izquierdo → **Insert** → **Get more components**
3. Pestaña **Code** → busca **FDI HTML Editor**
4. Seleccionar → **Import**
5. El componente aparece en la sección **Code components** del panel de inserción

---

## Propiedades del componente

| Propiedad | Tipo | Dirección | Descripción |
|---|---|---|---|
| `DefaultHtml` | Texto multilínea | Input | HTML inicial al abrir el editor |
| `HtmlText` | Texto multilínea | Bound (output) | HTML sanitizado actual del editor |

**Ejemplo de uso en Canvas App:**
```
# Leer el HTML del editor
Set(varHtmlBody, FDIHtmlEditor1.HtmlText)

# Pasar HTML inicial
FDIHtmlEditor1.DefaultHtml = varPlantilla
```

---

## Checklist rápido para IAs

Antes de empaquetar, verificar:

- [ ] ¿Se modificó `index.ts` o `css`? → bumped `ControlManifest.Input.xml` version
- [ ] ¿Se modificó el manifest o cualquier fuente? → bumped `Solution.xml` version
- [ ] ¿El directorio `out/` fue eliminado antes del build?
- [ ] ¿El build fue `dotnet build --configuration Release` desde `Solution/`? (NO `npm run build`)
- [ ] ¿El bundle.js resultante es < 35 KB? (producción = ~30 KB, desarrollo = ~48 KB)
- [ ] ¿El ZIP fue añadido con `git add -f`?

---

## Errores comunes y soluciones

| Síntoma | Causa | Solución |
|---|---|---|
| Componente importado pero muestra versión vieja | Bundle huérfano en Default Solution | Eliminar `FDI.HtmlEditor` de Default Solution antes de reimportar |
| "no se pudieron importar los componentes" en Canvas App | Falta archivo `.resx` de strings | Verificar que `strings/FDIHtmlEditor.1033.resx` existe y está en el manifest |
| Warning: "language 1033 not enabled" | La org usa un idioma diferente al inglés | Warning no crítico; el componente funciona igual |
| Bundle de 48 KB en el ZIP | Se ejecutó `npm run build` antes del `dotnet build` | Eliminar `out/`, re-ejecutar solo `dotnet build --configuration Release` |
| MSBuild error MSB3577 (collision) | Múltiples resx del mismo idioma base | Dejar un solo archivo resx por idioma |
| Power Apps muestra área en blanco | El bundle usa `eval()` (modo desarrollo) | Ver "Bundle de 48 KB" arriba |
