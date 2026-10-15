# QuakeC Studio — site

Static "coming soon" page for **QuakeC Studio**, a code editor for QuakeC,
the scripting language of id Software's original *Quake* (1996).

Plain HTML, CSS and JavaScript. No build step, no external requests.

```
public/
├── index.html          # landing page
├── 404.html            # served by CloudFront for missing paths
├── favicon.svg
├── robots.txt
└── assets/
    ├── css/style.css
    ├── js/main.js      # progress plaque, visit counter, drop-down console
    └── fonts/          # self-hosted Silkscreen + VT323 (SIL OFL 1.1)
```

Easter egg: press <kbd>~</kbd> (or tap the `QC_` logo) to open a Quake-style
console. Try `help`, `map e1m1`, `impulse 9`.

## Run locally

```sh
python3 -m http.server 8000 --directory public
# open http://localhost:8000
```

## Hosting

The site is served from a private S3 bucket behind CloudFront. The
infrastructure lives in the
[`quakecstudio/infra`](https://github.com/quakecstudio/infra) repo
(`environments/staging` and `environments/production`).

## Deploy

### From GitHub Actions

`.github/workflows/deploy.yml` deploys to **production** on every push to
`main`, and to either environment on demand via *Run workflow*. It
authenticates to AWS with GitHub OIDC, so there are no stored AWS keys.

Create two GitHub environments, `staging` and `production`, each with
these **variables** (values come from `terraform output` in the infra repo):

| Variable                     | Terraform output        |
| ---------------------------- | ----------------------- |
| `AWS_REGION`                 | `aws_region`            |
| `AWS_DEPLOY_ROLE_ARN`        | `deploy_role_arn`       |
| `SITE_BUCKET`                | `bucket_name`           |
| `CLOUDFRONT_DISTRIBUTION_ID` | `distribution_id`       |
| `SITE_URL` (optional)        | `site_url`              |

### By hand

```sh
SITE_BUCKET=... CLOUDFRONT_DISTRIBUTION_ID=... scripts/deploy.sh
```

HTML is uploaded with `max-age=0, must-revalidate`; everything else is
cached for a day. Each deploy invalidates `/*`.

## Licences

Fonts: [Silkscreen](https://github.com/googlefonts/silkscreen) and
[VT323](https://fonts.google.com/specimen/VT323), both under the SIL Open
Font License 1.1 (see `public/assets/fonts/OFL-*.txt`).

QuakeC Studio is an independent fan project and is not affiliated with or
endorsed by id Software, ZeniMax Media or Bethesda.
