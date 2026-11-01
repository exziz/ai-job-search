// Job in Rwanda (jobinrwanda.com). A Drupal site: the title search lives at
// /jobs/search-result?filter_titles_field=<keywords> and renders one
// <article class="node--type-job ..."> teaser per result. Detail pages have no
// JSON-LD; the description is the field-job-full-description block. Ids are
// the URL slugs ("graphic-designers-0").
import { absUrl, clean, cleanOrNull, CliError, extractElement, htmlToText, normalizeDate, type JobCard, type JobDetail } from "./helpers.js"
import type { Portal, SearchOpts } from "./types.js"

const BASE = "https://www.jobinrwanda.com"

/** Drupal's theme-debug comments are noise around every field; drop them before parsing. */
function stripComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, "")
}

export const portal: Portal = {
  cliName: "jobinrwanda-cli",
  summary: "search jobs on Job in Rwanda (jobinrwanda.com)",
  flags: {},
  jobageServerSide: false,
  examples: [
    'bun run src/cli.ts search -q "manager" --format table',
    'bun run src/cli.ts search -q "product" --jobage 14 --format table',
    "bun run src/cli.ts detail graphic-designers-0 --format plain",
  ],

  searchRequest(opts: SearchOpts) {
    const params = new URLSearchParams({ filter_titles_field: opts.query })
    // Drupal pagers are 0-indexed.
    if (opts.page > 1) params.set("page", String(opts.page - 1))
    return { url: `${BASE}/jobs/search-result?${params.toString()}` }
  },

  parseSearch(body: string): JobCard[] {
    const html = stripComments(body)
    if (!/view-id-|views-element-container/.test(html)) {
      throw new CliError("Job in Rwanda results view not found in the page - the markup may have changed", "PARSE_FAILED")
    }
    const cards: JobCard[] = []
    for (const chunk of html.split(/<article\b/).slice(1)) {
      try {
        if (!/node--type-job/.test(chunk.slice(0, 300))) continue
        const link = chunk.match(/<a href="(\/job\/[^"?#]+)"><h5 class="card-title">([\s\S]*?)<\/h5>/)
        if (!link) continue
        const title = clean(link[2])
        if (!title) continue
        const text = chunk.match(/<p class="card-text">([\s\S]*?)<\/p>/)?.[1] ?? ""
        const company = text.match(/<a href="\/employer\/[^"]*">([\s\S]*?)<\/a>/)?.[1]
        const location = text.match(/fa-map-marker-alt"><\/i>\s*([^|<]+)/)?.[1]
        const published = text.match(/Published on\s*(\d{2}-\d{2}-\d{4})/)?.[1]
        const deadline = text.match(/<time datetime="([^"]+)"/)?.[1]
        const level = clean(text.split(/<br\s*\/?>/)[1] ?? "")
        cards.push({
          id: link[1].replace(/^\/job\//, ""),
          title,
          company: cleanOrNull(company),
          location: location ? clean(location).replace(/^./, (c) => c.toUpperCase()) || null : null,
          date: normalizeDate(published),
          url: absUrl(link[1], BASE),
          deadline: deadline ? deadline.slice(0, 10) : null,
          snippet: level || null,
        })
      } catch {
        // Skip a malformed teaser.
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
      if (!/(^|\.)jobinrwanda\.com$/i.test(u.hostname)) return null
      return u.pathname.match(/^\/job\/([a-z0-9-]+)\/?$/i)?.[1] ?? null
    }
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(s) ? s.toLowerCase() : null
  },

  detailRequest(id: string) {
    return { url: `${BASE}/job/${id}` }
  },

  parseDetail(body: string, id: string): JobDetail {
    const html = stripComments(body)
    const titleBlock = extractElement(html, "div", 'id="block-jix-core-theme-page-title"')
    const employerBlock = extractElement(html, "div", 'id="block-jobemployerblock"')
    const descHtml = extractElement(html, "div", "field--name-field-job-full-description")
    const description = htmlToText(descHtml)
    const deadlineText = description?.match(/(?:Application )?deadline:?\s*([0-9]{1,2}\s+[A-Za-z]+\s+\d{4})/i)?.[1]
    const employment = description?.match(/Employment type:\s*([^\n|]+?)(?:\s{2,}|\n|$)/i)?.[1]
    return {
      id,
      title: cleanOrNull(titleBlock) ?? "(untitled)",
      company: cleanOrNull(employerBlock?.match(/<h5 class="card-title">([\s\S]*?)<\/h5>/)?.[1]),
      location: cleanOrNull(description?.match(/Location:\s*([^\n]+?)(?:\s{2,}|\n|Number of|$)/i)?.[1]),
      date: null,
      url: `${BASE}/job/${id}`,
      description,
      employmentType: employment ? employment.trim().toLowerCase() : null,
      deadline: normalizeDate(deadlineText),
      applyUrl: null,
    }
  },
}
