[CmdletBinding()]
param(
    [string]$SiteUrl = "https://montillacom.sharepoint.com/sites/Pruebas",
    [string]$RepoRoot = "",
    [string]$OutputDir = "",
    [int]$RecentDays = 90,
    [int]$StaleDays = 365,
    [switch]$AllowPendingOutput
)

$ErrorActionPreference = "Stop"

$scriptRoot = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($scriptRoot)) {
    $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
}

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $RepoRoot = (Resolve-Path (Join-Path $scriptRoot "..")).Path
}

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    $OutputDir = Join-Path $RepoRoot "docs\sharepoint"
}

$generatedAt = (Get-Date).ToUniversalTime().ToString("o")
$outputPath = Resolve-Path -LiteralPath $RepoRoot -ErrorAction Stop
$RepoRoot = $outputPath.Path

function New-Directory {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path | Out-Null
    }
}

function Resolve-RelativePath {
    param([string]$Path)

    $root = [System.IO.Path]::GetFullPath($RepoRoot).TrimEnd("\") + "\"
    $full = [System.IO.Path]::GetFullPath($Path)
    if ($full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $full.Substring($root.Length)
    }
    return $full
}

function Get-ObjectProperty {
    param(
        [object]$InputObject,
        [string]$Name
    )

    if ($null -eq $InputObject) {
        return $null
    }

    $property = $InputObject.PSObject.Properties[$Name]
    if ($null -ne $property) {
        return $property.Value
    }

    try {
        return $InputObject.$Name
    }
    catch {
        return $null
    }
}

function ConvertTo-FlatString {
    param([object]$Value)

    if ($null -eq $Value) {
        return ""
    }

    if ($Value -is [System.Array]) {
        return (@($Value) | ForEach-Object { ConvertTo-FlatString $_ }) -join "; "
    }

    return [string]$Value
}

function Escape-MarkdownCell {
    param([object]$Value)

    $text = ConvertTo-FlatString $Value
    $text = $text -replace "\|", "\|"
    $text = $text -replace "`r?`n", "<br>"
    if ([string]::IsNullOrWhiteSpace($text)) {
        return "-"
    }
    return $text
}

function Format-MarkdownTable {
    param(
        [array]$Rows,
        [string[]]$Headers,
        [string[]]$Properties
    )

    if ($Rows.Count -eq 0) {
        return "_Sin registros._"
    }

    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add("| " + ($Headers -join " | ") + " |")
    $lines.Add("| " + (($Headers | ForEach-Object { "---" }) -join " | ") + " |")

    foreach ($row in $Rows) {
        $values = foreach ($property in $Properties) {
            Escape-MarkdownCell (Get-ObjectProperty $row $property)
        }
        $lines.Add("| " + ($values -join " | ") + " |")
    }

    return ($lines -join [Environment]::NewLine)
}

function Export-CsvWithHeader {
    param(
        [array]$Rows,
        [string[]]$Columns,
        [string]$Path
    )

    if ($Rows.Count -eq 0) {
        $empty = [ordered]@{}
        foreach ($column in $Columns) {
            $empty[$column] = $null
        }
        $header = ([pscustomobject]$empty | ConvertTo-Csv -NoTypeInformation)[0]
        Set-Content -LiteralPath $Path -Value $header -Encoding UTF8
        return
    }

    $Rows | Select-Object $Columns | Export-Csv -LiteralPath $Path -NoTypeInformation -Encoding UTF8
}

function Get-RepositoryTextFiles {
    $roots = @(
        "CanvasApps",
        "Workflows",
        "Other",
        "Controls",
        "work\current_pass"
    )

    $allowedNames = @("DataSources.json", "Properties.json", "ComponentsMetadata.json")
    $allowedExtensions = @(".json", ".xml", ".yaml", ".md", ".txt")
    $files = New-Object System.Collections.Generic.List[object]

    foreach ($relativeRoot in $roots) {
        $root = Join-Path $RepoRoot $relativeRoot
        if (-not (Test-Path -LiteralPath $root)) {
            continue
        }

        Get-ChildItem -LiteralPath $root -Recurse -File | Where-Object {
            $allowedExtensions -contains $_.Extension -or $allowedNames -contains $_.Name -or $_.Name.EndsWith(".pa.yaml")
        } | ForEach-Object {
            $files.Add($_)
        }
    }

    return $files.ToArray()
}

function Get-ReferenceBucket {
    param([string]$RelativePath)

    if ($RelativePath -like "Workflows\*") {
        return "Workflow"
    }

    if ($RelativePath -like "CanvasApps\*" -or $RelativePath -like "Controls\*" -or $RelativePath -like "work\current_pass\*") {
        return "Canvas App"
    }

    if ($RelativePath -like "Other\*") {
        return "Solution metadata"
    }

    return "Other"
}

function Find-RepositoryReferences {
    param(
        [string]$ListTitle,
        [string]$ListId
    )

    $references = New-Object System.Collections.Generic.List[object]

    foreach ($file in $script:RepositoryTextFiles) {
        try {
            $content = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
        }
        catch {
            continue
        }

        $matchedBy = New-Object System.Collections.Generic.List[string]
        if (-not [string]::IsNullOrWhiteSpace($ListTitle) -and
            $content.IndexOf($ListTitle, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
            $matchedBy.Add("Title")
        }

        if (-not [string]::IsNullOrWhiteSpace($ListId) -and
            $content.IndexOf($ListId, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {
            $matchedBy.Add("Id")
        }

        if ($matchedBy.Count -gt 0) {
            $relativePath = Resolve-RelativePath $file.FullName
            $references.Add([pscustomobject]@{
                Path = $relativePath
                Bucket = Get-ReferenceBucket $relativePath
                MatchedBy = ($matchedBy -join ", ")
            })
        }
    }

    return $references.ToArray()
}

function Get-UsageClassification {
    param([array]$References)

    $canvas = @($References | Where-Object { $_.Bucket -eq "Canvas App" }).Count -gt 0
    $workflow = @($References | Where-Object { $_.Bucket -eq "Workflow" }).Count -gt 0

    if ($canvas -and $workflow) {
        return "Usada por ambos"
    }

    if ($canvas) {
        return "Usada por Canvas App"
    }

    if ($workflow) {
        return "Usada por Workflow"
    }

    if ($References.Count -gt 0) {
        return "Indeterminada"
    }

    return "No referenciada en el repositorio"
}

function Get-LocalDatasourceHints {
    $excluded = @(
        "Office365Outlook",
        "Office365Outlook_1",
        "UsuariosdeOffice365",
        "UsuariosdeOffice365_1",
        "Correo_Teams_Solicitud_Cotización"
    )

    $hintsByTitle = @{}
    $candidateFiles = @(
        "CanvasApps\mapc_fdi_412ec.meta.xml",
        "work\current_pass\Properties.json",
        "work\current_pass\References\DataSources.json"
    )

    foreach ($relativePath in $candidateFiles) {
        $path = Join-Path $RepoRoot $relativePath
        if (-not (Test-Path -LiteralPath $path)) {
            continue
        }

        try {
            $content = Get-Content -LiteralPath $path -Raw -Encoding UTF8
        }
        catch {
            continue
        }

        $tableMatches = [regex]::Matches($content, '"(?<title>[^"]+)"\s*:\s*\{\s*"tableName"\s*:\s*"(?<id>[0-9a-fA-F-]{36})"')
        foreach ($match in $tableMatches) {
            $title = $match.Groups["title"].Value
            if ($excluded -contains $title) {
                continue
            }

            if (-not $hintsByTitle.ContainsKey($title)) {
                $hintsByTitle[$title] = [pscustomobject]@{
                    Title = $title
                    Id = $match.Groups["id"].Value
                    EvidencePath = $relativePath
                }
            }
        }

        $arrayMatches = [regex]::Matches($content, '"dataSources"\s*:\s*\[(?<items>[^\]]*)\]')
        foreach ($match in $arrayMatches) {
            $itemMatches = [regex]::Matches($match.Groups["items"].Value, '"(?<title>[^"]+)"')
            foreach ($itemMatch in $itemMatches) {
                $title = $itemMatch.Groups["title"].Value
                if ($excluded -contains $title) {
                    continue
                }

                if (-not $hintsByTitle.ContainsKey($title)) {
                    $hintsByTitle[$title] = [pscustomobject]@{
                        Title = $title
                        Id = ""
                        EvidencePath = $relativePath
                    }
                }
            }
        }
    }

    return @($hintsByTitle.Values | Sort-Object Title)
}

function Get-DeleteClassification {
    param(
        [object]$ListRow,
        [string]$Usage
    )

    $systemTitlePatterns = @(
        "^Form Templates$",
        "^MicroFeed$",
        "^Site Assets$",
        "^Site Pages$",
        "^Style Library$",
        "^TaxonomyHiddenList$",
        "^User Information List$",
        "^Workflow History$"
    )

    $isSystemTitle = $false
    foreach ($pattern in $systemTitlePatterns) {
        if ($ListRow.Title -match $pattern) {
            $isSystemTitle = $true
            break
        }
    }

    if ($ListRow.Hidden -eq $true -or $isSystemTitle) {
        return [pscustomobject]@{
            Classification = "No borrar"
            Reason = "Lista oculta o de sistema."
            Risk = "Alto"
            Recommendation = "Conservar; no evaluarla como limpieza funcional."
        }
    }

    if ($Usage -eq "Usada por Canvas App" -or $Usage -eq "Usada por Workflow" -or $Usage -eq "Usada por ambos") {
        return [pscustomobject]@{
            Classification = "No borrar"
            Reason = "Tiene referencias directas en la aplicación o flujos."
            Risk = "Alto"
            Recommendation = "Conservar mientras esas referencias existan."
        }
    }

    if ([int]$ListRow.ItemCount -gt 0) {
        return [pscustomobject]@{
            Classification = "Indeterminada"
            Reason = "No está referenciada, pero contiene elementos."
            Risk = "Medio"
            Recommendation = "Revisar dueño y propósito antes de cualquier limpieza."
        }
    }

    $lastModified = $null
    if (-not [string]::IsNullOrWhiteSpace($ListRow.LastItemModifiedDate)) {
        try {
            $lastModified = [datetime]$ListRow.LastItemModifiedDate
        }
        catch {
            $lastModified = $null
        }
    }

    if ($lastModified -ne $null -and $lastModified -lt (Get-Date).AddDays(-1 * $StaleDays)) {
        return [pscustomobject]@{
            Classification = "Candidata fuerte a borrar"
            Reason = "No está referenciada, tiene 0 elementos y no se modificó recientemente."
            Risk = "Medio"
            Recommendation = "Validar con dueño del sitio; borrar solo con aprobación explícita."
        }
    }

    return [pscustomobject]@{
        Classification = "Candidata a revisar"
        Reason = "No está referenciada y tiene 0 elementos."
        Risk = "Medio"
        Recommendation = "Confirmar uso con negocio antes de decidir."
    }
}

function New-RecommendedIndexProfiles {
    return @(
        [pscustomobject]@{ ListTitle = "Cotizaciones 2026"; Column = "Created"; Priority = "P0"; Reason = "Filtro base delegable actual para evitar list view threshold." },
        [pscustomobject]@{ ListTitle = "Cotizaciones 2026"; Column = "Estado"; Priority = "P0"; Reason = "Filtro funcional frecuente por estado de cotización." },
        [pscustomobject]@{ ListTitle = "Cotizaciones 2026"; Column = "VendedoresLookUp"; Priority = "P1"; Reason = "Filtro de Mis Cotizaciones por vendedor." },
        [pscustomobject]@{ ListTitle = "Cotizaciones 2026"; Column = "Folio"; Priority = "P1"; Reason = "Búsqueda y navegación por folio." },
        [pscustomobject]@{ ListTitle = "Cotizaciones 2026"; Column = "Modified"; Priority = "P2"; Reason = "Filtro alterno para ventana móvil de 18 meses o auditoría reciente." },
        [pscustomobject]@{ ListTitle = "Solicitudes en cotizaciones"; Column = "FolioLookUp"; Priority = "P1"; Reason = "Galerías filtradas por folio seleccionado." },
        [pscustomobject]@{ ListTitle = "Solicitudes en cotizaciones"; Column = "Estado"; Priority = "P2"; Reason = "Seguimiento y vistas por estado de solicitud." },
        [pscustomobject]@{ ListTitle = "Bitácora cotizaciones"; Column = "FolioLookUp"; Priority = "P1"; Reason = "Lectura de bitácora por cotización seleccionada." },
        [pscustomobject]@{ ListTitle = "Carpeta cotizaciones"; Column = "Modified"; Priority = "P2"; Reason = "Biblioteca consultada por documentos recientes; validar columnas indexables reales." },
        [pscustomobject]@{ ListTitle = "Clientes"; Column = "Title"; Priority = "P2"; Reason = "Búsqueda/ordenamiento de directorio." },
        [pscustomobject]@{ ListTitle = "Clientes"; Column = "Activo"; Priority = "P2"; Reason = "Filtro de clientes activos." },
        [pscustomobject]@{ ListTitle = "Contactos"; Column = "Title"; Priority = "P2"; Reason = "Búsqueda de directorio." },
        [pscustomobject]@{ ListTitle = "Contactos"; Column = "ClienteLookUp"; Priority = "P2"; Reason = "Relación frecuente contacto-cliente." }
    )
}

function Test-RecommendedIndexes {
    param(
        [array]$Columns,
        [array]$Profiles,
        [array]$LocalHints
    )

    $results = New-Object System.Collections.Generic.List[object]

    foreach ($profile in $Profiles) {
        $matchingListColumns = @($Columns | Where-Object { $_.ListTitle -eq $profile.ListTitle })
        $listKnown = $matchingListColumns.Count -gt 0
        if (-not $listKnown) {
            $listKnown = @($LocalHints | Where-Object { $_.Title -eq $profile.ListTitle }).Count -gt 0
        }

        $matchingColumn = @($matchingListColumns | Where-Object {
            $_.Title -eq $profile.Column -or $_.InternalName -eq $profile.Column
        }) | Select-Object -First 1

        $status = "Pendiente de metadata"
        if ($matchingColumn) {
            if ($matchingColumn.Indexed -eq $true -or $matchingColumn.EnforceUniqueValues -eq $true -or $matchingColumn.Indexed -eq "True" -or $matchingColumn.EnforceUniqueValues -eq "True") {
                $status = "Indexado"
            }
            else {
                $status = "Índice recomendado"
            }
        }
        elseif ($listKnown) {
            $status = "Columna no confirmada"
        }

        $results.Add([pscustomobject]@{
            ListTitle = $profile.ListTitle
            Column = $profile.Column
            Priority = $profile.Priority
            Status = $status
            Reason = $profile.Reason
        })
    }

    return $results.ToArray()
}

function Read-SharePointMetadata {
    $lists = New-Object System.Collections.Generic.List[object]
    $columns = New-Object System.Collections.Generic.List[object]
    $views = New-Object System.Collections.Generic.List[object]
    $indexes = New-Object System.Collections.Generic.List[object]

    Connect-PnPOnline -Url $SiteUrl -Interactive

    $pnpLists = Get-PnPList -Includes Id, Title, BaseTemplate, BaseType, Hidden, ItemCount, EnableAttachments, Created, LastItemModifiedDate, RootFolder, DefaultViewUrl, Fields, Views

    foreach ($list in $pnpLists) {
        Get-PnPProperty -ClientObject $list -Property RootFolder, Fields, Views | Out-Null

        $rootFolderUrl = ""
        if ($null -ne $list.RootFolder) {
            $rootFolderUrl = ConvertTo-FlatString $list.RootFolder.ServerRelativeUrl
        }

        $listId = ConvertTo-FlatString $list.Id
        $references = Find-RepositoryReferences -ListTitle $list.Title -ListId $listId
        $usage = Get-UsageClassification -References $references

        $listRow = [pscustomobject]@{
            Title = ConvertTo-FlatString $list.Title
            Id = $listId
            BaseTemplate = ConvertTo-FlatString $list.BaseTemplate
            BaseType = ConvertTo-FlatString $list.BaseType
            Hidden = [bool]$list.Hidden
            ItemCount = [int]$list.ItemCount
            EnableAttachments = [bool]$list.EnableAttachments
            Created = ConvertTo-FlatString $list.Created
            LastItemModifiedDate = ConvertTo-FlatString $list.LastItemModifiedDate
            RootFolderServerRelativeUrl = $rootFolderUrl
            DefaultViewUrl = ConvertTo-FlatString $list.DefaultViewUrl
            Usage = $usage
            ReferenceCount = $references.Count
            ReferenceEvidence = (@($references | Select-Object -First 5 | ForEach-Object { "$($_.Bucket):$($_.Path)" }) -join "; ")
            DeleteClassification = ""
            DeleteReason = ""
            DeleteRisk = ""
            DeleteRecommendation = ""
        }

        $delete = Get-DeleteClassification -ListRow $listRow -Usage $usage
        $listRow.DeleteClassification = $delete.Classification
        $listRow.DeleteReason = $delete.Reason
        $listRow.DeleteRisk = $delete.Risk
        $listRow.DeleteRecommendation = $delete.Recommendation
        $lists.Add($listRow)

        foreach ($field in $list.Fields) {
            $choices = ""
            $lookupList = ""
            $lookupField = ""

            try { $choices = (@($field.Choices) -join "; ") } catch { $choices = "" }
            try { $lookupList = ConvertTo-FlatString $field.LookupList } catch { $lookupList = "" }
            try { $lookupField = ConvertTo-FlatString $field.LookupField } catch { $lookupField = "" }

            $fieldRow = [pscustomobject]@{
                ListTitle = $list.Title
                ListId = $listId
                Title = ConvertTo-FlatString $field.Title
                InternalName = ConvertTo-FlatString $field.InternalName
                TypeAsString = ConvertTo-FlatString $field.TypeAsString
                Required = [bool]$field.Required
                Hidden = [bool]$field.Hidden
                ReadOnlyField = [bool]$field.ReadOnlyField
                Indexed = [bool]$field.Indexed
                EnforceUniqueValues = [bool]$field.EnforceUniqueValues
                Group = ConvertTo-FlatString $field.Group
                Description = ConvertTo-FlatString $field.Description
                DefaultValue = ConvertTo-FlatString $field.DefaultValue
                Choices = $choices
                LookupList = $lookupList
                LookupField = $lookupField
            }
            $columns.Add($fieldRow)

            if ($fieldRow.Indexed -eq $true -or $fieldRow.EnforceUniqueValues -eq $true) {
                $indexType = "Indexed"
                if ($fieldRow.EnforceUniqueValues -eq $true) {
                    $indexType = "Unique"
                }

                $indexes.Add([pscustomobject]@{
                    ListTitle = $list.Title
                    ListId = $listId
                    ColumnTitle = $fieldRow.Title
                    InternalName = $fieldRow.InternalName
                    IndexType = $indexType
                    Reason = "Metadata SharePoint"
                })
            }
        }

        foreach ($view in $list.Views) {
            Get-PnPProperty -ClientObject $view -Property ViewFields | Out-Null

            $views.Add([pscustomobject]@{
                ListTitle = $list.Title
                ListId = $listId
                Title = ConvertTo-FlatString $view.Title
                DefaultView = [bool]$view.DefaultView
                RowLimit = ConvertTo-FlatString $view.RowLimit
                ViewQuery = ConvertTo-FlatString $view.ViewQuery
                ViewFields = (@($view.ViewFields) -join "; ")
            })
        }
    }

    return [pscustomobject]@{
        Lists = @($lists | Sort-Object Title)
        Columns = @($columns | Sort-Object ListTitle, Title)
        Views = @($views | Sort-Object ListTitle, Title)
        Indexes = @($indexes | Sort-Object ListTitle, ColumnTitle)
    }
}

function Write-AuditMarkdown {
    param(
        [string]$Path,
        [string]$CollectionStatus,
        [string]$CollectionNote,
        [array]$Lists,
        [array]$Columns,
        [array]$Views,
        [array]$Indexes,
        [array]$LocalHints,
        [array]$RecommendedIndexes
    )

    $visibleLists = @($Lists | Where-Object { $_.Hidden -eq $false -and $_.BaseType -notmatch "DocumentLibrary" -and $_.BaseTemplate -ne "101" })
    $hiddenLists = @($Lists | Where-Object { $_.Hidden -eq $true })
    $libraries = @($Lists | Where-Object { $_.BaseType -match "DocumentLibrary" -or $_.BaseTemplate -eq "101" })
    $largest = @($Lists | Sort-Object ItemCount -Descending | Select-Object -First 15)
    $empty = @($Lists | Where-Object { [int]$_.ItemCount -eq 0 } | Sort-Object Title)
    $recentCutoff = (Get-Date).AddDays(-1 * $RecentDays)
    $staleCutoff = (Get-Date).AddDays(-1 * $StaleDays)
    $recent = @($Lists | Where-Object {
        try { [datetime]$_.LastItemModifiedDate -ge $recentCutoff } catch { $false }
    } | Sort-Object LastItemModifiedDate -Descending | Select-Object -First 20)
    $stale = @($Lists | Where-Object {
        try { [datetime]$_.LastItemModifiedDate -lt $staleCutoff } catch { $false }
    } | Sort-Object LastItemModifiedDate | Select-Object -First 20)
    $used = @($Lists | Where-Object { $_.Usage -eq "Usada por Canvas App" -or $_.Usage -eq "Usada por Workflow" -or $_.Usage -eq "Usada por ambos" } | Sort-Object Title)
    $notReferenced = @($Lists | Where-Object { $_.Usage -eq "No referenciada en el repositorio" } | Sort-Object Title)
    $deleteCandidates = @($Lists | Where-Object { $_.DeleteClassification -eq "Candidata fuerte a borrar" -or $_.DeleteClassification -eq "Candidata a revisar" } | Sort-Object DeleteClassification, Title)
    $thresholdRisks = @($Lists | Where-Object { [int]$_.ItemCount -ge 4000 } | Sort-Object ItemCount -Descending)
    $missingIndexes = @($RecommendedIndexes | Where-Object { $_.Status -eq "Índice recomendado" -or $_.Status -eq "Pendiente de metadata" -or $_.Status -eq "Columna no confirmada" })

    $knownRepoTable = @($LocalHints | ForEach-Object {
        $refs = Find-RepositoryReferences -ListTitle $_.Title -ListId $_.Id
        [pscustomobject]@{
            Title = $_.Title
            Id = $_.Id
            Usage = Get-UsageClassification -References $refs
            Evidence = $_.EvidencePath
        }
    } | Sort-Object Title)

    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add("# Auditoría de metadata SharePoint - FDI")
    $lines.Add("")
    $lines.Add("Fecha UTC: $generatedAt")
    $lines.Add(("Sitio: ``{0}``" -f $SiteUrl))
    $lines.Add(("Repositorio: ``{0}``" -f $RepoRoot))
    $lines.Add("Estado de recolección: **$CollectionStatus**")
    $lines.Add("")
    $lines.Add("## Resumen ejecutivo")
    $lines.Add("")
    $lines.Add($CollectionNote)
    $lines.Add("")
    $lines.Add("- Listas/bibliotecas analizadas desde SharePoint: $($Lists.Count)")
    $lines.Add("- Columnas analizadas: $($Columns.Count)")
    $lines.Add("- Vistas analizadas: $($Views.Count)")
    $lines.Add("- Índices existentes detectados: $($Indexes.Count)")
    $lines.Add("- Listas/bibliotecas referenciadas por el repositorio local: $($LocalHints.Count)")
    $lines.Add("- SharePoint no fue modificado; el script solo consulta metadata.")
    $lines.Add("")
    $lines.Add("## Resumen de listas encontradas")
    $lines.Add("")
    $lines.Add("- Total: $($Lists.Count)")
    $lines.Add("- Visibles: $($visibleLists.Count)")
    $lines.Add("- Ocultas: $($hiddenLists.Count)")
    $lines.Add("- Bibliotecas: $($libraries.Count)")
    $lines.Add("- Sin elementos: $($empty.Count)")
    $lines.Add("- Con 4,000+ elementos: $($thresholdRisks.Count)")
    $lines.Add("")
    $lines.Add("## Listas visibles")
    $lines.Add("")
    $lines.Add((Format-MarkdownTable -Rows $visibleLists -Headers @("Lista", "Items", "Modificada", "Uso", "Clasificación") -Properties @("Title", "ItemCount", "LastItemModifiedDate", "Usage", "DeleteClassification")))
    $lines.Add("")
    $lines.Add("## Listas ocultas")
    $lines.Add("")
    $lines.Add((Format-MarkdownTable -Rows $hiddenLists -Headers @("Lista", "Items", "Modificada", "Clasificación") -Properties @("Title", "ItemCount", "LastItemModifiedDate", "DeleteClassification")))
    $lines.Add("")
    $lines.Add("## Bibliotecas")
    $lines.Add("")
    $lines.Add((Format-MarkdownTable -Rows $libraries -Headers @("Biblioteca", "Items", "Url", "Uso", "Clasificación") -Properties @("Title", "ItemCount", "RootFolderServerRelativeUrl", "Usage", "DeleteClassification")))
    $lines.Add("")
    $lines.Add("## Listas con más elementos")
    $lines.Add("")
    $lines.Add((Format-MarkdownTable -Rows $largest -Headers @("Lista", "Items", "Modificada", "Uso") -Properties @("Title", "ItemCount", "LastItemModifiedDate", "Usage")))
    $lines.Add("")
    $lines.Add("## Listas sin elementos")
    $lines.Add("")
    $lines.Add((Format-MarkdownTable -Rows $empty -Headers @("Lista", "Modificada", "Uso", "Clasificación") -Properties @("Title", "LastItemModifiedDate", "Usage", "DeleteClassification")))
    $lines.Add("")
    $lines.Add("## Listas modificadas recientemente")
    $lines.Add("")
    $lines.Add((Format-MarkdownTable -Rows $recent -Headers @("Lista", "Items", "Modificada", "Uso") -Properties @("Title", "ItemCount", "LastItemModifiedDate", "Usage")))
    $lines.Add("")
    $lines.Add("## Listas sin modificación reciente")
    $lines.Add("")
    $lines.Add((Format-MarkdownTable -Rows $stale -Headers @("Lista", "Items", "Modificada", "Uso") -Properties @("Title", "ItemCount", "LastItemModifiedDate", "Usage")))
    $lines.Add("")
    $lines.Add("## Listas que parecen ser usadas por FDI")
    $lines.Add("")
    if ($used.Count -gt 0) {
        $lines.Add((Format-MarkdownTable -Rows $used -Headers @("Lista", "Uso", "Evidencia") -Properties @("Title", "Usage", "ReferenceEvidence")))
    }
    else {
        $lines.Add("No hay clasificación completa desde SharePoint todavía. Referencias locales conocidas:")
        $lines.Add("")
        $lines.Add((Format-MarkdownTable -Rows $knownRepoTable -Headers @("Lista", "Id local", "Uso", "Evidencia") -Properties @("Title", "Id", "Usage", "Evidence")))
    }
    $lines.Add("")
    $lines.Add("## Listas que parecen no ser usadas por FDI")
    $lines.Add("")
    $lines.Add((Format-MarkdownTable -Rows $notReferenced -Headers @("Lista", "Items", "Modificada", "Clasificación") -Properties @("Title", "ItemCount", "LastItemModifiedDate", "DeleteClassification")))
    $lines.Add("")
    $lines.Add("## Listas candidatas a revisión para posible eliminación")
    $lines.Add("")
    $lines.Add("No se borra nada. Esta sección solo clasifica evidencia.")
    $lines.Add("")
    $lines.Add((Format-MarkdownTable -Rows $deleteCandidates -Headers @("Lista", "Clasificación", "Razón", "Riesgo", "Recomendación") -Properties @("Title", "DeleteClassification", "DeleteReason", "DeleteRisk", "DeleteRecommendation")))
    $lines.Add("")
    $lines.Add("## Columnas críticas para filtros/delegación")
    $lines.Add("")
    $lines.Add((Format-MarkdownTable -Rows $RecommendedIndexes -Headers @("Lista", "Columna", "Prioridad", "Estado", "Razón") -Properties @("ListTitle", "Column", "Priority", "Status", "Reason")))
    $lines.Add("")
    $lines.Add("## Índices faltantes recomendados")
    $lines.Add("")
    $lines.Add((Format-MarkdownTable -Rows $missingIndexes -Headers @("Lista", "Columna", "Prioridad", "Estado", "Razón") -Properties @("ListTitle", "Column", "Priority", "Status", "Reason")))
    $lines.Add("")
    $lines.Add("## Riesgos de list view threshold")
    $lines.Add("")
    if ($thresholdRisks.Count -gt 0) {
        $lines.Add((Format-MarkdownTable -Rows $thresholdRisks -Headers @("Lista", "Items", "Uso", "Modificada") -Properties @("Title", "ItemCount", "Usage", "LastItemModifiedDate")))
    }
    else {
        $lines.Add("Sin metadata de conteo suficiente o sin listas por encima de 4,000 elementos.")
    }
    $lines.Add("")
    $lines.Add("## Observaciones de seguridad o datos sensibles")
    $lines.Add("")
    $lines.Add("- No se descargan registros de negocio ni adjuntos; solo metadata de listas, columnas, vistas e índices.")
    $lines.Add('- Las listas con nombres como `Cotizaciones`, `Clientes`, `Contactos`, `Solicitudes`, `Bitácora` o bibliotecas de archivos deben tratarse como sensibles aunque el inventario no incluya datos.')
    $lines.Add("- Las candidatas a limpieza no deben eliminarse sin dueño, respaldo y aprobación explícita.")
    $lines.Add("")
    $lines.Add("## Instrucciones de ejecución")
    $lines.Add("")
    $lines.Add("Instalar PnP.PowerShell si falta:")
    $lines.Add("")
    $lines.Add('```powershell')
    $lines.Add("Install-Module PnP.PowerShell -Scope CurrentUser")
    $lines.Add('```')
    $lines.Add("")
    $lines.Add("Ejecutar exportación interactiva:")
    $lines.Add("")
    $lines.Add('```powershell')
    $lines.Add((".\scripts\export-sharepoint-metadata.ps1 -SiteUrl ""{0}""" -f $SiteUrl))
    $lines.Add('```')
    $lines.Add("")
    $lines.Add('El script vuelve a generar `docs/sharepoint/sharepoint-schema.json`, CSVs, auditoría y candidatas.')

    Set-Content -LiteralPath $Path -Value ($lines -join [Environment]::NewLine) -Encoding UTF8
}

function Write-DeleteCandidatesMarkdown {
    param(
        [string]$Path,
        [array]$Lists,
        [string]$CollectionStatus
    )

    $candidates = @($Lists | Where-Object { $_.DeleteClassification -eq "Candidata fuerte a borrar" -or $_.DeleteClassification -eq "Candidata a revisar" } | Sort-Object DeleteClassification, Title)
    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add("# Candidatas a revisión de eliminación")
    $lines.Add("")
    $lines.Add("Estado de recolección: **$CollectionStatus**")
    $lines.Add("")
    $lines.Add("Regla: este archivo no autoriza borrar nada. Solo documenta evidencia para revisión.")
    $lines.Add("")
    $lines.Add((Format-MarkdownTable -Rows $candidates -Headers @("Lista", "Razón", "Evidencia", "Riesgo", "Recomendación") -Properties @("Title", "DeleteReason", "ReferenceEvidence", "DeleteRisk", "DeleteRecommendation")))
    $lines.Add("")
    $lines.Add("Si una lista está oculta, es de sistema, contiene elementos o aparece referenciada por Canvas App/Workflows, no debe tratarse como borrado automático.")

    Set-Content -LiteralPath $Path -Value ($lines -join [Environment]::NewLine) -Encoding UTF8
}

New-Directory -Path $OutputDir

$script:RepositoryTextFiles = Get-RepositoryTextFiles
$localHints = Get-LocalDatasourceHints
$profiles = New-RecommendedIndexProfiles

$pnpModule = Get-Module -ListAvailable PnP.PowerShell | Sort-Object Version -Descending | Select-Object -First 1
$collectionStatus = "completed"
$collectionNote = "La metadata se obtuvo directamente desde SharePoint con PnP PowerShell usando autenticación interactiva."
$metadata = $null

if ($null -eq $pnpModule) {
    if (-not $AllowPendingOutput) {
        throw "PnP.PowerShell no está instalado. Instálalo o vuelve a ejecutar con -AllowPendingOutput para generar archivos pendientes."
    }

    $collectionStatus = "pending-pnp-powershell-not-installed"
    $collectionNote = "PnP.PowerShell no está instalado en este entorno, por lo que no se pudo leer metadata del sitio. Se generaron los archivos requeridos con estado pendiente y referencias locales conocidas para que el inventario quede reproducible."
    $metadata = [pscustomobject]@{
        Lists = @()
        Columns = @()
        Views = @()
        Indexes = @()
    }
}
else {
    Import-Module PnP.PowerShell -ErrorAction Stop
    $metadata = Read-SharePointMetadata
}

$recommendedIndexes = Test-RecommendedIndexes -Columns $metadata.Columns -Profiles $profiles -LocalHints $localHints

$listColumns = @(
    "Title", "Id", "BaseTemplate", "BaseType", "Hidden", "ItemCount", "EnableAttachments",
    "Created", "LastItemModifiedDate", "RootFolderServerRelativeUrl", "DefaultViewUrl",
    "Usage", "ReferenceCount", "ReferenceEvidence", "DeleteClassification", "DeleteReason",
    "DeleteRisk", "DeleteRecommendation"
)
$columnColumns = @(
    "ListTitle", "ListId", "Title", "InternalName", "TypeAsString", "Required", "Hidden",
    "ReadOnlyField", "Indexed", "EnforceUniqueValues", "Group", "Description", "DefaultValue",
    "Choices", "LookupList", "LookupField"
)
$viewColumns = @("ListTitle", "ListId", "Title", "DefaultView", "RowLimit", "ViewQuery", "ViewFields")
$indexColumns = @("ListTitle", "ListId", "ColumnTitle", "InternalName", "IndexType", "Reason")

Export-CsvWithHeader -Rows $metadata.Lists -Columns $listColumns -Path (Join-Path $OutputDir "sharepoint-lists.csv")
Export-CsvWithHeader -Rows $metadata.Columns -Columns $columnColumns -Path (Join-Path $OutputDir "sharepoint-columns.csv")
Export-CsvWithHeader -Rows $metadata.Views -Columns $viewColumns -Path (Join-Path $OutputDir "sharepoint-views.csv")
Export-CsvWithHeader -Rows $metadata.Indexes -Columns $indexColumns -Path (Join-Path $OutputDir "sharepoint-indexes.csv")

$schema = [pscustomobject]@{
    generatedAtUtc = $generatedAt
    siteUrl = $SiteUrl
    repoRoot = $RepoRoot
    collectionStatus = $collectionStatus
    collectionNote = $collectionNote
    rules = [pscustomobject]@{
        sharePointModified = $false
        businessRecordsDownloaded = $false
        metadataOnly = $true
    }
    localRepositoryReferences = $localHints
    lists = $metadata.Lists
    columns = $metadata.Columns
    views = $metadata.Views
    indexes = $metadata.Indexes
    recommendedIndexes = $recommendedIndexes
}

$schema | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $OutputDir "sharepoint-schema.json") -Encoding UTF8

Write-AuditMarkdown `
    -Path (Join-Path $OutputDir "sharepoint-audit.md") `
    -CollectionStatus $collectionStatus `
    -CollectionNote $collectionNote `
    -Lists $metadata.Lists `
    -Columns $metadata.Columns `
    -Views $metadata.Views `
    -Indexes $metadata.Indexes `
    -LocalHints $localHints `
    -RecommendedIndexes $recommendedIndexes

Write-DeleteCandidatesMarkdown `
    -Path (Join-Path $OutputDir "delete-candidates.md") `
    -Lists $metadata.Lists `
    -CollectionStatus $collectionStatus

Write-Host "SharePoint metadata export status: $collectionStatus"
Write-Host "Lists analyzed from SharePoint: $($metadata.Lists.Count)"
Write-Host "Local repository SharePoint references: $($localHints.Count)"
Write-Host "Output directory: $OutputDir"

