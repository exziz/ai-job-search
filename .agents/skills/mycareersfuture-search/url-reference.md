# MyCareersFuture - URL reference

Checked 2026-11-01. `api.mycareersfuture.gov.sg` publishes no robots.txt; the public site's
robots.txt allows `/search` and `/job/`. No authentication.

## Search

`GET https://api.mycareersfuture.gov.sg/v2/jobs?search=<keywords>&limit=<n>&page=<n>`

| Parameter | Meaning |
|-----------|---------|
| `search` | Free-text keywords |
| `limit` | Page size (the CLI uses 20) |
| `page` | **0-indexed** page |

Response: `{ results: [...], total, _links: { next, last, ... } }`. Fields read per result:
`uuid`, `title`, `postedCompany.name`, `hiringCompany.name` (preferred when a recruiter posts on
behalf), `address.isOverseas` / `address.districts[].region`, `metadata.newPostingDate`,
`metadata.expiryDate`, `metadata.jobDetailsUrl`, `salary.minimum` / `maximum` / `type.salaryType`.

## Detail

`GET https://api.mycareersfuture.gov.sg/v2/jobs/<uuid>`

Same record shape as a search result, with `description` (HTML), `employmentTypes[]`,
`positionLevels[]` and `minimumYearsExperience`.
