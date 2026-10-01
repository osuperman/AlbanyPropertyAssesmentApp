"""Extract text from an Albany assessment roll PDF, one printed line per line, pages separated by form feeds.

Usage: python extract-roll-pdf.py <roll.pdf> <output.txt>   (requires: pip install pypdf)
The output is parsed by convert-roll.js via roll-layout-parser.js.
"""
import sys, pypdf, time
src, out = sys.argv[1], sys.argv[2]
r = pypdf.PdfReader(src)
t0 = time.time()
with open(out, "w", encoding="utf-8", newline="\n") as f:
    for i, page in enumerate(r.pages):
        f.write("\f" if i else "")
        f.write(page.extract_text() or "")
        f.write("\n")
        if i % 500 == 0:
            print(f"{i}/{len(r.pages)} pages, {time.time()-t0:.0f}s", flush=True)
print("done", len(r.pages), f"{time.time()-t0:.0f}s", flush=True)
