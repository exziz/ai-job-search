# Job in Rwanda - URL reference

Checked 2026-11-01. `robots.txt` allows `/jobs/` and `/job/` for all user agents. The site is
Drupal with theme-debug HTML comments around every field; the CLI strips comments first.

## Search

`GET https://www.jobinrwanda.com/jobs/search-result?filter_titles_field=<keywords>&page=<n>`

| Parameter | Meaning |
|-----------|---------|
| `filter_titles_field` | Title keywords (all must match) |
| `page` | **0-indexed** Drupal pager |

`/jobs/all?search=...` ignores the search term; use `search-result`.

One `<article ... class="node node--type-job node--view-mode-teaser ...">` per result:

- title + link: `<a href="/job/<slug>"><h5 class="card-title">...</h5></a>`
- `<p class="card-text">`: `<a href="/employer/...">Company</a> | <i class="fas fa-map-marker-alt"></i> Kigali | Published on DD-MM-YYYY | Deadline <time datetime="...">`, then `<br/>` and the seniority band.

## Detail

`GET https://www.jobinrwanda.com/job/<slug>`

- title: `<div id="block-jix-core-theme-page-title">`
- employer: `<div id="block-jobemployerblock">` -> `<h5 class="card-title">`
- description: `<div class="... field--name-field-job-full-description ...">`
- No JSON-LD and no posting date on the page.
