# Requirements document build

Scripts that generate **Week3_Requirements_Analysis_v1.1** (Word + PDF) and its four figures.
Edit the text in `build.js` and the figures in `diagrams.js`, then rebuild. Don't edit the
generated Word file by hand, or the changes will be lost on the next build.

## Requirements
- Node.js (18+)
- Google Chrome (renders the diagrams). If it isn't in the default location, set `CHROME_PATH`.
- Microsoft Word (Windows), to fill in the table of contents and export the PDF

## Rebuild
Run these from this folder:

```bash
npm install
```
```bash
npm run diagrams
```
```bash
npm run build
```

Then fill in the contents page and export the PDF with Word (PowerShell):

```powershell
.\finalize.ps1 -Docx "$PWD\out\Week3_Requirements_Analysis_v1.1.docx" -Pdf "$PWD\out\Week3_Requirements_Analysis_v1.1.pdf"
```

## Files
| File | Purpose |
|---|---|
| `build.js` | All document text: requirements, use cases, tables, figure placement |
| `diagrams.js` | Draws the figures as SVG and renders PNGs into `fig/` (`node diagrams.js usecase` renders one) |
| `finalize.ps1` | Opens the .docx in Word, updates the contents page, saves, exports a PDF with bookmarks |
| `chunks.ps1` | Exports the PDF in small page ranges, for checking pages visually |

`fig/`, `out/`, `check/` and `node_modules/` are generated and not committed.
