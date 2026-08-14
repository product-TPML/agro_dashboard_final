param(
  [string]$SourceWorkbook = 'C:\Users\harsh\Downloads\Agro Dashboard Translations.xlsx',
  [string]$TranslationsPath = (Join-Path $PSScriptRoot '..\translations.json'),
  [string]$MissingWorkbook = 'C:\Users\harsh\Downloads\Agro Dashboard Translations - Missing.xlsx',
  [switch]$RestoreTrackedFormatting
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-WorkbookStrings([string]$Path) {
  $zip = [IO.Compression.ZipFile]::OpenRead($Path)
  try {
    $entry = $zip.GetEntry('xl/sharedStrings.xml')
    $reader = [IO.StreamReader]::new($entry.Open())
    try { [xml]$xml = $reader.ReadToEnd() } finally { $reader.Dispose() }
    $ns = [Xml.XmlNamespaceManager]::new($xml.NameTable)
    $ns.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
    return @($xml.SelectNodes('//x:si', $ns) | ForEach-Object { $_.InnerText })
  } finally { $zip.Dispose() }
}

function Get-WorksheetRows([string]$Path, [int]$SheetNumber, [string[]]$Strings) {
  $zip = [IO.Compression.ZipFile]::OpenRead($Path)
  try {
    $entry = $zip.GetEntry("xl/worksheets/sheet$SheetNumber.xml")
    $reader = [IO.StreamReader]::new($entry.Open())
    try { [xml]$xml = $reader.ReadToEnd() } finally { $reader.Dispose() }
    $ns = [Xml.XmlNamespaceManager]::new($xml.NameTable)
    $ns.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
    $out = @()
    foreach ($row in $xml.SelectNodes('//x:sheetData/x:row', $ns)) {
      $values = @{}
      foreach ($cell in $row.SelectNodes('x:c', $ns)) {
        $column = ([regex]::Match($cell.GetAttribute('r'), '^[A-Z]+')).Value
        $valueNode = $cell.SelectSingleNode('x:v', $ns)
        $value = if ($null -eq $valueNode) { '' } else { $valueNode.InnerText }
        if ($cell.GetAttribute('t') -eq 's' -and $value -ne '') { $value = $Strings[[int]$value] }
        $values[$column] = $value
      }
      $out += [PSCustomObject]$values
    }
    return $out
  } finally { $zip.Dispose() }
}

function Get-Style([xml]$Sheet, [string]$CellRef) {
  $ns = [Xml.XmlNamespaceManager]::new($Sheet.NameTable)
  $ns.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
  $cell = $Sheet.SelectSingleNode("//x:c[@r='$CellRef']", $ns)
  if ($null -eq $cell) { return $null }
  return $cell.GetAttribute('s')
}

function New-InlineCell([xml]$Sheet, [string]$Ref, [string]$Value, [string]$Style) {
  $nsUri = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
  $cell = $Sheet.CreateElement('c', $nsUri)
  $cell.SetAttribute('r', $Ref)
  $cell.SetAttribute('t', 'inlineStr')
  if ($Style) { $cell.SetAttribute('s', $Style) }
  $is = $Sheet.CreateElement('is', $nsUri)
  $t = $Sheet.CreateElement('t', $nsUri)
  if ($Value.StartsWith(' ') -or $Value.EndsWith(' ')) { $t.SetAttribute('space', 'http://www.w3.org/XML/1998/namespace', 'preserve') }
  $t.InnerText = $Value
  [void]$is.AppendChild($t)
  [void]$cell.AppendChild($is)
  return $cell
}

function Set-WorksheetRows([string]$Workbook, [int]$SheetNumber, [int]$FirstDataRow, [object[]]$Rows, [int]$Columns) {
  $zip = [IO.Compression.ZipFile]::Open($Workbook, [IO.Compression.ZipArchiveMode]::Update)
  try {
    $path = "xl/worksheets/sheet$SheetNumber.xml"
    $entry = $zip.GetEntry($path)
    $reader = [IO.StreamReader]::new($entry.Open())
    try { [xml]$sheet = $reader.ReadToEnd() } finally { $reader.Dispose() }
    $styleRefs = @()
    foreach ($column in 1..$Columns) {
      $letter = [char](64 + $column)
      $styleRefs += Get-Style $sheet "$letter$FirstDataRow"
    }
    $ns = [Xml.XmlNamespaceManager]::new($sheet.NameTable)
    $ns.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
    $data = $sheet.SelectSingleNode('//x:sheetData', $ns)
    @($data.SelectNodes('x:row', $ns) | Where-Object { [int]$_.GetAttribute('r') -ge $FirstDataRow }) | ForEach-Object { [void]$data.RemoveChild($_) }
    $rowNumber = $FirstDataRow
    foreach ($values in $Rows) {
      $row = $sheet.CreateElement('row', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
      $row.SetAttribute('r', [string]$rowNumber)
      for ($column = 1; $column -le $Columns; $column++) {
        $letter = [char](64 + $column)
        [void]$row.AppendChild((New-InlineCell $sheet "$letter$rowNumber" ([string]$values[$column - 1]) $styleRefs[$column - 1]))
      }
      [void]$data.AppendChild($row)
      $rowNumber++
    }
    $dimension = $sheet.SelectSingleNode('//x:dimension', $ns)
    if ($dimension) { $dimension.SetAttribute('ref', "A1:$([char](64 + $Columns))$($rowNumber - 1)") }
    $entry.Delete()
    $newEntry = $zip.CreateEntry($path)
    $writer = [IO.StreamWriter]::new($newEntry.Open(), [Text.UTF8Encoding]::new($false))
    try { $sheet.Save($writer) } finally { $writer.Dispose() }
  } finally { $zip.Dispose() }
}

if (!(Test-Path -LiteralPath $SourceWorkbook)) { throw "Source workbook not found: $SourceWorkbook" }
$strings = Get-WorkbookStrings $SourceWorkbook
$commodityRows = Get-WorksheetRows $SourceWorkbook 1 $strings | Where-Object { $_.A -and $_.A -ne 'English' }
$marketRows = Get-WorksheetRows $SourceWorkbook 2 $strings | Where-Object { $_.A -and $_.A -ne 'English' }
$varietyRows = Get-WorksheetRows $SourceWorkbook 3 $strings | Where-Object { $_.A -and $_.A -ne 'English' }
$uiRows = Get-WorksheetRows $SourceWorkbook 4 $strings | Where-Object { $_.A -and $_.A -ne 'Key' }

$workbookMaps = @{
  commodities = @{}; markets = @{}; varieties = @{}; ui = @{}
}
foreach ($row in $commodityRows) { $workbookMaps.commodities[$row.A] = $row.B }
foreach ($row in $marketRows) { $workbookMaps.markets[$row.A] = $row.B }
foreach ($row in $varietyRows) { $workbookMaps.varieties[$row.A] = $row.B }
foreach ($row in $uiRows) { $workbookMaps.ui[$row.A] = $row.C }

$rawJson = Get-Content -LiteralPath $TranslationsPath -Raw -Encoding UTF8
if ($RestoreTrackedFormatting) {
  $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  $rawJson = ((git -C $repoRoot show HEAD:translations.json) -join "`n") + "`n"
}
$translations = $rawJson | ConvertFrom-Json
$changed = @{}
$updatedKn = @{}
$workbookOnly = @{}
foreach ($section in @('commodities', 'markets', 'varieties', 'ui')) {
  $changed[$section] = 0
  $updatedKn[$section] = @{}
  $workbookOnly[$section] = 0
  foreach ($key in $workbookMaps[$section].Keys) {
    $entry = $translations.$section.PSObject.Properties[$key]
    if ($null -eq $entry) { $workbookOnly[$section]++; continue }
    if ($entry.Value.kn -ne $workbookMaps[$section][$key]) {
      $entry.Value.kn = $workbookMaps[$section][$key]
      $updatedKn[$section][$key] = $entry.Value.kn
      $changed[$section]++
    }
  }
}
$totalChanged = ($changed.Values | Measure-Object -Sum).Sum
# The supplied workbook is also a reconciliation source.  A fresh baseline is
# expected to update 46 entries; a second run is idempotent and updates none.
if ($totalChanged -ne 0 -and ($totalChanged -ne 46 -or $changed.commodities -ne 10 -or $changed.markets -ne 4 -or $changed.varieties -ne 20 -or $changed.ui -ne 12)) {
  throw "Unexpected Kannada update count: $($changed | ConvertTo-Json -Compress) (total $totalChanged)"
}
$translations.generatedAt = [DateTime]::UtcNow.ToString('o')
foreach ($section in $updatedKn.Keys) {
  $sectionStart = $rawJson.IndexOf(('"' + $section + '": {'))
  if ($sectionStart -lt 0) { throw "Cannot find JSON section: $section" }
  $nextSectionStart = $rawJson.Length
  foreach ($candidate in @('ui', 'commodities', 'markets', 'varieties')) {
    $candidateStart = $rawJson.IndexOf(('"' + $candidate + '": {'), $sectionStart + 1)
    if ($candidateStart -ge 0 -and $candidateStart -lt $nextSectionStart) { $nextSectionStart = $candidateStart }
  }
  $sectionJson = $rawJson.Substring($sectionStart, $nextSectionStart - $sectionStart)
  foreach ($key in $updatedKn[$section].Keys) {
    $entry = $translations.$section.PSObject.Properties[$key].Value
    $escapedKey = [regex]::Escape($key)
    $escapedEn = [regex]::Escape($entry.en)
    $escapedKn = $entry.kn.Replace('\', '\\').Replace('"', '\"')
    $pattern = '(?s)("' + $escapedKey + '"\s*:\s*\{\s*"en"\s*:\s*"' + $escapedEn + '"\s*,\s*"kn"\s*:\s*")[^"]*(")'
    $sectionJson = [regex]::Replace($sectionJson, $pattern, ('$1' + $escapedKn + '$2'), 1)
  }
  $rawJson = $rawJson.Substring(0, $sectionStart) + $sectionJson + $rawJson.Substring($nextSectionStart)
}
$rawJson = [regex]::Replace($rawJson, '(?<="generatedAt"\s*:\s*")[^"]+', $translations.generatedAt, 1)
[IO.File]::WriteAllText((Resolve-Path $TranslationsPath), $rawJson, [Text.UTF8Encoding]::new($false))

$missingUi = @($translations.ui.PSObject.Properties | Where-Object { -not $workbookMaps.ui.ContainsKey($_.Name) } | ForEach-Object { ,@($_.Name, $_.Value.en, $_.Value.kn) })
if ($missingUi.Count -ne 32) { throw "Expected 32 UI entries missing from the source workbook; found $($missingUi.Count)." }
Copy-Item -LiteralPath $SourceWorkbook -Destination $MissingWorkbook -Force
Set-WorksheetRows $MissingWorkbook 1 2 @() 2
Set-WorksheetRows $MissingWorkbook 2 2 @() 2
Set-WorksheetRows $MissingWorkbook 3 3 @() 2
Set-WorksheetRows $MissingWorkbook 4 3 $missingUi 3

Write-Output ([PSCustomObject]@{
  changed = $changed
  totalChanged = $totalChanged
  workbookOnly = $workbookOnly
  missingUi = $missingUi.Count
  missingWorkbook = $MissingWorkbook
} | ConvertTo-Json -Compress)
