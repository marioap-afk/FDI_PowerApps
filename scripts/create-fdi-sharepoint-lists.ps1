<#
.SYNOPSIS
  Crea las listas SharePoint de captura de sistemas FDI (detalle + tablas hijas + puente)
  según docs/sharepoint/FDI_System_Lists_Field_Reference.md.

.DESCRIPTION
  Idempotente: crea lo que falte y omite lo que ya existe. DECISIÓN: las medidas se
  crean como Texto (no se fijan unidades; el usuario incluye la unidad en el valor).
  Solo 'SistemaID' y 'Orden' (internos de la app) son Number. Los lookups apuntan a
  las listas 'Cotizaciones' (padre) y 'Sistemas por cotización' (puente).

  NO crea ni borra la lista padre 'Cotizaciones' (tiene su propio esquema y la usa la app).
  Sí puede crear/recrear el puente y las listas de sistemas.

.PREREQUISITOS
  - Módulo PnP.PowerShell:  Install-Module PnP.PowerShell -Scope CurrentUser
  - La lista padre 'Cotizaciones' debe existir en el sitio.
  - Permisos para crear listas/columnas en el sitio.

.PERMISOS / CONEXIÓN  (PnP.PowerShell 2.x ya NO trae app por defecto)
  El primer login pide iniciar sesión y CONSENTIR permisos (a veces requiere admin).
  Registra UNA SOLA VEZ tu propia app de Entra ID y luego conéctate con su ClientId:

    Register-PnPEntraIDAppForInteractiveLogin `
      -ApplicationName "FDI-PnP-Provisioning" `
      -Tenant "TENANT.onmicrosoft.com" -Interactive
    # te devuelve un ClientId (GUID). Consiente los permisos de SharePoint cuando lo pida.

  Permisos que pedirá (delegados; actúas con TU usuario): SharePoint AllSites.FullControl
  (crear listas/columnas) + Graph User.Read básico. Es un consentimiento único.

.EJEMPLO
  ./create-fdi-sharepoint-lists.ps1 -Url "https://TENANT.sharepoint.com/sites/FDI" -ClientId "<GUID>" -DryRun
  ./create-fdi-sharepoint-lists.ps1 -Url "..." -ClientId "<GUID>"                  # crear
  ./create-fdi-sharepoint-lists.ps1 -Url "..." -ClientId "<GUID>" -DeviceLogin     # si no abre navegador
  ./create-fdi-sharepoint-lists.ps1 -Url "..." -ClientId "<GUID>" -DropExisting    # recrea listas de sistemas (NO el padre)
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Url,
  [string]$ClientId,
  [string]$Tenant,
  [switch]$DeviceLogin,
  [switch]$DropExisting,
  [switch]$DryRun,
  [string]$ParentList = "Cotizaciones",
  [string]$BridgeList = "Sistemas por cotización"
)

$ErrorActionPreference = "Stop"

# ---------- helpers ----------
function Get-InternalName([string]$s) {
  $d = $s.Normalize([Text.NormalizationForm]::FormD)
  $sb = New-Object Text.StringBuilder
  foreach ($c in $d.ToCharArray()) {
    if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($c) -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$sb.Append($c)
    }
  }
  $name = ($sb.ToString() -replace '[^A-Za-z0-9]', '')
  if ($name.Length -gt 32) { $name = $name.Substring(0, 32) }  # límite de internal name en SharePoint
  return $name
}

# Definición compacta de columnas: T = Text|Note|Boolean|Number|Choice|Lookup
function Col($d, $t, $choices = $null, $target = $null, $idx = $false, $req = $false) {
  [pscustomobject]@{ D = $d; T = $t; Choices = $choices; Target = $target; Idx = $idx; Req = $req }
}

function Ensure-List($title) {
  $l = Get-PnPList -Identity $title -ErrorAction SilentlyContinue
  if ($null -ne $l) { Write-Host "= lista existe: $title" -ForegroundColor DarkGray; return }
  if ($DryRun) { Write-Host "+ (dry) crear lista: $title" -ForegroundColor Yellow; return }
  New-PnPList -Title $title -Template GenericList -OnQuickLaunch:$false | Out-Null
  Write-Host "+ lista creada: $title" -ForegroundColor Green
}

function Ensure-Field($listTitle, $col) {
  $internal = Get-InternalName $col.D
  if (-not $DryRun) {
    $existing = Get-PnPField -List $listTitle -Identity $internal -ErrorAction SilentlyContinue
    if ($existing) { Write-Host "  = $($col.D)" -ForegroundColor DarkGray; return }
  }
  if ($DryRun) { Write-Host "  + (dry) $($col.D) [$($col.T)]$(if($col.Idx){' idx'})" -ForegroundColor Yellow; return }

  switch ($col.T) {
    "Text"    { Add-PnPField -List $listTitle -DisplayName $col.D -InternalName $internal -Type Text    -AddToDefaultView | Out-Null }
    "Note"    { Add-PnPField -List $listTitle -DisplayName $col.D -InternalName $internal -Type Note | Out-Null }
    "Boolean" { Add-PnPField -List $listTitle -DisplayName $col.D -InternalName $internal -Type Boolean | Out-Null }
    "Number"  { Add-PnPField -List $listTitle -DisplayName $col.D -InternalName $internal -Type Number  -AddToDefaultView | Out-Null }
    "Choice"  { Add-PnPField -List $listTitle -DisplayName $col.D -InternalName $internal -Type Choice -Choices $col.Choices -AddToDefaultView | Out-Null }
    "Lookup"  {
      $t = Get-PnPList -Identity $col.Target -ErrorAction SilentlyContinue
      if (-not $t) { Write-Warning "  Lookup '$($col.D)' omitido: la lista destino '$($col.Target)' no existe."; return }
      $xml = "<Field Type='Lookup' DisplayName='$($col.D)' Name='$internal' StaticName='$internal' List='{$($t.Id)}' ShowField='Title' />"
      Add-PnPFieldFromXml -List $listTitle -FieldXml $xml | Out-Null
    }
    default { Write-Warning "  Tipo desconocido '$($col.T)' en $($col.D)"; return }
  }
  if ($col.Idx) { Set-PnPField -List $listTitle -Identity $internal -Values @{ Indexed = $true } | Out-Null }
  Write-Host "  + $($col.D) [$($col.T)]$(if($col.Idx){' idx'})" -ForegroundColor Green
}

# ---------- bloques reutilizables ----------
$R = @(
  (Col "CotizaciónID" "Lookup" $null $ParentList $true $true),
  (Col "SistemaCotizaciónID" "Lookup" $null $BridgeList $true $true),
  (Col "Folio" "Text" $null $null $true $true),
  (Col "NombreSistema" "Text" $null $null $false $true)
)
$ACAB = @("Pintado", "Galvanizado en frío", "Galvanizado en caliente", "Pregalvanizado")
$TGAL = @("Frío", "Caliente", "Pregalvanizado")
$MET  = @("Diseño", "Listado de piezas", "Planos/diseño de cliente", "Pedido o cotización anterior")
$C = @(
  (Col "Tipo de diseño" "Choice" $MET),
  (Col "Folio de cotización anterior" "Text"),
  (Col "Folio de pedido anterior" "Text"),
  (Col "Comentarios / alcance de la referencia" "Note"),
  (Col "Acabado" "Choice" $ACAB),
  (Col "Galvanizado" "Boolean"),
  (Col "Tipo de galvanizado" "Choice" $TGAL),
  (Col "Precio por kilogramo galvanizado" "Text"),
  (Col "Instalación" "Boolean"),
  (Col "Costo instalación" "Text"),
  (Col "Comentarios instalación" "Note"),
  (Col "Memoria de cálculo" "Boolean"),
  (Col "Costo memoria cálculo" "Text"),
  (Col "Unirse a estructura de otro proveedor" "Boolean"),
  (Col "Comentarios estructura" "Note"),
  (Col "Proveedores externos" "Boolean"),
  (Col "Consideraciones especiales" "Note"),
  (Col "Requiere adjuntar layout" "Boolean"),
  (Col "Existe definición cliente" "Boolean"),
  (Col "Definido por el cliente" "Note")
)
$AM = @(
  (Col "Pasillo máximo" "Text"), (Col "Pasillo mínimo" "Text"),
  (Col "Ancho disponible" "Text"), (Col "Largo disponible" "Text"),
  (Col "Considerar altura máxima montacargas" "Boolean"), (Col "Altura crítica de montacargas" "Text"),
  (Col "Considerar altura nave" "Boolean"), (Col "Altura máxima nave" "Text"), (Col "Altura mínima nave" "Text")
)
$AP = @(
  (Col "Ancho disponible" "Text"), (Col "Largo disponible" "Text"), (Col "Ancho pasillo pickeo" "Text"),
  (Col "Considerar altura nave" "Boolean"), (Col "Altura máxima nave" "Text"), (Col "Altura mínima nave" "Text")
)
$H = @(
  (Col "CotizaciónID" "Lookup" $null $ParentList $true $true),
  (Col "SistemaCotizaciónID" "Lookup" $null $BridgeList $true $true),
  (Col "Folio" "Text" $null $null $true $true),
  (Col "TipoKey" "Text" $null $null $true $true),
  (Col "NombreSistema" "Text" $null $null $false $true),
  (Col "Orden" "Number" $null $null $false $true),
  (Col "RowId" "Text")
)
$ROD_DIN = @("Rodillo 2.5", "Rodillo 1.9", "Rodillo 2.5 fácil limpieza", "Rodillo 1.9 fácil limpieza", "Llantas", "Por cálculo")
$ENTR = @("Manual", "Por cálculo")
$rackDin = @(
  (Col "Frentes buscados" "Text"), (Col "Fondos buscados" "Text"), (Col "Niveles buscados" "Text"),
  (Col "Tipo rodamiento" "Choice" $ROD_DIN), (Col "Método cálculo entrecentros" "Choice" $ENTR),
  (Col "Entrecentros manual" "Text"),
  (Col "Utilizar rodamiento alto impacto" "Boolean"), (Col "Especificación rodamiento alto impacto" "Note")
)
$drv = @(
  (Col "Frentes buscados" "Text"), (Col "Fondos buscados" "Text"), (Col "Niveles buscados" "Text"),
  (Col "Tipo captura montacargas" "Choice" @("Medidas", "Modelo")),
  (Col "Altura cabina montacargas" "Text"), (Col "Ancho total montacargas" "Text"),
  (Col "Ancho mástil montacargas" "Text"), (Col "Modelo montacargas" "Text")
)
$can = @(
  (Col "Tipo producto" "Text"), (Col "Longitud carga" "Text"), (Col "Sección carga" "Text"),
  (Col "Peso carga" "Text"), (Col "Cantidad por nivel" "Text"),
  (Col "Tipo góndola" "Choice" @("Góndola sencilla", "Góndola doble", "Ambas", "Por diseño"))
)
$carrito = @(
  (Col "Usa carrito" "Boolean"), (Col "Medidas carrito" "Text"), (Col "Número ruedas" "Text"),
  (Col "Tipo rueda" "Text"), (Col "Medida rueda" "Text"), (Col "Peso carrito" "Text")
)
$mez = @(
  (Col "Altura recomendada entrepiso" "Text"), (Col "Cantidad entrepisos" "Text"),
  (Col "Requiere elevador" "Boolean"), (Col "Especificación elevador" "Note"),
  (Col "Tipo piso" "Choice" @("Rejilla Irving", "MDF"))
) + $carrito + @( (Col "Requiere escaleras" "Boolean") )
$cfl = @(
  (Col "Frentes buscados" "Text"), (Col "Fondos buscados" "Text"), (Col "Niveles buscados" "Text"),
  (Col "Tipo rodamiento" "Choice" @("Rodillo 3/4", "Rodajas", "Por diseño")),
  (Col "Método cálculo entrecentros" "Choice" $ENTR), (Col "Entrecentros manual" "Text")
)
$mzl = @(
  (Col "Cantidad pisos" "Text"), (Col "Carga por m2" "Text"),
  (Col "Es modulado" "Boolean"), (Col "Zona modulada" "Text"), (Col "Usa tarimas" "Boolean"),
  (Col "Requiere elevador" "Boolean"), (Col "Especificación elevador" "Note"),
  (Col "Tipo piso" "Choice" @("Rejilla Irving", "MDF"))
) + $carrito + @(
  (Col "Requiere escaleras" "Boolean"),
  (Col "Método separación columnas" "Choice" $ENTR), (Col "Separación columnas manual" "Text")
)

# ---------- definición de listas (orden: puente -> detalle -> hijas) ----------
$bridge = @{ Title = $BridgeList; Cols = @(
    (Col "NombreSistema" "Text" $null $null $false $true),
    (Col "SistemaID" "Number" $null $null $false $true),
    (Col "TipoKey" "Text" $null $null $false $true),
    (Col "CotizaciónID" "Lookup" $null $ParentList $true $true),
    (Col "Folio" "Text" $null $null $true $true)
  )
}
$detalle = @(
  @{ Title = "Sistema selectivo";        Cols = ($R + $C + $AM) },
  @{ Title = "Sistema Dinámico";         Cols = ($R + $C + $AM + $rackDin) },
  @{ Title = "Sistema Pushback";         Cols = ($R + $C + $AM + $rackDin) },
  @{ Title = "Sistema Drive In";         Cols = ($R + $C + $AM + $drv) },
  @{ Title = "Sistema Cantiléver";       Cols = ($R + $C + $AM + $can) },
  @{ Title = "Sistema Mezzanine";        Cols = ($R + $C + $AP + $mez) },
  @{ Title = "Sistema Carton Flow";      Cols = ($R + $C + $AP + $cfl) },
  @{ Title = "Sistema Mezzanine Limpio"; Cols = ($R + $C + $AP + $mzl) },
  @{ Title = "Sistema Otro";             Cols = ($R + @((Col "HTML" "Note"))) }
)
$hijas = @(
  @{ Title = "Hija Tarimas";              Cols = ($H + @((Col "Tipo tarima" "Text"),(Col "Peso tarima" "Text"),(Col "Alto tarima" "Text"),(Col "Frente tarima" "Text"),(Col "Fondo tarima" "Text"),(Col "Huella tarima" "Text"),(Col "Excedente" "Boolean"),(Col "Excedente frente" "Text"),(Col "Excedente fondo" "Text"))) },
  @{ Title = "Hija Productos";            Cols = ($H + @((Col "Tipo producto" "Text"),(Col "Largo producto" "Text"),(Col "Ancho producto" "Text"),(Col "Alto producto" "Text"),(Col "Peso producto" "Text"),(Col "Cantidad por nivel" "Text"))) },
  @{ Title = "Hija Colores";              Cols = ($H + @((Col "Pieza" "Text"),(Col "ColorNombre" "Text"),(Col "ColorKey" "Text"))) },
  @{ Title = "Hija Elementos Seguridad";  Cols = ($H + @((Col "Elemento" "Text"),(Col "Comentarios" "Note"))) },
  @{ Title = "Hija Piezas Especiales";    Cols = ($H + @((Col "Pieza" "Text"),(Col "Cantidad" "Text"),(Col "Comentarios" "Note"))) },
  @{ Title = "Hija Proveedores Externos"; Cols = ($H + @((Col "Proveedor" "Text"),(Col "Alcance" "Note"))) },
  @{ Title = "Hija Listado Piezas";       Cols = ($H + @((Col "Pieza" "Text"),(Col "Cantidad" "Text"),(Col "Comentarios" "Note"))) }
)
$all = @($bridge) + $detalle + $hijas

# ---------- ejecución ----------
Write-Host "Conectando a $Url ..." -ForegroundColor Cyan
$connect = @{ Url = $Url }
if ($ClientId) { $connect.ClientId = $ClientId }
if ($Tenant)   { $connect.Tenant   = $Tenant }
if ($DeviceLogin) { $connect.DeviceLogin = $true } else { $connect.Interactive = $true }
if (-not $ClientId) {
  Write-Warning "Sin -ClientId. PnP.PowerShell 2.x requiere una app de Entra registrada (ver .PERMISOS en el encabezado)."
  Write-Warning "Si falla, corre primero: Register-PnPEntraIDAppForInteractiveLogin -ApplicationName 'FDI-PnP-Provisioning' -Tenant '<tenant>.onmicrosoft.com' -Interactive"
}
Connect-PnPOnline @connect

if (-not (Get-PnPList -Identity $ParentList -ErrorAction SilentlyContinue)) {
  throw "La lista padre '$ParentList' no existe en el sitio. Créala primero (tiene su propio esquema)."
}

if ($DropExisting) {
  Write-Host "DropExisting: borrando listas de sistemas (NO el padre '$ParentList') ..." -ForegroundColor Magenta
  foreach ($l in ($detalle + $hijas + @($bridge))) {
    if (Get-PnPList -Identity $l.Title -ErrorAction SilentlyContinue) {
      if ($DryRun) { Write-Host "- (dry) borrar: $($l.Title)" -ForegroundColor Yellow }
      else { Remove-PnPList -Identity $l.Title -Force; Write-Host "- borrada: $($l.Title)" -ForegroundColor Magenta }
    }
  }
}

foreach ($l in $all) {
  Write-Host "`n### $($l.Title)" -ForegroundColor Cyan
  Ensure-List $l.Title
  foreach ($c in $l.Cols) { Ensure-Field $l.Title $c }
}

Write-Host "`nListo. Listas procesadas: $($all.Count)." -ForegroundColor Cyan
if ($DryRun) { Write-Host "(DryRun: no se creó nada)" -ForegroundColor Yellow }
