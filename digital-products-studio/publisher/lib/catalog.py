"""Load and validate the product catalog (catalog/catalog.json)."""

import json
from pathlib import Path

PLATFORMS = ("etsy", "gumroad", "polar", "itch")


class CatalogError(Exception):
    pass


class Product:
    def __init__(self, data, root):
        self.data = data
        self.root = Path(root)
        self.id = data["id"]
        self.title = data["title"]
        self.summary = data.get("summary", "")
        self.price = float(data["price_usd"])
        self.tags = data.get("tags", [])
        self.version = data.get("version", "1.0.0")
        desc = data.get("description_file")
        self.description = (self.root / desc).read_text(encoding="utf-8").strip() if desc and (self.root / desc).exists() else data.get("description", "")

    def path(self, rel):
        return (self.root / rel).resolve()

    def files(self):
        return [self.path(f) for f in self.data.get("files", [])]

    def images(self):
        return [self.path(f) for f in self.data.get("images", [])]

    def platform(self, name):
        return self.data.get(name) or {}

    def enabled(self, name):
        return bool(self.platform(name).get("enabled"))

    def missing_files(self, platform=None):
        paths = self.files() + self.images()
        extra = self.platform(platform) if platform else {}
        for key in ("images", "files"):
            paths += [self.path(p) for p in extra.get(key, [])]
        for key in ("video", "cover", "thumbnail"):
            if extra.get(key):
                paths.append(self.path(extra[key]))
        for build in extra.get("builds", []):
            paths.append(self.path(build["path"]))
        return [p for p in paths if not p.exists()]


def load(catalog_path):
    path = Path(catalog_path).resolve()
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        raise CatalogError(f"cannot read {path}: {e}") from None
    root = (path.parent / raw.get("root", "..")).resolve()
    products = []
    seen = set()
    for item in raw.get("products", []):
        for key in ("id", "title", "price_usd"):
            if key not in item:
                raise CatalogError(f"product {item.get('id', '?')} is missing '{key}'")
        if item["id"] in seen:
            raise CatalogError(f"duplicate product id {item['id']}")
        seen.add(item["id"])
        products.append(Product(item, root))
    return raw.get("settings", {}), products


def placeholders(product, platform):
    """Unedited template values like YOUR_ITCH_USERNAME that must be replaced before going live."""
    found = []

    def walk(value):
        if isinstance(value, str) and "YOUR_" in value:
            found.append(value)
        elif isinstance(value, dict):
            for v in value.values():
                walk(v)
        elif isinstance(value, list):
            for v in value:
                walk(v)

    walk(product.platform(platform))
    return found


def validate_etsy(product):
    """Return a list of problems with the Etsy listing data (empty = OK)."""
    cfg = product.platform("etsy")
    problems = []
    title = cfg.get("title", product.title)
    tags = cfg.get("tags", product.tags)
    if len(title) > 140:
        problems.append(f"title is {len(title)} characters (max 140)")
    if len(tags) > 13:
        problems.append(f"{len(tags)} tags (max 13)")
    problems += [f"tag '{t}' is longer than 20 characters" for t in tags if len(t) > 20]
    files = [product.path(f) for f in cfg.get("files", [])] or product.files()
    if len(files) > 5:
        problems.append(f"{len(files)} files (Etsy allows 5)")
    for f in files:
        if f.exists() and f.stat().st_size > 20 * 1024 * 1024:
            problems.append(f"{f.name} is larger than 20 MB")
    images = [product.path(f) for f in cfg.get("images", [])] or product.images()
    if not images:
        problems.append("at least one image is required")
    if len(images) > 20:
        problems.append(f"{len(images)} images (max 20)")
    if not cfg.get("taxonomy_id"):
        problems.append("taxonomy_id is not set (find one with: publish.py etsy-taxonomy --search <word>)")
    return problems
