# Inventario SharePoint FDI

Este directorio contiene el inventario de metadata del sitio SharePoint usado por FDI.

Sitio:

```text
https://montillacom.sharepoint.com/sites/Pruebas
```

## Ejecución

Usa PowerShell 7 y PnP.PowerShell 3.x:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\export-sharepoint-metadata.ps1
```

El script intenta autenticarse primero con:

```powershell
Connect-PnPOnline -Url $SiteUrl -DeviceLogin
```

Si el tenant requiere una App Registration de Entra ID, ejecuta con el client id aprobado:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\export-sharepoint-metadata.ps1 -ClientId "<ENTRA_APP_CLIENT_ID>"
```

La App Registration debe estar autorizada para lectura de metadata del sitio según la política del tenant. Para este inventario no se requieren permisos de escritura.

## Seguridad

El script es de solo lectura. No usa `Remove-PnPList`, `Remove-PnPField`, `Set-PnPList`, `Set-PnPField` ni cmdlets equivalentes de modificación. No descarga registros de negocio ni adjuntos.

## Salidas

- `sharepoint-schema.json`
- `sharepoint-lists.csv`
- `sharepoint-columns.csv`
- `sharepoint-views.csv`
- `sharepoint-indexes.csv`
- `sharepoint-audit.md`
- `delete-candidates.md`

## Referencias manuales

- `FDI_System_Lists_Field_Reference.md`: modelo normalizado de listas
  SharePoint, campos por lista y tipos de dato recomendados para cargar o crear
  la persistencia de los sistemas de `scrFDI`.
- `FDI_RBAC_Lists_Field_Reference.md`: listas y campos de control de acceso por
  roles (`Usuarios`, `Permisos`), con la matriz de permisos como datos semilla.
