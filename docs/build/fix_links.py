# Rewrites internal PDF links from named "/Dest" entries to explicit "/A GoTo" page actions,
# which more PDF viewers (including Google Drive's preview) follow.
import sys
from pypdf import PdfReader, PdfWriter
from pypdf.generic import (ArrayObject, DictionaryObject, FloatObject, NameObject,
                           NullObject, NumberObject)

src, dst = sys.argv[1], sys.argv[2]
reader = PdfReader(src)
writer = PdfWriter(clone_from=reader)

named = reader.named_destinations          # name -> Destination
page_ids = [p.indirect_reference for p in writer.pages]

def explicit_dest(dest):
    """Return [pageRef /XYZ left top 0] for a named or explicit destination."""
    if hasattr(dest, 'get_object'):
        dest = dest.get_object()
    if isinstance(dest, (str, bytes)) or type(dest).__name__ in ('TextStringObject', 'ByteStringObject', 'NameObject'):
        d = named.get(str(dest))
        if d is None:
            return None
        page_num = reader.get_destination_page_number(d)
        top = d.top if d.top is not None else NullObject()
        left = d.left if d.left is not None else NullObject()
    else:  # explicit array [page /XYZ ...]
        ids = [ref.idnum for ref in page_ids]   # the copied file renumbers objects
        ref = dest[0]
        page_num = ids.index(ref.idnum) if ref.idnum in ids else None
        if page_num is None:
            return None
        left = dest[2] if len(dest) > 2 else NullObject()
        top = dest[3] if len(dest) > 3 else NullObject()
    return ArrayObject([page_ids[page_num], NameObject('/XYZ'),
                        left if not isinstance(left, (int, float)) else FloatObject(left),
                        top if not isinstance(top, (int, float)) else FloatObject(top),
                        NumberObject(0)])

fixed = skipped = 0
for page in writer.pages:
    for annot_ref in page.get('/Annots', []) or []:
        annot = annot_ref.get_object()
        if annot.get('/Subtype') != '/Link' or '/Dest' not in annot:
            continue
        d = explicit_dest(annot['/Dest'])
        if d is None:
            skipped += 1
            continue
        action = DictionaryObject({NameObject('/S'): NameObject('/GoTo'), NameObject('/D'): d})
        annot[NameObject('/A')] = action
        del annot['/Dest']
        fixed += 1

with open(dst, 'wb') as f:
    writer.write(f)
print(f'links converted: {fixed}, unresolved: {skipped}')
