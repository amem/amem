"""Convert the plain-text listing descriptions into simple HTML (for Gumroad) safely."""

import html
import re

BULLET = re.compile(r"^\s*(?:[-*•✓]|\d+[.)])\s+")
LINK = re.compile(r"(https?://[^\s<]+)")
BOLD = re.compile(r"\*\*(.+?)\*\*")


def _inline(text):
    escaped = html.escape(text, quote=False)
    escaped = BOLD.sub(r"<strong>\1</strong>", escaped)
    return LINK.sub(r'<a href="\1">\1</a>', escaped)


def to_html(text):
    """Paragraphs, bullet lists, '★ HEADINGS' / '## headings', **bold** and links. Everything else is escaped."""
    out = []
    blocks = re.split(r"\n\s*\n", text.strip())
    for block in blocks:
        lines = [ln.rstrip() for ln in block.splitlines() if ln.strip()]
        if not lines:
            continue
        first = lines[0].strip()
        heading = None
        if first.startswith("## ") or first.startswith("★ "):
            heading = first[3:].strip() if first.startswith("## ") else first[2:].strip()
            lines = lines[1:]
        if heading:
            out.append(f"<h3>{_inline(heading)}</h3>")
        if not lines:
            continue
        if all(BULLET.match(ln) for ln in lines):
            items = "".join(f"<li>{_inline(BULLET.sub('', ln))}</li>" for ln in lines)
            out.append(f"<ul>{items}</ul>")
        else:
            out.append("<p>" + "<br>".join(_inline(ln.strip()) for ln in lines) + "</p>")
    return "\n".join(out)
