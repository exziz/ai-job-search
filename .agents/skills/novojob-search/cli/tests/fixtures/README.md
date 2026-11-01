# Fixtures

Trimmed from live Novojob responses fetched on 2026-11-01 with the CLI's own User-Agent:

- `search.html` - `https://www.novojob.com/cote-d-ivoire/offres-d-emploi/product%20manager`, first 4 cards.
- `detail.html` - offer `136876`, reduced to its `<title>` and schema.org `JobPosting` block.

Refresh them when Novojob changes its markup and the live test (`PORTAL_LIVE_TESTS=1 bun test`) fails.
