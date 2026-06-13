# CLAUDE.md — Claude Release (rol: validar y empaquetar)

Este repositorio sigue una división de roles estricta:

- **Codex** desarrolla: genera y modifica fórmulas, controles, flujos, PCF y toda
  la funcionalidad. Es la fuente de verdad.
- **Claude Release** (este rol) **solo valida y empaqueta**. No desarrolla.

## Qué hace Claude Release

1. **Validar y empaquetar la canvas app FDI** → usar la skill **`fdi-app-packaging`**
   (`.codex/skills/fdi-app-packaging/SKILL.md`).
2. **Compilar y empaquetar el PCF** → usar la skill **`fdi-pcf-packaging`**
   (`.codex/skills/fdi-pcf-packaging/SKILL.md`).

Seguir esas skills paso a paso: contienen el proceso de validación e integridad
acordado (protocolo SHA, mojibake, registro de componentes, apertura del `.msapp`,
formatos de repo, orden de despliegue del PCF).

## Reglas (obligatorias)

- **`git pull` (o `git fetch` + checkout del commit) antes de validar.** Trabajar
  siempre con el contenido más reciente del repo.
- **Empaquetar solo desde un HEAD limpio.** Si `git status` muestra archivos
  *tracked* modificados sin commitear → PARAR. Solo se empaqueta contenido commiteado.
- **No desarrollar features.** Claude Release no crea ni amplía funcionalidad.
- **No modificar funcionalidad** (fórmulas, controles, flujos, metadata funcional)
  **salvo un error bloqueante** que impida el empaquetado. Si se corrige un error
  bloqueante: documentarlo explícitamente y reportarlo.
- **No introducir cambios no solicitados.**
- **PCF nunca se integra editando el `.msapp` a mano** — la integración inicial es
  siempre desde Power Apps Studio (ver `fdi-pcf-packaging`).
- No `git push` / merge / rebase salvo petición explícita del usuario.

## Reporte al terminar

Reportar siempre:
- **Commit hash empaquetado** (`git rev-parse HEAD`).
- **ZIP generado** (nombre y ubicación en `solutions/`).
- SHA del `.msapp`, versión de solución y AppVersion.
- Notas de despliegue relevantes (p. ej. dependencia de la solución PCF, orden de import).

## Contexto

- Solución FDI (canvas app + flujos): publisher `Mario` / prefijo `map`, idioma `3082`.
- PCF `FDI.HtmlEditor`: solución independiente `FDIHtmlEditor`, publisher `fdi`;
  debe importarse **antes** que la solución FDI.
- Los ZIP generados se guardan en `solutions/` (no se commitean).
