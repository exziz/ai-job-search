# Fixtures

Trimmed from live PNet responses fetched on 2026-11-01 with the CLI's own User-Agent:

- `search.html` - `https://www.pnet.co.za/jobs/product-manager`, reduced to the
  `app-unifiedResultlist` state with the first 4 items and only the fields the parser reads.
- `detail.html` - the listing page for `Product-Manager-Cape-Town-Takealot-Group-Pty-Ltd--4298284`,
  reduced to its `<title>` and schema.org `JobPosting` block.

Refresh them when PNet changes its markup and the live test (`PORTAL_LIVE_TESTS=1 bun test`) fails.
