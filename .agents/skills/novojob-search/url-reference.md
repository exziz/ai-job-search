# Novojob - URL reference

Checked 2026-11-01. `robots.txt` (Joomla default) disallows only system folders such as
`/administrator/` and `/components/`; the job paths are allowed.

## Search

`GET https://www.novojob.com/<country>/offres-d-emploi/<keywords>?start=<offset>`

| Part | Meaning |
|------|---------|
| `<country>` | `cote-d-ivoire` or `senegal` (other sections exist but were empty) |
| `<keywords>` | URL-encoded keywords (`product%20manager`); `?q=` redirects to this form |
| `start` | Result offset, 40 per page (`page=` is ignored) |

Results sit in `<div ... data-search-result>`, one `<li class="separator-bot">` per card. The top
of each card is a commented-out share menu, removed before parsing. Per card:

- link + id: `<a title="..." href=".../offre-d-emploi/<country>/<id>-<slug>"><h2 class="ellipsis row-fluid">Title</h2>`
- company: `<div class="contact"><h6 ...><span>Company</span>`
- location: after `<i class="fa fa-map-marker icon-left"></i>`
- date: after `<i class="fa fa-clock-o icon-left"></i>`, as "30 Septembre" (no year)
- experience band: after `<i class="fa fa-bookmark icon-left"></i>`

The page footer carries an off-screen spam block (`position:absolute; left:-1423117px`); chunked
per-card parsing keeps it out of results.

## Detail

`GET https://www.novojob.com/cote-d-ivoire/offres-d-emploi/offre-d-emploi/cote-d-ivoire/<id>`

Redirects to the company-scoped canonical URL. The page carries a schema.org `JobPosting`
(`title`, `hiringOrganization`, `jobLocation`, `datePosted`, `validThrough`, `description`).
