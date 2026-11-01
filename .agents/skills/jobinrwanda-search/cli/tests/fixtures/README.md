# Fixtures

Trimmed from live Job in Rwanda responses fetched on 2026-11-01 with the CLI's own User-Agent,
with Drupal's theme-debug comments removed:

- `search.html` - `https://www.jobinrwanda.com/jobs/search-result?filter_titles_field=manager`, first 4 teasers.
- `detail.html` - `https://www.jobinrwanda.com/job/graphic-designers-0`, reduced to the page-title,
  employer and full-description blocks (the employer-rating form and its tokens removed).

Refresh them when the site changes its markup and the live test (`PORTAL_LIVE_TESTS=1 bun test`) fails.
