// Jobs in Kenya (jobsinkenya.co.ke). A WordPress site whose "job" post type is
// not in the REST API, so search uses WordPress's search RSS feed
// (/?s=<q>&feed=rss2, /page/<n>/ for more): 50 items a page with exact
// publish times. Detail reads the post page's .entry-content. Ids are the
// post slugs.
import {
  CliError,
  clean,
  cleanOrNull,
  decodeHtmlEntities,
  extractElement,
  htmlToText,
  normalizeDate,
  type JobCard,
  type JobDetail,
} from "./helpers.js"
import type { Portal, SearchOpts } from "./types.js"

const BASE = "https://www.jobsinkenya.co.ke"
/** The site's own placeholder author name on most posts - not an employer. */
const PLACEHOLDER_AUTHORS = new Set(["steve jobs", "admin", "jobs in kenya"])

function cdata(s: string | undefined): string {
  return (s ?? "").replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1")
}

/**
 * Employer name: posts usually open with the company in bold
 * (<p><strong>Co-operative Bank</strong></p>). Falls back to the feed author
 * when it is not the site's placeholder.
 */
export function companyFrom(contentHtml: string, title: string, author: string | null): string | null {
  const first = contentHtml.match(/^\s*<p>\s*<strong>([\s\S]*?)<\/strong>\s*<\/p>/)?.[1]
  const bold = clean(first)
  if (bold && bold.length <= 60 && !bold.includes(":") && bold.toLowerCase() !== title.toLowerCase()) return bold
  const a = clean(author)
  return a && !PLACEHOLDER_AUTHORS.has(a.toLowerCase()) ? a : null
}

function slugFromLink(link: string): string | null {
  return link.match(/\/job\/([a-z0-9-]+)\/?$/i)?.[1] ?? null
}

export const portal: Portal = {
  cliName: "jobsinkenya-cli",
  summary: "search jobs on Jobs in Kenya (jobsinkenya.co.ke)",
  flags: {},
  jobageServerSide: false,
  examples: [
    'bun run src/cli.ts search -q "product manager" --format table',
    'bun run src/cli.ts search -q "head of" --jobage 14 --format table',
    "bun run src/cli.ts detail head-of-product-development-and-diversification-ktda-holdings --format plain",
  ],

  searchRequest(opts: SearchOpts) {
    const params = new URLSearchParams({ s: opts.query, feed: "rss2" })
    const path = opts.page > 1 ? `/page/${opts.page}/` : "/"
    return { url: `${BASE}${path}?${params.toString()}`, init: { accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.5" } }
  },

  parseSearch(body: string): JobCard[] {
    if (!/<rss\b/.test(body)) throw new CliError("Jobs in Kenya did not return an RSS feed - the site may have changed", "PARSE_FAILED")
    const cards: JobCard[] = []
    for (const item of body.split(/<item>/).slice(1)) {
      try {
        const link = clean(item.match(/<link>([\s\S]*?)<\/link>/)?.[1])
        const id = slugFromLink(link)
        // Only job posts: the feed can include blog posts and pages.
        if (!id || !link.startsWith(`${BASE}/job/`)) continue
        const title = clean(cdata(item.match(/<title>([\s\S]*?)<\/title>/)?.[1]))
        if (!title) continue
        const pub = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]
        const author = cdata(item.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/)?.[1])
        const desc = cdata(item.match(/<description>([\s\S]*?)<\/description>/)?.[1])
        // Drop WordPress's "The post ... first appeared on ..." footer.
        const teaser = desc.replace(/<p>The post <a[\s\S]*$/, "")
        const parsed = pub ? Date.parse(pub) : NaN
        cards.push({
          id,
          title,
          company: companyFrom(teaser, title, author),
          location: null,
          date: Number.isNaN(parsed) ? null : new Date(parsed).toISOString(),
          url: link,
          snippet: cleanOrNull(teaser)?.slice(0, 240) ?? null,
        })
      } catch {
        // Skip a malformed item.
      }
    }
    return cards
  },

  normalizeId(input: string): string | null {
    const s = input.trim()
    if (/^https?:\/\//i.test(s) || /^www\./i.test(s)) {
      let u: URL
      try {
        u = new URL(/^https?:/i.test(s) ? s : `https://${s}`)
      } catch {
        return null
      }
      if (!/(^|\.)jobsinkenya\.co\.ke$/i.test(u.hostname)) return null
      return slugFromLink(u.pathname)
    }
    return /^[a-z0-9]+(?:-[a-z0-9]+)+$/i.test(s) ? s.toLowerCase() : null
  },

  detailRequest(id: string) {
    return { url: `${BASE}/job/${id}/` }
  },

  parseDetail(body: string, id: string): JobDetail {
    // WPJobBoard markup: a wpjb-info table of labelled rows, then .wpjb-job-text
    // with the posting. Related-jobs and ad blocks follow it and are left out.
    const textHtml = extractElement(body, "div", 'class="wpjb-job-text"')
    if (textHtml === null) throw new CliError("Jobs in Kenya job text not found - the post may have been removed or the markup changed", "PARSE_FAILED")
    const row = (key: string): string | null => {
      const cells = extractElement(body, "tr", `wpjb-row-meta-${key}"`)
      return cells ? cleanOrNull(cells.replace(/<td class="wpjb-info-label[^"]*">[\s\S]*?<\/td>/, "")) : null
    }
    const title =
      cleanOrNull(body.match(/<h1 class="entry-title"[^>]*>([\s\S]*?)<\/h1>/)?.[1]) ??
      cleanOrNull(decodeHtmlEntities(body.match(/<meta property="og:title" content="([^"]*)"/)?.[1] ?? "").replace(/\s*[-|–]\s*Jobs in Kenya.*$/i, "")) ??
      "(untitled)"
    const company = cleanOrNull(body.match(/wpjb-company-name">[\s\S]*?<span class="fn">([\s\S]*?)<\/span>/)?.[1])
    const datePosted = body.match(/<meta itemprop="datePosted" content="([^"]+)"/)?.[1]
    const published = body.match(/<meta property="article:published_time" content="([^"]+)"/)?.[1]
    return {
      id,
      title,
      company: company ?? companyFrom(textHtml, title, null),
      location: row("_location"),
      date: published ?? datePosted ?? normalizeDate(row("job_created_at")),
      url: `${BASE}/job/${id}/`,
      description: htmlToText(textHtml),
      employmentType: row("_tag_type")?.toLowerCase() ?? null,
      deadline: normalizeDate(row("job_expires_at")),
      applyUrl: null,
    }
  },
}
