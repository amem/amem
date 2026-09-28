"""Render real screenshots of every sheet of the DEMO workbooks.

    python render_previews.py      # needs LibreOffice Calc + pymupdf

Builds a print-area copy of each demo workbook, recalculates it in
LibreOffice, exports it to PDF (one page per sheet) and rasterises each page
to PNG in ../../images/raw/. These PNGs are what the listing mockups use, so
the images buyers see are the actual product.
"""

import os
import subprocess
import tempfile
import time

import fitz  # pymupdf

import build_workbook as B

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.abspath(os.path.join(HERE, "..", "..", "images", "raw"))


def export_pdf(xlsx_paths, outdir):
    import uno
    from com.sun.star.beans import PropertyValue

    def prop(name, value):
        p = PropertyValue()
        p.Name, p.Value = name, value
        return p

    port = 2003
    proc = subprocess.Popen(["soffice", "--headless", "--invisible", "--norestore",
                             f"--accept=socket,host=127.0.0.1,port={port};urp;"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    pdfs = []
    try:
        local = uno.getComponentContext()
        resolver = local.ServiceManager.createInstanceWithContext("com.sun.star.bridge.UnoUrlResolver", local)
        for _ in range(60):
            try:
                ctx = resolver.resolve(f"uno:socket,host=127.0.0.1,port={port};urp;StarOffice.ComponentContext")
                break
            except Exception:
                time.sleep(0.5)
        desktop = ctx.ServiceManager.createInstanceWithContext("com.sun.star.frame.Desktop", ctx)
        for path in xlsx_paths:
            doc = desktop.loadComponentFromURL(uno.systemPathToFileUrl(path), "_blank", 0, (prop("Hidden", True),))
            doc.calculateAll()
            doc.calculateAll()
            names = [s.Name for s in doc.Sheets]
            visible = [n for n in names if doc.Sheets.getByName(n).IsVisible]
            pdf = os.path.join(outdir, os.path.basename(path).replace(".xlsx", ".pdf"))
            doc.storeToURL(uno.systemPathToFileUrl(pdf), (prop("FilterName", "calc_pdf_Export"),))
            doc.close(True)
            pdfs.append((pdf, visible))
        try:
            desktop.terminate()
        except Exception:
            pass
    finally:
        try:
            proc.wait(timeout=20)
        except subprocess.TimeoutExpired:
            proc.kill()
    return pdfs


def main():
    os.makedirs(RAW, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        xlsx = [B.build(e, True, tmp, render=True) for e in ("bundle", "holiday", "debt")]
        for pdf, sheets in export_pdf([os.path.abspath(p) for p in xlsx], tmp):
            doc = fitz.open(pdf)
            prefix = os.path.basename(pdf).split("-DEMO")[0]
            print(prefix, doc.page_count, "pages for", len(sheets), "sheets")
            for i, page in enumerate(doc):
                name = sheets[i] if i < len(sheets) else f"page{i}"
                pix = page.get_pixmap(dpi=220)
                out = os.path.join(RAW, f"{prefix}__{name.replace(' ', '-')}.png")
                pix.save(out)
                print("  ", os.path.relpath(out, RAW), pix.width, "x", pix.height)


if __name__ == "__main__":
    main()
