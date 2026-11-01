# Fixtures

Trimmed from live Careers24 responses fetched on 2026-11-01 with the CLI's own User-Agent:

- `search.html` - `https://www.careers24.com/jobs/kw-product-manager/`, reduced to the first 4 job cards.
- `detail.html` - advert `2395880`, reduced to its `<title>`, canonical link, schema.org `JobPosting`
  block and the `v-descrip` description element.

Refresh them when Careers24 changes its markup and the live test (`PORTAL_LIVE_TESTS=1 bun test`) fails.
