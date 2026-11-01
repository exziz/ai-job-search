# PNet - URL reference

Checked 2026-11-01. `robots.txt` allows `/jobs/` and listing pages for all user agents.

## Search

`GET https://www.pnet.co.za/jobs/<query-slug>[/in-<location-slug>]?page=<n>&ag=<age>`

| Part | Meaning |
|------|---------|
| `<query-slug>` | Keywords lowercased, non-alphanumerics to `-` (`senior-product-manager`) |
| `/in-<location-slug>` | Optional city/area (`in-johannesburg`, `in-cape-town`, `in-sandton`) |
| `page` | 1-indexed page, about 25 results each |
| `ag` | `age_1` (new) or `age_7` (last week); PNet has no other age facets |

The HTML embeds the result list as JSON:

```
<script>window.__PRELOADED_STATE__["app-unifiedResultlist"] = {...};</script>
```

Fields read from `searchResults.items[]`: `title`, `url`, `companyName`, `location`, `datePosted`,
`publishToDate`, `textSnippet`. The CLI's id is the slug inside `url`:
`/jobs--<slug>--<number>-inline.html` -> `<slug>--<number>`.

## Detail

`GET https://www.pnet.co.za/jobs--<slug>--<number>-inline.html`

The bare `/jobs--<number>-inline.html` form returns 403 "Access denied", so the slug is required.
The page carries a schema.org `JobPosting` in `<script type="application/ld+json">`:
`title`, `hiringOrganization.name`, `jobLocation[].address`, `datePosted`, `validThrough`,
`employmentType`, `description` (HTML).
