# Fixtures

Trimmed from live MyCareersFuture API responses fetched on 2026-11-01 with the CLI's own User-Agent:

- `search.json` - `GET https://api.mycareersfuture.gov.sg/v2/jobs?search=product%20manager`, first 4
  results, only the fields the parser reads.
- `detail.json` - `GET .../v2/jobs/2db3ef16e449b631779c2abe54c28752`, same fields, description cut to 1500 characters.

Refresh them when the API changes and the live test (`PORTAL_LIVE_TESTS=1 bun test`) fails.
