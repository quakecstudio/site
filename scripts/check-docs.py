#!/usr/bin/env python3
"""Checks the user guide under public/docs/.

Every page has one h1 and a lang; every image has alt text; every local link and anchor
resolves. With --help-links FILE (or a URL), every `page#anchor` line of that file, the
app's list of its help links (apps/desktop/help-links.txt in quakecstudio/editor), must
name a page and anchor that exist.
"""

import argparse
import sys
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent / "public"
DOCS = ROOT / "docs"


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.links = []
        self.h1 = 0
        self.lang = None
        self.missing_alt = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.add(attrs["id"])
        if tag == "html":
            self.lang = attrs.get("lang")
        if tag == "h1":
            self.h1 += 1
        if tag == "img":
            if not attrs.get("alt"):
                self.missing_alt += 1
            self.links.append(attrs.get("src", ""))
        if tag in ("a", "link") and "href" in attrs:
            self.links.append(attrs["href"])


def parse(path):
    page = Page()
    page.feed(path.read_text(encoding="utf-8"))
    return page


def resolve(base, href):
    """The local file and fragment `href` names from page `base`, or None for another site."""
    parts = urlsplit(href)
    if parts.scheme or parts.netloc or href.startswith("mailto:"):
        return None
    if parts.path.startswith("/"):
        target = ROOT / parts.path.lstrip("/")
    elif parts.path:
        target = base.parent / parts.path
    else:
        target = base
    if target.is_dir() or parts.path.endswith("/"):
        target = target / "index.html"
    return target.resolve(), parts.fragment


def main():
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument("--help-links", help="file or URL listing page#anchor lines")
    opts = args.parse_args()

    pages = {path.resolve(): parse(path) for path in sorted(DOCS.glob("*.html"))}
    errors = []
    for path, page in pages.items():
        name = path.relative_to(ROOT)
        if page.h1 != 1:
            errors.append(f"{name}: {page.h1} h1 elements")
        if not page.lang:
            errors.append(f"{name}: no lang")
        if page.missing_alt:
            errors.append(f"{name}: {page.missing_alt} images without alt text")
        for href in page.links:
            found = resolve(path, href)
            if found is None:
                continue
            target, fragment = found
            if not target.exists():
                errors.append(f"{name}: {href} does not exist")
            elif fragment:
                ids = pages[target].ids if target in pages else parse(target).ids
                if fragment not in ids:
                    errors.append(f"{name}: {href} names no anchor")

    if opts.help_links:
        if urlsplit(opts.help_links).scheme:
            with urllib.request.urlopen(opts.help_links, timeout=30) as reply:
                text = reply.read().decode("utf-8")
        else:
            text = Path(opts.help_links).read_text(encoding="utf-8")
        for line in text.splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            page, _, anchor = line.partition("#")
            target = (DOCS / page).resolve()
            if target not in pages:
                errors.append(f"help link {line}: no page {page}")
            elif anchor and anchor not in pages[target].ids:
                errors.append(f"help link {line}: no anchor {anchor}")

    for error in errors:
        print(error, file=sys.stderr)
    print(f"{len(pages)} pages, {len(errors)} errors")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
