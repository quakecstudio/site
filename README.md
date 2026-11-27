# QuakeC Studio — site

The website of **QuakeC Studio**, an IDE for QuakeC, the scripting language
of id Software's original *Quake* (1996): the landing page, the download page
and the user guide.

Plain HTML, CSS and JavaScript. No build step, no external requests.

```
public/
├── index.html          # landing page
├── download/           # per-platform packages and install commands
├── docs/               # the user guide: one HTML page per chapter, img/ its screenshots
├── 404.html            # served by CloudFront for missing paths
├── favicon.svg
├── apple-touch-icon.png
├── og.jpg              # social share image
├── robots.txt
├── sitemap.xml         # every indexable page
├── llms.txt            # the guide's pages for AI agents (llmstxt.org)
└── assets/
    ├── css/style.css
    ├── css/docs.css    # the guide's layout, keys, callouts and figures
    ├── js/docs.js      # the guide's on-this-page list, anchors, Copy buttons, narrow-screen nav
    ├── js/main.js      # clip playback, visitor counter, drop-down console
    ├── shots/          # stills: <name>-1440.jpg and <name>-2880.jpg
    ├── clips/          # looping clips: <name>.webm, .mp4 and a .jpg poster
    └── fonts/          # self-hosted Silkscreen and VT323 (SIL OFL 1.1)
```

Easter egg: press <kbd>~</kbd> (or tap the `QC_` logo) to open a Quake-style
console. Try `help`, `version`, `impulse 9`.

## A new page

Give it a `<meta name="description">` and a `<link rel="canonical">` to its own
`https://www.quakecstudio.com/` URL, and list it in `sitemap.xml`; a guide
page also goes in `llms.txt`. `scripts/check-docs.py` checks this for the guide.

## A new release

The version appears on the landing page, the download page and in the
console's `version` reply: `rg -l 2026.11.4 public` lists every place to
change. The download page links each release asset by name.

## Screenshots and clips

The landing page's media come from the editor's showcase harness,
`apps/desktop/examples/showcase.rs` in `quakecstudio/editor`, rendered from
LibreQuake at 2x:

```sh
cargo run --release -p quakec-studio --example showcase -- \
  --librequake <dir> --scale 2 --out <dir>
```

It writes each still as a 2880x1800 PNG, and each clip as a folder of
`frame-%04d.png` at 30 fps. `scripts/encode-media.sh` turns them into the
site's files (it needs ImageMagick and ffmpeg):

```sh
scripts/encode-media.sh still <dir>/showcase-code.png showcase-code
scripts/encode-media.sh clip <dir>/reload reload
```

New media from LibreQuake's data needs its row in `ATTRIBUTION.md`.

## Visitor counter

The footer counter calls `/api/visit`, a Lambda function behind the same
CloudFront distribution (see `modules/visit-counter` in the infra repo). A
browser's first visit `POST`s to add one ("You are visitor no. 0000042"),
then remembers that in `localStorage`; later visits `GET` the total. Locally,
or if the API is down, it shows `???????`.

## The user guide

`public/docs/` is QuakeC Studio's user guide, written here as plain HTML (it moved from
the editor repository's `docs/guide/`). Its screenshots in `public/docs/img/` come from the
editor's snapshot harness (`apps/desktop/snapshots/`); copy them over when the app changes.
The app's help buttons open sections of these pages, so a heading's `id` is part of the
contract: `scripts/check-docs.py` checks every page's links, anchors, h1 and alt text, and
every `page#anchor` the app lists in `apps/desktop/help-links.txt`
(`.github/workflows/check-docs.yml` runs it on each PR).

The guide's pages share one nav, wrapped in a `<details>`. `scripts/check-docs.py` fails if a
page's nav differs from `index.html`'s or marks the wrong page with `aria-current`, so a new
page goes into every page's nav. `assets/js/docs.js` adds the on-this-page list, heading
anchors, Copy buttons and the narrow-screen nav; each page reads fully without it.

## Run locally

```sh
python3 -m http.server 8000 --directory public
# open http://localhost:8000
```

## Hosting

The site is served from a private S3 bucket behind CloudFront. The
infrastructure lives in the
[`quakecstudio/infra`](https://github.com/quakecstudio/infra) repo
(`environments/dev` and `environments/prod`).

## Deploy

### From GitHub Actions

`.github/workflows/deploy.yml` runs on every push to `main` and on demand
via *Run workflow*. It always deploys to **dev** first; **prod** follows only
when dev succeeded and you approve it. A manual run from another branch stops
after dev. Each environment's steps live in `deploy-environment.yml`, which
authenticates to AWS with GitHub OIDC, so there are no stored AWS keys. Every
deploy invalidates the whole CloudFront cache.

The `dev` and `prod` GitHub environments, and the variables the
workflow reads (`AWS_REGION`, `AWS_DEPLOY_ROLE_ARN`, `SITE_BUCKET`,
`CLOUDFRONT_DISTRIBUTION_ID`, `SITE_URL`), are managed by Terraform in the
infra repo. prod only deploys from `main`, and each prod deploy
waits for approval.

### By hand

```sh
SITE_BUCKET=... CLOUDFRONT_DISTRIBUTION_ID=... scripts/deploy.sh
```

HTML is uploaded with `max-age=0, must-revalidate`; everything else is
cached for a day. Each deploy invalidates `/*`.

## Licences

Fonts: [Silkscreen](https://github.com/googlefonts/silkscreen) and
[VT323](https://fonts.google.com/specimen/VT323), both under the SIL Open Font
License 1.1 (see `public/assets/fonts/OFL-*.txt`).

QuakeC Studio is an independent fan project and is not affiliated with or
endorsed by id Software, ZeniMax Media or Bethesda.
