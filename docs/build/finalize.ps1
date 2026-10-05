param([string]$Docx, [string]$Pdf)
# Opens the generated .docx in Word, fills in the table of contents, saves it, and exports a PDF.
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open($Docx, $false, $false)
  foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
  $doc.Fields.Update() | Out-Null
  foreach ($toc in $doc.TablesOfContents) { $toc.UpdatePageNumbers() }
  $doc.Save()
  # PDF with clickable contents links and a heading bookmarks panel (CreateBookmarks = 1)
  $doc.ExportAsFixedFormat($Pdf, 17, $false, 0, 0, 1, 1, 0, $true, $true, 1, $true, $true, $false)
  "Pages: " + $doc.ComputeStatistics(2)
  $doc.Close([ref] 0)
} finally {
  try { $word.Quit() } catch {}
}
