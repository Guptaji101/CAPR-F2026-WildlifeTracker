// Shared helpers for the WildTrack documents (build.js = Requirements Analysis, design.js = System Design):
// text, tables, figures, and the common page layout and styles.
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, ImageRun, Footer, PageNumber, TabStopType, TableOfContents,
  LevelFormat, VerticalAlign, TableLayoutType, Tab, PageBreak,
} = require('docx');

const FIG = path.join(__dirname, 'fig');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

const FONT = 'Arial';
const GREEN = '2E6F40', LIGHT = 'EAF3EA', GREY = '555555', BORDER = 'A6A6A6';
const TW = 10080; // text width: 7.0 in (US Letter, 0.75 in margins)

/* ---------------- text helpers ---------------- */
// "**bold**" markup -> runs
function runs(text, o = {}) {
  return String(text).split('**').map((t, i) => (t ? new TextRun({
    text: t, font: FONT, bold: i % 2 === 1 || o.bold, italics: o.italics, color: o.color, size: o.size,
  }) : null)).filter(Boolean);
}
function P(text, o = {}) {
  return new Paragraph({
    children: runs(text, o), alignment: o.align, keepNext: o.keepNext, keepLines: o.keepLines,
    spacing: { before: o.before ?? 0, after: o.after ?? 120, line: o.line ?? 276 },
  });
}
// newPage: start this section at the top of a new page
const H1 = (t, { newPage = false } = {}) => new Paragraph({
  heading: HeadingLevel.HEADING_1, children: [new TextRun(t)], pageBreakBefore: newPage,
  border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GREEN, space: 4 } },
});
const H2 = (t, { newPage = false } = {}) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)], pageBreakBefore: newPage });
const H3 = t => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });
const bullet = (t, o = {}) => new Paragraph({
  numbering: { reference: 'bullets', level: 0 }, children: runs(t, o), keepNext: o.keepNext,
  spacing: { after: o.after ?? 60, line: o.line ?? 264 },
});
let listInstance = 0;
const steps = (items, o = {}) => {
  const inst = ++listInstance;
  return items.map(t => new Paragraph({
    numbering: { reference: 'steps', level: 0, instance: inst }, children: runs(t, o),
    spacing: { after: 30, line: 252 },
  }));
};
const caption = t => new Paragraph({ style: 'Caption', children: [new TextRun(t)] });

function figure(file, widthPx, title) {
  const buf = fs.readFileSync(path.join(FIG, file));
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 40 },
      children: [new ImageRun({
        type: 'png', data: buf, transformation: { width: widthPx, height: Math.round(widthPx * h / w) },
        altText: { title, description: title, name: file },
      })],
    }),
    caption(title),
  ];
}

/* ---------------- table helpers ---------------- */
const line = { style: BorderStyle.SINGLE, size: 4, color: BORDER };
const BORDERS = { top: line, bottom: line, left: line, right: line, insideHorizontal: line, insideVertical: line };

function cell(content, width, o = {}) {
  const items = Array.isArray(content) ? content : [content];
  const children = items.map(c => (typeof c === 'string'
    ? P(c, { size: o.size ?? 18, bold: o.bold, color: o.color, after: 0, line: 252, align: o.align, keepNext: o.keepNext })
    : c));
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    verticalAlign: o.valign ?? VerticalAlign.TOP,
    rowSpan: o.rowSpan, columnSpan: o.colSpan,
    children,
  });
}

// rows: arrays of strings or {t, rowSpan, colSpan, fill, bold, align}; omit cells covered by a rowSpan above.
function table(widths, header, rows, o = {}) {
  const out = [];
  if (header) {
    out.push(new TableRow({
      tableHeader: true, cantSplit: true,
      children: header.map((h, i) => cell(h, widths[i], { fill: GREEN, color: 'FFFFFF', bold: true, valign: VerticalAlign.CENTER, keepNext: true })),
    }));
  }
  const occ = new Array(widths.length).fill(0);
  rows.forEach(r => {
    const busy = occ.map(v => v > 0);
    let col = 0;
    const cells = [];
    r.forEach(item => {
      while (col < widths.length && busy[col]) col++;
      const spec = (typeof item === 'string' || Array.isArray(item) || item instanceof Paragraph) ? { t: item } : item;
      const cs = spec.colSpan || 1;
      const w = widths.slice(col, col + cs).reduce((a, b) => a + b, 0);
      cells.push(cell(spec.t, w, { ...(o.cell || {}), ...spec }));
      if (spec.rowSpan > 1) for (let k = col; k < col + cs; k++) occ[k] = spec.rowSpan;
      col += cs;
    });
    for (let k = 0; k < occ.length; k++) if (occ[k] > 0) occ[k]--;
    out.push(new TableRow({ cantSplit: o.cantSplit ?? true, children: cells }));
  });
  return new Table({
    width: { size: TW, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED,
    borders: BORDERS, rows: out,
  });
}
const spacer = (after = 120) => new Paragraph({ spacing: { after, line: 240 }, children: [] });

/* ---------------- title block and document ---------------- */
// Title, subtitle, info line, then the contents page
function titleBlock(title, subtitle, info) {
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240, after: 60 }, children: [new TextRun({ text: title, bold: true, color: GREEN, size: 40, font: FONT })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: subtitle, color: GREY, size: 22, font: FONT })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 360 }, children: [new TextRun({ text: info, color: GREY, size: 19, font: FONT })] }),
    new Paragraph({ spacing: { after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GREEN, space: 4 } }, children: [new TextRun({ text: 'Contents', bold: true, color: GREEN, size: 28, font: FONT })] }),
    new TableOfContents('Contents', { hyperlink: true, headingStyleRange: '1-2' }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// Writes out/<file> with the shared styles, footer and page layout
function writeDoc({ file, title, description, footer, body }) {
  const doc = new Document({
    creator: 'CAPR-F2026 Group 3',
    title, description,
    styles: {
      default: { document: { run: { font: FONT, size: 20, color: '1A1A1A' }, paragraph: { spacing: { after: 120, line: 276 } } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { font: FONT, size: 28, bold: true, color: GREEN },
          paragraph: { spacing: { before: 360, after: 160 }, keepNext: true, keepLines: true, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { font: FONT, size: 22, bold: true, color: '000000' },
          paragraph: { spacing: { before: 240, after: 120 }, keepNext: true, keepLines: true, outlineLevel: 1 } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { font: FONT, size: 21, bold: true, color: GREEN },
          paragraph: { spacing: { before: 300, after: 100 }, keepNext: true, keepLines: true, outlineLevel: 2 } },
        { id: 'Caption', name: 'Caption', basedOn: 'Normal', next: 'Normal',
          run: { font: FONT, size: 17, italics: true, color: GREY },
          paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 40, after: 240 } } },
      ],
    },
    numbering: {
      config: [
        { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 240 } } } }] },
        { reference: 'steps', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 340, hanging: 300 } } } }] },
      ],
    },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: TW }],
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF', space: 4 } },
            children: [
              new TextRun({ text: footer, size: 16, color: '777777', font: FONT }),
              new TextRun({ children: [new Tab(), 'Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES], size: 16, color: '777777', font: FONT }),
            ],
          })],
        }),
      },
      children: body,
    }],
  });
  return Packer.toBuffer(doc).then(buf => {
    const f = path.join(OUT, file);
    fs.writeFileSync(f, buf);
    console.log('wrote', f, Math.round(buf.length / 1024) + 'KB');
  });
}

module.exports = {
  Paragraph, TextRun, AlignmentType,
  GREEN, LIGHT, GREY, TW,
  runs, P, H1, H2, H3, bullet, steps, caption, figure, cell, table, spacer, titleBlock, writeDoc,
};
