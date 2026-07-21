---
name: fdi-msapp-integrity
description: >-
  Verificar SIEMPRE la integridad interna de un .msapp de la canvas app FDI antes
  de empaquetar o desplegar. Atrapa los .msapp producidos por round-trip de YAML
  (editar Src/*.pa.yaml y re-zipear) que dejan Controls/ (lo compilado/runtime)
  desincronizado respecto a Src/ (la fuente), con Header/AppVersion congelados.
  Úsala al validar cualquier commit que toque el .msapp, y como paso obligatorio
  dentro de fdi-app-packaging. NO modifica funcionalidad — solo verifica.
---

# FDI — Integridad del `.msapp` (verificación obligatoria)

Un `.msapp` válido tiene **dos representaciones que DEBEN coincidir**:

- `Src/*.pa.yaml` — el **código fuente** (lo que se edita / se ve en Studio).
- `Controls/*.json` — la representación **compilada** que consume el runtime al importar/reproducir.

Power Apps **Studio** mantiene ambas en sync al **Guardar/Publicar** (y bumpea `AppVersion` +
`Header.LastSaved`). Un flujo que **edita solo `Src/` y re-zipea** (round-trip YAML) deja `Controls/`
**stale** → los cambios pueden **no surtir efecto en la app publicada** aunque se vean en Studio.
Esta skill detecta exactamente eso.

> **Regla de proceso:** el `.msapp` **canónico** (con `Src/` == `Controls/`) se produce **desde Power
> Apps Studio** (Guardar/Publicar). El empaquetado final (ZIP de solución) es de Claude Release vía
> [[fdi-app-packaging]]; **esta verificación es un paso previo obligatorio**.

## Rol y alcance (importante)

Esta skill es una **compuerta de validación de Claude Release**, NO un paso del loop de Codex.

- **Codex desarrolla sobre `Src/*.pa.yaml`** y eso está bien: editar la fuente es su trabajo. Codex
  **no** tiene Power Apps Studio interactivo y `pac canvas (un)pack` **no puede** round-tripear esta
  app (falla con `PA3002` por el code component PCF). Por eso Codex **no puede producir un `.msapp`
  canónico** ni "pasar" este check — **no se le exige correrlo**.
- **El usuario** (quien sí tiene Studio) produce el `.msapp` canónico: abre la app en Studio (lee
  `Src/`, muestra los cambios de Codex) y **Guarda/Publica** (regenera `Controls/` + bumpea
  `AppVersion`). Ese `.msapp` es el que se commitea para desplegar.
- **Claude Release** corre esta verificación **antes de empaquetar**. Un **FAIL sobre un commit de
  Codex aún no pasado por Studio es ESPERADO** y solo significa: *"falta el guardado por Studio; no
  empaquetar todavía"*. No es un defecto de Codex.

Flujo: **Codex** edita `Src/` → **usuario** Guarda/Publica en Studio → **Claude Release** valida
(`fdi-msapp-integrity`) y empaqueta (`fdi-app-packaging`).

## Cuándo usarla

- **Siempre** antes de empaquetar (paso previo de `fdi-app-packaging`).
- Al validar cualquier commit que cambie `CanvasApps/*_DocumentUri.msapp`.
- Cuando se sospeche que un cambio (pantalla nueva, refactor, ajuste de propiedades) no se reflejó.

## Cómo correrla

```bash
python3 .codex/skills/fdi-msapp-integrity/validate_msapp.py            # el .msapp del repo
python3 .codex/skills/fdi-msapp-integrity/validate_msapp.py <ruta.msapp>
```

- **Exit code ≠ 0 ⇒ hay FAIL ⇒ BLOQUEANTE** (no empaquetar / no desplegar; reportar y pedir
  regeneración desde Studio).
- **WARN** no bloquea, pero se reporta siempre.

## Qué verifica (los "temas")

| # | Chequeo | Tipo | Qué atrapa |
| --- | --- | --- | --- |
| 0 | **`Src/*.pa.yaml` válido** (parsea + sin claves duplicadas) | **FAIL** | YAML que Studio **no puede abrir** (`PA1001 YamlInvalidSyntax`, p. ej. propiedad duplicada en un control tras el split) |
| 1 | Todos los JSON internos parsean + `Header` coherente (DocVersion, MSAppStructureVersion) | FAIL | `.msapp` corrupto |
| 2 | **`Src/` ↔ `Controls/`: mismo set de pantallas** | **FAIL** | pantallas en `Src/` no compiladas (split/alta de pantalla por round-trip) — *el caso que motivó esta skill* |
| 3 | Conteo de controles por pantalla común sin divergencia gruesa (> 3×) | WARN | `Controls/` stale en una pantalla existente |
| 4 | **Mojibake** (`\xc3..\xc2..`) = 0 | FAIL | doble-encoding de acentos |
| 5 | Templates usados ⊆ registrados (PCF/first-party exentos) | FAIL | control sin su template (rompe el import) |
| 6 | `AppVersion` **única por binario** (no repetida entre `.msapp` distintos) | WARN | no se está guardando por Studio / no se bumpea versión |

> El conteo Src(`Control:`) vs Controls(JSON) tiene un sesgo de método estable (~1.7×) aun en
> `.msapp` sanos; por eso #3 es WARN con umbral alto y el chequeo **duro** de staleness es #2 (set de
> pantallas). #6 es WARN porque un binario consistente podría, en teoría, reusar versión; pero en la
> práctica indica el flujo round-trip-sin-Studio.

## Interpretación y remediación

- **FAIL en #2 (pantallas en Src/ sin compilar) o #3 con ratio enorme:** el `.msapp` **no es
  canónico**. **No empaquetar.** Pedir a Codex que **abra la app en Power Apps Studio y
  Guarde/Publique** (regenera `Controls/`, `Header` y bumpea `AppVersion`), y commitee ese `.msapp`.
- **WARN #6 (AppVersion repetida):** señal de que los `.msapp` no se generan por Studio; aunque #2
  pase, conviene insistir en el flujo Studio para trazabilidad y para evitar staleness de contenido
  no estructural (p. ej. propiedades como `DelayOutput`) que esta verificación no puede comparar sin
  recompilar.

## Reglas duras

- Esta skill **solo verifica**; no edita el `.msapp` ni la funcionalidad.
- Un FAIL es **bloqueante**: se reporta y se detiene el empaquetado, no se "arregla" a mano.

Ver también: [[fdi-app-packaging]] (empaquetado del ZIP) · [[fdi-pcf-packaging]] (PCF).
