# Careers24 - URL reference

Checked 2026-11-01. `robots.txt` allows `/jobs/` and `/jobs/adverts/` for all user agents.

## Search

`GET https://www.careers24.com/jobs/[lc-<location-slug>/]kw-<query-slug>/?page=<n>`

| Part | Meaning |
|------|---------|
| `kw-<query-slug>` | Keywords lowercased, non-alphanumerics to `-` (`kw-product-manager`) |
| `lc-<location-slug>` | Optional province or city (`lc-gauteng`, `lc-western-cape`, `lc-johannesburg`) |
| `page` | 1-indexed page, 10 results each (`/pg2/` is ignored; use the query parameter) |

No posting-age parameter exists. Results live under `<div id="divSearchResults">`, one
`<div class="job-card" data-control="job-card" data-id="<id>">` per result:

- title: `<a href="/jobs/adverts/<id>-<slug>/?jobindex=N" data-control="vacancy-title"><h2>...`
- location, job type and `Posted: 27 Oct 2026`: the `<li>` items in `.job-card-left`
- company: `alt` of the logo inside `<a href="/now-hiring/...">` (absent for many recruiter ads)

The site writes some UTF-8 characters as one numeric entity per byte (`&#xE2;&#x80;&#x93;`);
`repairMojibake` in `helpers.ts` re-decodes them.

## Detail

`GET https://www.careers24.com/jobs/adverts/<id>-<any-slug>/` (the number is what resolves the advert).

- schema.org `JobPosting` JSON-LD: title, hiringOrganization, jobLocation, datePosted, validThrough,
  employmentType. Its `description` is a truncated teaser.
- Full description: `<div class="v-descrip">`.
