param(
    [string]$SiteUrl = "https://montillacom.sharepoint.com/sites/Pruebas",
    [switch]$DeviceLogin
)

$ErrorActionPreference = "Stop"

$listTitle = "Usuarios FDI"

function Ensure-PnPConnection {
    try {
        Get-PnPWeb | Out-Null
    }
    catch {
        if ($DeviceLogin) {
            Connect-PnPOnline -Url $SiteUrl -DeviceLogin
        }
        else {
            Connect-PnPOnline -Url $SiteUrl -Interactive
        }
    }
}

function Get-FieldOrNull {
    param(
        [string]$List,
        [string]$Identity
    )

    try {
        return Get-PnPField -List $List -Identity $Identity -ErrorAction Stop
    }
    catch {
        return $null
    }
}

function Ensure-BooleanField {
    param(
        [string]$List,
        [string]$DisplayName,
        [string]$InternalName,
        [bool]$DefaultValue = $false
    )

    if (-not (Get-FieldOrNull -List $List -Identity $InternalName)) {
        Add-PnPField -List $List -DisplayName $DisplayName -InternalName $InternalName -Type Boolean -AddToDefaultView | Out-Null
    }

    Set-PnPField -List $List -Identity $InternalName -Values @{ DefaultValue = $(if ($DefaultValue) { "1" } else { "0" }) }
}

Ensure-PnPConnection

if (-not (Get-PnPList -Identity $listTitle -ErrorAction SilentlyContinue)) {
    New-PnPList -Title $listTitle -Template GenericList -EnableVersioning | Out-Null
}

if (-not (Get-FieldOrNull -List $listTitle -Identity "Usuario")) {
    Add-PnPField -List $listTitle -DisplayName "Usuario" -InternalName "Usuario" -Type User -AddToDefaultView | Out-Null
}

if (-not (Get-FieldOrNull -List $listTitle -Identity "EmailNormalizado")) {
    Add-PnPField -List $listTitle -DisplayName "EmailNormalizado" -InternalName "EmailNormalizado" -Type Text -AddToDefaultView | Out-Null
}

if (-not (Get-FieldOrNull -List $listTitle -Identity "Rol")) {
    $rolFieldXml = @"
<Field Type="Choice" DisplayName="Rol" Name="Rol" StaticName="Rol">
  <CHOICES>
    <CHOICE>Usuario normal</CHOICE>
    <CHOICE>Coordinador</CHOICE>
    <CHOICE>Administrador</CHOICE>
  </CHOICES>
  <Default>Usuario normal</Default>
</Field>
"@
    Add-PnPFieldFromXml -List $listTitle -FieldXml $rolFieldXml -AddToDefaultView | Out-Null
}

Ensure-BooleanField -List $listTitle -DisplayName "Activo" -InternalName "Activo" -DefaultValue $true

if (-not (Get-FieldOrNull -List $listTitle -Identity "VendedorRelacionado")) {
    $vendedoresList = Get-PnPList -Identity "Vendedores"
    $vendedorRelacionadoFieldXml = @"
<Field Type="Lookup" DisplayName="VendedorRelacionado" Name="VendedorRelacionado" StaticName="VendedorRelacionado" List="{$($vendedoresList.Id)}" ShowField="Title" />
"@
    Add-PnPFieldFromXml -List $listTitle -FieldXml $vendedorRelacionadoFieldXml -AddToDefaultView | Out-Null
}

Ensure-BooleanField -List $listTitle -DisplayName "PuedeVerTodo" -InternalName "PuedeVerTodo"
Ensure-BooleanField -List $listTitle -DisplayName "PuedeAsignar" -InternalName "PuedeAsignar"
Ensure-BooleanField -List $listTitle -DisplayName "PuedeEditarMaestros" -InternalName "PuedeEditarMaestros"

foreach ($fieldName in @("EmailNormalizado", "Activo", "Rol", "VendedorRelacionado")) {
    $field = Get-FieldOrNull -List $listTitle -Identity $fieldName
    if ($field -and -not $field.Indexed) {
        Set-PnPField -List $listTitle -Identity $fieldName -Values @{ Indexed = $true }
    }
}

Write-Host "Lista '$listTitle' verificada en $SiteUrl."
