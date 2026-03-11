param(
  [string]$InputPath = "C:\Users\steph\OneDrive\Documents\PDFgear\Residential Inventory conv.xls",
  [string]$CsvPath = ".\residential-inventory-2025.csv",
  [string]$JsonPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Normalize-ParcelId([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
  return (($Value -replace "[\u2010-\u2015\u2212]", "-") -replace "\s+", "" -replace "^(?:sbl|pin|printkey)[:\s-]*", "").Trim()
}

function Normalize-Header([string]$Value) {
  $source = if ([string]::IsNullOrEmpty($Value)) { "" } else { $Value }
  $text = $source.Trim().ToLowerInvariant()
  switch ($text) {
    "print_key" { return "printKey" }
    "prop_class" { return "propClass" }
    "loc_st_nbr" { return "houseNumber" }
    "loc_st_name" { return "streetName" }
    "loc_mail_st_suff" { return "streetSuffix" }
    "bldg_style" { return "buildingStyle" }
    "yr_built" { return "yearBuilt" }
    "sfla" { return "sqftLivingArea" }
    "nbr_bedrooms" { return "bedrooms" }
    "nbr_half_baths" { return "halfBaths" }
    "nbr_full_baths" { return "fullBaths" }
    "total_av" { return "inventoryTotalAssessedValue" }
    default { return "" }
  }
}

function Parse-NullableInt([string]$Value) {
  $source = if ([string]::IsNullOrEmpty($Value)) { "" } else { $Value }
  $clean = ($source -replace "[^\d\-]", "").Trim()
  if ([string]::IsNullOrWhiteSpace($clean)) { return $null }
  try { return [int]$clean } catch { return $null }
}

function Parse-NullableNumber([string]$Value) {
  $source = if ([string]::IsNullOrEmpty($Value)) { "" } else { $Value }
  $clean = ($source -replace "[$,\s]", "").Trim()
  if ([string]::IsNullOrWhiteSpace($clean)) { return $null }
  try { return [double]$clean } catch { return $null }
}

function Resolve-OutputPath([string]$Value) {
  if ([System.IO.Path]::IsPathRooted($Value)) { return $Value }
  return [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $Value))
}

$resolvedInput = Resolve-Path -LiteralPath $InputPath
$resolvedCsv = Resolve-OutputPath $CsvPath
$resolvedJson = if ([string]::IsNullOrWhiteSpace($JsonPath)) { "" } else { Resolve-OutputPath $JsonPath }

$csvDir = Split-Path -Parent $resolvedCsv
if ($csvDir -and -not (Test-Path -LiteralPath $csvDir)) {
  New-Item -ItemType Directory -Path $csvDir | Out-Null
}
if ($resolvedJson) {
  $jsonDir = Split-Path -Parent $resolvedJson
  if ($jsonDir -and -not (Test-Path -LiteralPath $jsonDir)) {
    New-Item -ItemType Directory -Path $jsonDir | Out-Null
  }
}

$excel = $null
$workbook = $null
$rows = New-Object System.Collections.Generic.List[object]
$seen = New-Object 'System.Collections.Generic.HashSet[string]'

try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $workbook = $excel.Workbooks.Open($resolvedInput.Path, 0, $true)

  foreach ($worksheet in $workbook.Worksheets) {
    $usedRange = $worksheet.UsedRange
    if ($usedRange.Rows.Count -lt 3) { continue }

    $headerMap = @{}
    for ($column = 1; $column -le $usedRange.Columns.Count; $column++) {
      $normalized = Normalize-Header ([string]$worksheet.Cells.Item(2, $column).Text)
      if ($normalized) {
        $headerMap[$normalized] = $column
      }
    }

    if (-not $headerMap.ContainsKey("printKey")) { continue }

    for ($rowIndex = 3; $rowIndex -le $usedRange.Rows.Count; $rowIndex++) {
      $printKeyText = [string]$worksheet.Cells.Item($rowIndex, $headerMap["printKey"]).Text
      $printKey = Normalize-ParcelId $printKeyText
      if ([string]::IsNullOrWhiteSpace($printKey) -or $printKey -eq "print_key") { continue }
      if ($seen.Contains($printKey)) { continue }

      $propClass = if ($headerMap.ContainsKey("propClass")) { ([string]$worksheet.Cells.Item($rowIndex, $headerMap["propClass"]).Text).Trim() } else { "" }
      if ([string]::IsNullOrWhiteSpace($propClass)) { continue }

      $record = [pscustomobject]@{
        printKey = $printKey
        propClass = $propClass
        houseNumber = if ($headerMap.ContainsKey("houseNumber")) { ([string]$worksheet.Cells.Item($rowIndex, $headerMap["houseNumber"]).Text).Trim() } else { $null }
        streetName = if ($headerMap.ContainsKey("streetName")) { ([string]$worksheet.Cells.Item($rowIndex, $headerMap["streetName"]).Text).Trim() } else { $null }
        streetSuffix = if ($headerMap.ContainsKey("streetSuffix")) { ([string]$worksheet.Cells.Item($rowIndex, $headerMap["streetSuffix"]).Text).Trim() } else { $null }
        buildingStyle = if ($headerMap.ContainsKey("buildingStyle")) { ([string]$worksheet.Cells.Item($rowIndex, $headerMap["buildingStyle"]).Text).Trim() } else { $null }
        yearBuilt = if ($headerMap.ContainsKey("yearBuilt")) { Parse-NullableInt ([string]$worksheet.Cells.Item($rowIndex, $headerMap["yearBuilt"]).Text) } else { $null }
        sqftLivingArea = if ($headerMap.ContainsKey("sqftLivingArea")) { Parse-NullableInt ([string]$worksheet.Cells.Item($rowIndex, $headerMap["sqftLivingArea"]).Text) } else { $null }
        bedrooms = if ($headerMap.ContainsKey("bedrooms")) { Parse-NullableInt ([string]$worksheet.Cells.Item($rowIndex, $headerMap["bedrooms"]).Text) } else { $null }
        halfBaths = if ($headerMap.ContainsKey("halfBaths")) { Parse-NullableInt ([string]$worksheet.Cells.Item($rowIndex, $headerMap["halfBaths"]).Text) } else { $null }
        fullBaths = if ($headerMap.ContainsKey("fullBaths")) { Parse-NullableInt ([string]$worksheet.Cells.Item($rowIndex, $headerMap["fullBaths"]).Text) } else { $null }
        inventoryTotalAssessedValue = if ($headerMap.ContainsKey("inventoryTotalAssessedValue")) { Parse-NullableNumber ([string]$worksheet.Cells.Item($rowIndex, $headerMap["inventoryTotalAssessedValue"]).Text) } else { $null }
        sourceSheet = $worksheet.Name
      }

      [void]$seen.Add($printKey)
      $rows.Add($record)
    }
  }
}
finally {
  if ($workbook) {
    $workbook.Close($false)
    [void][System.Runtime.Interopservices.Marshal]::ReleaseComObject($workbook)
  }
  if ($excel) {
    $excel.Quit()
    [void][System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel)
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}

$sortedRows = $rows | Sort-Object printKey
$sortedRows | Export-Csv -LiteralPath $resolvedCsv -NoTypeInformation -Encoding UTF8

if ($resolvedJson) {
  $sortedRows | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $resolvedJson -Encoding UTF8
}

Write-Output ("Converted {0} inventory rows to {1}" -f $rows.Count, $resolvedCsv)
if ($resolvedJson) {
  Write-Output ("Wrote JSON copy to {0}" -f $resolvedJson)
}
