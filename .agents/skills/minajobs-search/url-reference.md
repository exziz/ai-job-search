# MinaJobs - URL reference

Checked 2026-11-01. `robots.txt` (SimpleJobScript default) disallows only `/_lib`, `/_tpl`,
`/_tools`, `/_config`, `/js`, `/uploads` and `/admin`.

## Search

`GET https://cameroun.minajobs.net/search/<keywords>/`

- Keywords URL-encoded in the path (`/search/product%20manager/`).
- Up to 100 results on one page; there is no pager, so the CLI's `--page` slices 25 at a time.
- `www.minajobs.net/search/...` returns HTTP 500; `www` listing pages redirect to the `cameroun.` host.

Results sit in `<div id="job-listings">` -> `<ul class="listings-block">`. Each result renders twice
(`mobile-listing-content` and `desktop-listing-content`); the CLI reads the desktop block:

- link + id: `<a href="/emplois-stage-recrutement/<id>/<slug>"><div class="listing-title">Title</div>`
- `<span class="opaque">` x3: company, location slug (`douala-region-littoral-cameroun`), "Publiée depuis N" (days)

## Detail

`GET https://cameroun.minajobs.net/emplois-stage-recrutement/<id>/<any-slug>`

- title: `<h4 class="job-detail-headline">`
- `<div class="job-detail-icons ...">`: `Localisation :<slug>`, `Date de publication :DD/MM/YYYY`,
  `Catégorie : ...`, `Salaire : ...`
- company: the LinkedIn share link's `title=<job> at <company>&amp;`
- description: `<div class="detail-font">`
- No JSON-LD.
