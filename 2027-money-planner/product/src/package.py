"""Zip each edition (clean .xlsx + DEMO .xlsx + PDF guide) for Payhip / Gumroad upload."""

import os
import zipfile

import build_workbook as B

DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dist")

for ed in B.EDITIONS.values():
    base = ed["file"]
    files = [f"{base}.xlsx", f"{base}-DEMO.xlsx", f"{base}-GUIDE.pdf"]
    out = os.path.join(DIST, f"{base}.zip")
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for f in files:
            z.write(os.path.join(DIST, f), arcname=f"{base}/{f}")
    print(out, os.path.getsize(out) // 1024, "KB")
