# Jobs in Kenya - URL reference

Checked 2026-11-01. `robots.txt` has no `Disallow` rules for `User-agent: *`. The site is
WordPress with the WPJobBoard plugin; the `job` post type is **not** exposed in `/wp-json/`.

## Search

`GET https://www.jobsinkenya.co.ke/[page/<n>/]?s=<keywords>&feed=rss2`

WordPress's search feed: 50 `<item>`s a page, newest first. Fields read per item:
`<title>`, `<link>` (`/job/<slug>/` - other links are skipped), `<pubDate>`, `<dc:creator>`
(often the placeholder "Steve Jobs"; ignored then), `<description>` (CDATA teaser; its first
`<p><strong>...</strong></p>` is usually the employer). The trailing "The post ... first
appeared on ..." paragraph is dropped.

## Detail

`GET https://www.jobsinkenya.co.ke/job/<slug>/`

- title: `<h1 class="entry-title">`
- `<table class="wpjb-info">`: company in `.wpjb-company-name .fn`, then rows
  `tr.wpjb-row-meta-job_created_at` (Published), `job_expires_at` (Expires), `_location`,
  `_tag_category`, `_tag_type` (job type)
- posting text: `<div class="wpjb-job-text">`; the related-jobs list and ads after it are excluded
- exact publish time: `<meta property="article:published_time">`
