# Fixtures

Trimmed from live Jobs in Kenya responses fetched on 2026-11-01 with the CLI's own User-Agent:

- `search.xml` - `https://www.jobsinkenya.co.ke/?s=manager&feed=rss2`, channel header plus the first 4 items.
- `detail.html` - `/job/head-of-product-development-and-diversification-ktda-holdings/`, reduced to the
  title, the `article:published_time` meta, the `wpjb-info` table and the `wpjb-job-text` block (ads removed).

Refresh them when the site changes and the live test (`PORTAL_LIVE_TESTS=1 bun test`) fails.
