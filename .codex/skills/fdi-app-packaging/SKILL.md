---
name: fdi-app-packaging
description: >-
  Validar y empaquetar la solución canvas app FDI como ZIP unmanaged importable
  en Power Platform. Úsala cuando haya que generar un paquete de la app FDI desde
  un commit. Captura el proceso de validación e integridad acordado (SHA triple,
  mojibake, registro de componentes, apertura del .msapp). NO modifica
  funcionalidad — solo valida y empaqueta.
---

# FDI — Empaquetado de la canvas app

Genera un ZIP **unmanaged** importable de la solución FDI (canvas app + flujos)
a partir de un commit, validando integridad. **Regla de oro: este proceso solo
valida y empaqueta. Nunca modifica fórmulas, controles, flujos ni metadata
funcional. No introduce cambios no solicitados.**

## 0. Preparación (HEAD limpio sobre el commit a empaquetar)

```bash
git pull                        # sincronizar con el remoto (obligatorio antes de todo)
git branch --show-current       # reportar rama actual
git rev-parse HEAD              # reportar HEAD
git log -1 --oneline            # reportar último commit
git status --short              # el árbol debe estar limpio (sin tracked modificados)
git checkout <COMMIT_HASH>      # o: omitir si ya estás en el tip que quieres empaquetar
git branch --show-current       # confirmar rama / detached tras el checkout
git rev-parse HEAD              # este es el COMMIT_HASH que se reportará
```

**Reportar al inicio** (antes de cualquier validación):
- Rama: `git branch --show-current`
- HEAD: `git rev-parse HEAD`
- Último commit: `git log -1 --oneline`

- Trabajar siempre sobre el repo Codex (fuente de verdad).
- Si `git status` muestra archivos *tracked* modificados sin commitear → **PARAR**.
  El empaquetado solo procede sobre contenido commiteado.

## 1. Protocolo SHA (git HEAD == disco == ZIP)

El `.msapp` que se empaqueta debe ser idéntico al de `git HEAD`:

```bash
git show HEAD:CanvasApps/mapc_fdi_412ec_DocumentUri.msapp | sha256sum   # SHA_git
sha256sum CanvasApps/mapc_fdi_412ec_DocumentUri.msapp                   # SHA_disco
```

`SHA_git == SHA_disco`; si no coinciden → archivo sin commitear o repo equivocado → PARAR.
Al final se re-verifica que el `.msapp` **dentro del ZIP** tenga el mismo SHA.

## 2. Detectar el formato del repo (¡crítico!)

El repo puede estar en uno de dos formatos. Inspeccionar `Other/Customizations.xml`:

| Formato | Señal | Cómo empaquetar |
|---|---|---|
| **pac-unpack (placeholders)** | contiene `<CanvasApps />` y `<Workflows />` vacíos | **ENSAMBLAR** customizations.xml (ver §5a) |
| **Export crudo de Studio** | tiene `<CanvasApp>` y `<Workflow>` **inline** | usar `Other/Customizations.xml` **tal cual** + restaurar prolog (§5b) |

## 3. Validaciones de integridad (obligatorias)

1. **CanvasApps y Workflows sincronizados**
   - `CanvasApps/`: `mapc_fdi_412ec_DocumentUri.msapp`, `_BackgroundImageUri`, `_AdditionalUris0_identity.json`.
   - `Workflows/`: cada `*.json` referenciado debe existir; child flow `Creación_FDI` con `<Subprocess>1</Subprocess>` en su `.json.data.xml` (o inline en customizations).
2. **Mojibake**: escanear el `.msapp` con `re.compile(rb'\xc3[\x82\x83]\xc2[\x80-\xbf]')`. Cero coincidencias.
3. **El `.msapp` abre correctamente** (integridad del documento):
   - Todos los `*.json` internos parsean (`json.loads`).
   - `Header.json` presente y coherente (DocVersion, MSAppStructureVersion).
   - Todo template usado por instancias en `Controls/*.json` y `Components/*.json` está
     registrado en `References/Templates.json` **y** no hay templates huérfanos.
     **Excepción PCF:** un code component de terceros insertado por Studio se
     auto-describe en la instancia (Template embebido con `DynamicControlDefinitionJson`)
     y **no** aparece en `Templates.json` — eso es correcto, no es huérfano.
   - Balance de paréntesis (ignorando literales de cadena) == 0 en las pantallas tocadas.
4. **Referencias y metadata críticas**
   - En el customizations final: `DocumentUri`, `BackgroundImageUri`, `AdditionalUris`
     y cada `JsonFileName` de workflow resuelven a entradas reales del ZIP.
   - `<CanvasApp>` y los `<Workflow>` están **registrados** en customizations.xml
     (si quedan `<CanvasApps />` / `<Workflows />` vacíos, el import procesa la
     solución pero **omite silenciosamente la app y los flujos** → la app no se actualiza).
   - `Other/Solution.xml` `<Version>` **no debe ser menor** que la instalada: una
     versión **menor se rechaza/omite** en la importación. **Igual o mayor procede**
     y, al ser unmanaged, los componentes (incl. la canvas app) **se sobrescriben** —
     una versión igual **no** bloquea la actualización. Bumpear igualmente en cada
     cambio es recomendable **por trazabilidad** (evita dos `.msapp` distintos con la
     misma `<Version>`/`<AppVersion>`), no por obligación técnica.
   - Reportar `<Version>` y `<AppVersion>`; si el `.msapp` cambió pero la versión no
     avanzó, anotarlo como **nota de trazabilidad** (no como bloqueo de despliegue).

## 4. `[Content_Types].xml`

Defaults `xml`/`json`/`msapp` (+ `js`/`css`/`resx` solo si hay `Controls/` embebidos)
y `<Override>` para `/CanvasApps/mapc_fdi_412ec_BackgroundImageUri`. Reutilizar el del
export bueno de referencia (`FDI_unmanaged_2026-06-09.zip`).

## 5. Generar el ZIP unmanaged

Estructura objetivo (**8 entradas**, **nunca incluir `*.meta.xml` ni `*.json.data.xml`**):
`[Content_Types].xml`, `customizations.xml`, `solution.xml`,
`CanvasApps/{_DocumentUri.msapp, _BackgroundImageUri, _AdditionalUris0_identity.json}`,
`Workflows/*.json`.

### 5a. Formato pac-unpack → ensamblar customizations.xml

1. Base = `Other/Customizations.xml`.
2. Reemplazar `<CanvasApps />` por `<CanvasApps>` + contenido de
   `CanvasApps/mapc_fdi_412ec.meta.xml` (quitar declaración XML y el `xmlns:xsi` del root del fragmento).
3. Reemplazar `<Workflows />` por `<Workflows>` + cada `Workflows/*.json.data.xml` (igual tratamiento).
4. `solution.xml` = `Other/Solution.xml` tal cual. Validar con `ET.fromstring`.

### 5b. Formato export crudo → usar tal cual + restaurar prolog

1. `customizations.xml` = `Other/Customizations.xml` y `solution.xml` = `Other/Solution.xml`,
   **verbatim**.
2. Si perdieron el prolog, restaurar al inicio:
   `\xef\xbb\xbf<?xml version="1.0" encoding="utf-8"?>\r\n` (el export bueno lo tiene; validar con `ET.fromstring`).

## 6. Verificación final del ZIP

- SHA del `.msapp` dentro del ZIP == `SHA_git`.
- 8 entradas, sin duplicados.
- customizations contiene `<CanvasApp>` y los `<Workflow>` (registro presente).
- Todas las referencias internas resuelven.
- Si hay PCF: instancias coherentes (Version embebida = la instalada; integridad
  preservada respecto al baseline de Studio).

## 7. Reporte

Reportar: nombre del ZIP, **commit hash empaquetado**, SHA del `.msapp`, versión de
solución, AppVersion, nº de entradas, y cualquier nota de despliegue (p. ej. si hay
`MissingDependency` de PCF, indicar que la solución PCF debe instalarse primero).

## 8. Commit, push y hash final

Después de validar y generar el ZIP:

```bash
git status --short              # ver si el proceso dejó cambios tracked
# Si hay cambios tracked (p. ej. corrección de error bloqueante documentada):
git add <archivos relevantes>   # NO incluir solutions/*.zip (no se commitean)
git commit -m "chore: package FDI unmanaged <fecha>"
git push
git rev-parse HEAD              # hash del commit final — este es el que se reporta
```

Si no hay cambios tracked (caso normal), omitir `add`/`commit`; igualmente ejecutar
`git push` por si había commits previos sin pushear y reportar `git rev-parse HEAD`.

## Reglas duras

- No modificar fórmulas, controles, flujos ni metadata funcional durante el empaquetado.
- No introducir cambios no solicitados.
- Si una validación falla de forma bloqueante → PARAR y reportar, no "arreglar" a mano.

Ver también: [[fdi-pcf-packaging]] para el componente PCF.
