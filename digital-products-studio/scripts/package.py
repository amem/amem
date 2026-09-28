"""Package each product into the ZIP buyers download (dist/<id>-v<version>.zip).

The game also gets a web build (dist/neon-stack-web-v<version>.zip, index.html at the root)
for itch.io and web-game portals.
"""

import os
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
VERSION = "1.0.0"
PRODUCTS = ["neon-stack", "invoice-studio", "watermark-studio", "py-automation-kit"]
SKIP_DIRS = {"node_modules", "test-results", "__pycache__", ".pytest_cache", ".git"}
SKIP_FILES = {".DS_Store", "Thumbs.db"}


def add_tree(z, folder, prefix):
    count = 0
    for dirpath, dirnames, filenames in os.walk(folder):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS)
        for name in sorted(filenames):
            if name in SKIP_FILES or name.endswith(".pyc"):
                continue
            path = Path(dirpath) / name
            z.write(path, str(Path(prefix) / path.relative_to(folder)))
            count += 1
    return count


def zip_folder(folder, out, prefix):
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        n = add_tree(z, folder, prefix)
    with zipfile.ZipFile(out) as z:
        assert z.testzip() is None, f"corrupt zip {out}"
    print(f"{out.relative_to(ROOT)}  {n} files  {out.stat().st_size / 1024:.0f} KB")
    return out


def main():
    DIST.mkdir(exist_ok=True)
    for pid in PRODUCTS:
        zip_folder(ROOT / "products" / pid, DIST / f"{pid}-v{VERSION}.zip", pid)
    zip_folder(ROOT / "products" / "neon-stack" / "src", DIST / f"neon-stack-web-v{VERSION}.zip", "")


if __name__ == "__main__":
    main()
