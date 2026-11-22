#!/usr/bin/env python3
"""Checks the user guide under public/docs/.

Every page has one h1 and a lang; every image has alt text; every local link and anchor
resolves; every page's .docs__nav lists the same links in the same order, with
aria-current="page" on its own link alone; every page has a meta description and a canonical
link to its own URL, and is listed in sitemap.xml and llms.txt. With --help-links FILE (or a URL), every `page#anchor` line of that file, the
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
SITE = "https://www.quakecstudio.com/"


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.links = []
        self.h1 = 0
        self.lang = None
        self.missing_alt = 0
        self.in_nav = False
        self.nav = []
        self.description = None
        self.canonical = None

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
        if tag == "meta" and attrs.get("name") == "description":
            self.description = attrs.get("content")
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonical = attrs.get("href")
            return
        if tag in ("a", "link") and "href" in attrs:
            self.links.append(attrs["href"])
        if tag == "nav" and "docs__nav" in (attrs.get("class") or "").split():
            self.in_nav = True
        if tag == "a" and self.in_nav:
            self.nav.append((attrs.get("href", ""), attrs.get("aria-current")))

    def handle_endtag(self, tag):
        if tag == "nav":
            self.in_nav = False


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


def check_navs(pages):
    """Each page's nav must list index.html's links in its order, marking its own page."""
    index = DOCS.resolve() / "index.html"
    if index not in pages:
        return ["docs/index.html: missing"]
    expected = [href for href, _ in pages[index].nav]
    if not expected:
        return ["docs/index.html: no .docs__nav links"]
    errors = []
    for path, page in pages.items():
        name = path.relative_to(ROOT)
        hrefs = [href for href, _ in page.nav]
        if hrefs != expected:
            errors.append(
                f"{name}: .docs__nav lists {hrefs}, not index.html's {expected}"
            )
        marked = [(href, mark) for href, mark in page.nav if mark is not None]
        own = [
            (href, "page") for href, _ in page.nav if resolve(path, href) == (path, "")
        ]
        if marked != own:
            errors.append(
                f"{name}: .docs__nav marks {marked} with aria-current, not {own}"
            )
    return errors


def page_url(path):
    """The address a docs page is served at: its folder for index.html."""
    return SITE + path.relative_to(ROOT).as_posix().removesuffix("index.html")


def check_discovery(pages):
    """Each page needs a description and its own canonical URL, and a line in the indexes."""
    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    llms = (ROOT / "llms.txt").read_text(encoding="utf-8")
    errors = []
    for path, page in pages.items():
        name = path.relative_to(ROOT)
        url = page_url(path)
        if not page.description:
            errors.append(f"{name}: no meta description")
        if page.canonical != url:
            errors.append(f"{name}: canonical is {page.canonical}, not {url}")
        if f"<loc>{url}</loc>" not in sitemap:
            errors.append(f"{name}: not in sitemap.xml")
        if f"({url})" not in llms:
            errors.append(f"{name}: not in llms.txt")
    return errors


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

    errors += check_navs(pages)
    errors += check_discovery(pages)

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
