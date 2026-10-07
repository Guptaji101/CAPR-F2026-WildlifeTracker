# Document builds

Scripts that generate the team's documents (Word + PDF) and their figures:
- **Week3_Requirements_Analysis_v1.1**: text in `build.js`
- **System_Design_v1.0**: text in `design.js`

Figures for both are in `diagrams.js`. Edit those files, then rebuild. Don't edit the generated
Word files by hand, or the changes will be lost on the next build.

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
```bash
npm run design
```

Then fill in the contents page and export the PDF with Word (PowerShell). Close the document in
Word first. Example for the System Design (use the same pattern for the Requirements Analysis):

```powershell
.\finalize.ps1 -Docx "$PWD\out\System_Design_v1.0.docx" -Pdf "$PWD\out\System_Design_v1.0.pdf"
```

Finally, make the copy for Google Drive. Drive's PDF preview ignores Word's contents links; this
copy uses "go to page" link actions instead, which were confirmed to work in Drive on 7 Oct 2026
(needs `pip install pypdf`):

```bash
python fix_links.py out/System_Design_v1.0.pdf out/System_Design_v1.0_drive.pdf
```

Upload the `_drive.pdf` to Drive, and copy the outputs to `Downloads`.

## Files
| File | Purpose |
|---|---|
| `common.js` | Shared helpers for both documents: text, tables, figures, title block, page styles |
| `build.js` | Requirements Analysis text: requirements, use cases, tables, figure placement |
| `design.js` | System Design text: architecture, database decision, data dictionary, DFD descriptions |
| `diagrams.js` | Draws the figures as SVG and renders PNGs into `fig/` (`node diagrams.js erd` renders one). System Design figures: `architecture_design`, `erd`, `dfd_context`, `dfd_level1` |
| `fix_links.py` | Makes the Google Drive copy of a PDF (contents links as "go to page" actions) |
| `finalize.ps1` | Opens the .docx in Word, updates the contents page, saves, exports a PDF with bookmarks |
| `chunks.ps1` | Exports the PDF in small page ranges, for checking pages visually |

`fig/`, `out/`, `check/` and `node_modules/` are generated and not committed.
