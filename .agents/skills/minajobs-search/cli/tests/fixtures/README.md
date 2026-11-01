# Fixtures

Trimmed from live MinaJobs responses fetched on 2026-11-01 with the CLI's own User-Agent:

- `search.html` - `https://cameroun.minajobs.net/search/manager/`, first 4 result `<li>` blocks.
- `detail.html` - offer `45570`, reduced to the headline, the job-detail-icons block, the LinkedIn
  share link (it carries the company name) and the `detail-font` description.

Refresh them when MinaJobs changes its markup and the live test (`PORTAL_LIVE_TESTS=1 bun test`) fails.
