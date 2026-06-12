# FDI Import Validation - 2026-06-09

## Resultado

- ZIP generado: `C:\Users\alejandra-mendoza\Documents\FDI PowerApp\FDI_portable_no_pcf_unmanaged.zip`
- Tipo: unmanaged
- Herramienta: Power Platform CLI `pac` 2.8.1 instalada localmente en `D:\codex_fdi_work\pac_tool\pac.exe`
- Staging limpio usado para empaquetar: `D:\codex_fdi_work\solution_staging`

## Comando Usado

```powershell
D:\codex_fdi_work\pac_tool\pac.exe solution pack `
  --folder D:\codex_fdi_work\solution_staging `
  --zipfile D:\codex_fdi_work\FDI_portable_no_pcf_unmanaged.zip `
  --packagetype Unmanaged
```

## Validaciones

- `pac solution pack` finalizo con `Unmanaged Pack complete`.
- El ZIP final contiene 10 entradas de solucion y un solo Canvas App `.msapp`.
- El ZIP no contiene carpetas auxiliares como `.git`, `work` o `docs`.
- Busqueda de referencias PCF externas en el ZIP: 0 coincidencias para `OFRns`, `hto_`, `TinyMCE`, `CodexControls`, `RichTextAttachments`, `RAW.ColorPicker` y `raw_RAW.ColorPicker`.
- Busqueda anidada dentro de `CanvasApps/mapc_fdi_412ec_DocumentUri.msapp`: 0 coincidencias para las mismas referencias.
- `Properties.json` dentro del `.msapp` reporta `LocalDatabaseReferences` como `{}`.
- `ControlCount` ya no contiene `raw_RAW.ColorPicker.ColorPicker`.
- Los 5 selectores de color fueron contabilizados como controles estandar `PowerApps_CoreControls_TextInputCanvas`.

## Nota Operativa

No empaquetar desde una raiz que contenga `.git`, `work`, ZIPs previos u otros artefactos auxiliares. Para reproducir el empaquetado, usar una carpeta limpia con solo `CanvasApps`, `Other` y `Workflows`, o eliminar artefactos no-solucion antes de ejecutar `pac solution pack`.
