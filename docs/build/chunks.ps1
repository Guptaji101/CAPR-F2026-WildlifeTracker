param([string]$Docx, [string]$OutDir, [int]$Size = 7)
# Exports the document as several small PDFs (pages 1-7, 8-14, ...) for visual checking.
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open($Docx, $false, $true)
  $n = $doc.ComputeStatistics(2)
  for ($from = 1; $from -le $n; $from += $Size) {
    $to = [Math]::Min($from + $Size - 1, $n)
    $out = Join-Path $OutDir ("check_{0:D2}-{1:D2}.pdf" -f $from, $to)
    $doc.ExportAsFixedFormat($out, 17, $false, 0, 3, $from, $to)
    $out
  }
  $doc.Close([ref] 0)
} finally {
  try { $word.Quit() } catch {}
}
