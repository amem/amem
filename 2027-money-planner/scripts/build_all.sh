#!/usr/bin/env bash
# Rebuild everything: product files, checks, screenshots, listing images, videos, zips.
# Needs: python3, LibreOffice Calc (soffice), Node + Playwright (for the mockup images).
set -euo pipefail
cd "$(dirname "$0")/../product/src"
pip install -q -r ../requirements.txt
python3 build_workbook.py      # -> product/dist/*.xlsx (clean + DEMO for 3 editions)
python3 build_guide.py         # -> product/dist/*-GUIDE.pdf
python3 verify.py              # recalculates in LibreOffice and checks the numbers
python3 package.py             # -> product/dist/*.zip (for Payhip / Gumroad)
python3 render_previews.py     # -> images/raw/ (real screenshots of every sheet)
python3 make_mockups.py        # -> images/listing/, images/marketing/
python3 make_video.py          # -> images/listing/*.mp4
echo "All done."
