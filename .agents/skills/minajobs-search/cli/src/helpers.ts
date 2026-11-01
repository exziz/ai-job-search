// Shared portal-CLI core: fetching with backoff, output hygiene, HTML-to-text,
// schema.org JobPosting extraction, and the stderr error writer. This file is
// identical across the portal CLIs in this fork; the portal-specific URLs and
// parsers live in ./portal.ts. Zero runtime dependencies.

export interface JobCard {
  id: string
  title: string
  company: string | null
  location: string | null
  /** Posting date: ISO 8601 (YYYY-MM-DD or a full timestamp), or null when the portal gives none. */
  date: string | null
  url: string
  /** Application deadline, ISO 8601 when known. */
  deadline?: string | null
  /** Short teaser text when the search page carries one. */
  snippet?: string | null
  /** Salary as the portal states it, e.g. "SGD 10000-13000 Monthly". */
  salary?: string | null
}

export interface JobDetail extends JobCard {
  description: string | null
  employmentType: string | null
  deadline: string | null
  applyUrl: string | null
}

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

/** An error carrying a stable code for the stderr JSON. */
export class CliError extends Error {
  constructor(message: string, public code: string) {
    super(message)
  }
}

export interface FetchOpts {
  method?: "GET" | "POST"
  headers?: Record<string, string>
  body?: string
  accept?: string
  /** Request timeout in ms. */
  timeout?: number
}

/** The honest User-Agent every request carries: names the tool, never impersonates a browser. */
export function userAgent(cliName: string): string {
  return `Mozilla/5.0 (compatible; ${cliName}/1.0)`
}

/**
 * Fetch text with exponential backoff and jitter on 429/5xx (max 6 retries).
 * Returns "" on a 404. Throws on other non-2xx statuses.
 */
export async function httpFetch(cliName: string, url: string, opts: FetchOpts = {}): Promise<string> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      method: opts.method ?? "GET",
      headers: {
        "User-Agent": userAgent(cliName),
        Accept: opts.accept ?? "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "en,fr;q=0.9",
        ...(opts.headers ?? {}),
      },
      body: opts.body,
      redirect: "follow",
      signal: AbortSignal.timeout(opts.timeout ?? 20000),
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new CliError(`Request failed: ${response.status} ${response.statusText}`, "HTTP_ERROR")
      }
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return ""
    if (response.status === 403) {
      throw new CliError(
        "Request refused (403): the portal's bot protection blocked this request. Do not retry in a loop; try again later.",
        "BLOCKED",
      )
    }
    if (!response.ok) {
      throw new CliError(`Request failed: ${response.status} ${response.statusText}`, "HTTP_ERROR")
    }
    return response.text()
  }
  throw new CliError("Request failed after max retries", "HTTP_ERROR")
}

function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘",
  rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…", bull: "•",
  middot: "·", eacute: "é", egrave: "è", ecirc: "ê", agrave: "à", acirc: "â", ccedil: "ç",
  ocirc: "ô", ucirc: "û", ugrave: "ù", icirc: "î", iuml: "ï", euml: "ë", Eacute: "É", Egrave: "È",
  Agrave: "À", Ccedil: "Ç", laquo: "«", raquo: "»", euro: "€", deg: "°", copy: "©", reg: "®", trade: "™",
}

const UTF8 = new TextDecoder("utf-8", { fatal: true })

/**
 * Re-decode UTF-8 that a portal emitted byte by byte as Latin-1 characters
 * (e.g. "&#xE2;&#x80;&#x93;" for an en dash, which decodes to "â\u0080\u0093").
 * Only runs that form valid multi-byte UTF-8 are replaced, so genuine
 * accented Latin-1 text ("café") is left alone.
 */
export function repairMojibake(text: string): string {
  return text.replace(/[Â-ô][\u0080-¿]{1,3}/g, (run) => {
    try {
      return UTF8.decode(Uint8Array.from(run, (ch) => ch.charCodeAt(0)))
    } catch {
      return run
    }
  })
}

export function decodeHtmlEntities(text: string): string {
  return repairMojibake(
    text
      .replace(/&#(\d+);/g, (_, dec) => numericEntity(parseInt(dec, 10)))
      .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => numericEntity(parseInt(hex, 16)))
      .replace(/&([a-zA-Z]+);/g, (m, name) => NAMED_ENTITIES[name] ?? m),
  )
}

/**
 * Inner HTML of the first element whose opening tag matches `openTag` (a
 * regex source for the attributes, e.g. `class="v-descrip"`), counting nested
 * elements of the same tag name. Null when not found or unclosed.
 */
export function extractElement(html: string, tag: string, attrs: string): string | null {
  const open = new RegExp(`<${tag}\\b[^>]*${attrs}[^>]*>`, "i").exec(html)
  if (!open) return null
  const same = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi")
  same.lastIndex = open.index + open[0].length
  let depth = 1
  let m: RegExpExecArray | null
  while ((m = same.exec(html)) !== null) {
    if (m[1]) depth--
    else if (!m[0].endsWith("/>")) depth++
    if (depth === 0) return html.slice(open.index + open[0].length, m.index)
  }
  return null
}

/**
 * Characters a reader of the posting never sees but a model reading this
 * output does: C0/C1 controls other than tab, newline and carriage return, the
 * soft hyphen, bidi marks/embeddings/overrides/isolates, zero-width characters
 * and invisible operators, the BOM, variation selectors, and Unicode tag
 * characters (U+E0000-E007F), which can spell out a whole hidden instruction.
 */
const INVISIBLE_CHARS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F­؜᠎​-‏‪-‮⁠-⁯︀-️﻿\u{E0000}-\u{E007F}\u{E0100}-\u{E01EF}]/gu

/** Strip INVISIBLE_CHARS from every string in a result, recursively: the CLI's output boundary. */
export function stripInvisible<T>(value: T): T {
  if (typeof value === "string") return value.replace(INVISIBLE_CHARS, "") as T
  if (Array.isArray(value)) return value.map(stripInvisible) as T
  if (value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, stripInvisible(v)])) as T
  }
  return value
}

const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"])

/** Whether an opening tag's attributes keep it from rendering: `hidden`, or an inline style that hides it. */
function isHiddenTag(attrs: string): boolean {
  for (const m of attrs.matchAll(/([^\s"'=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    const name = m[1].toLowerCase()
    const value = m[2] ?? m[3] ?? m[4] ?? ""
    if (name === "hidden") return true
    if (name === "style" && /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden|mso-hide\s*:\s*all)\b/i.test(value)) {
      return true
    }
  }
  return false
}

/**
 * Drop markup a browser never renders - comments, <script>/<style>/<template>
 * blocks, and elements marked hidden - before tags are stripped. A plain tag
 * strip keeps their text, which hands the model words the posting's reader
 * never saw. CSS-only tricks (off-screen, zero font size) need a renderer and
 * are not caught here; chunked per-result parsing keeps page chrome out.
 */
export function visibleHtml(html: string): string {
  const src = html
    .replace(/<!--[\s\S]*?(?:-->|$)/g, "")
    .replace(/<(script|style|template|noscript)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, "")
  const open = /<([a-zA-Z][a-zA-Z0-9-]*)(\s[^>]*)?>/g
  const kept: string[] = []
  let from = 0
  let m: RegExpExecArray | null
  while ((m = open.exec(src)) !== null) {
    if (!m[2] || !isHiddenTag(m[2])) continue
    const tag = m[1].toLowerCase()
    let end = open.lastIndex
    if (!VOID_TAGS.has(tag) && !m[0].endsWith("/>")) {
      // Skip to the matching close tag; an unclosed hidden element runs to the
      // end (failing closed drops visible text, failing open would leak).
      const same = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi")
      same.lastIndex = end
      end = src.length
      let depth = 1
      let s: RegExpExecArray | null
      while ((s = same.exec(src)) !== null) {
        if (s[1]) depth--
        else if (!s[0].endsWith("/>")) depth++
        if (depth === 0) {
          end = same.lastIndex
          break
        }
      }
    }
    kept.push(src.slice(from, m.index))
    from = end
    open.lastIndex = end
  }
  kept.push(src.slice(from))
  return kept.join("")
}

/** Visible text of an HTML fragment on one line: hidden markup dropped, tags stripped, entities decoded. */
export function clean(html: string | null | undefined): string {
  if (!html) return ""
  return decodeHtmlEntities(visibleHtml(html).replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim()
}

/** `clean`, but null for an empty result. */
export function cleanOrNull(html: string | null | undefined): string | null {
  return clean(html) || null
}

/** Visible text of an HTML description, keeping paragraph and line breaks. */
export function htmlToText(html: string | null | undefined): string | null {
  if (!html) return null
  const withBreaks = visibleHtml(html)
    .replace(/\s+/g, " ")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*li\b[^>]*>/gi, "\n- ")
    .replace(/<\/(p|ul|ol|div|h\d|tr|section)>/gi, "\n")
  const text = withBreaks
    .split("\n")
    .map((line) => decodeHtmlEntities(line.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim())
    .filter((line) => line !== "-")
    // Collapse runs of blank lines, then keep bullet lists tight.
    .filter((line, i, all) => line !== "" || (i > 0 && all[i - 1] !== ""))
    .filter((line, i, all) => !(line === "" && all[i - 1]?.startsWith("- ") && all[i + 1]?.startsWith("- ")))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  return text || null
}

/** Absolute URL on `base` for a possibly relative href, entities decoded. */
export function absUrl(href: string, base: string): string {
  try {
    return new URL(decodeHtmlEntities(href.trim()), base).toString()
  } catch {
    return href
  }
}

/** Every top-level JSON-LD object in a page (arrays and @graph flattened). Bad blocks are skipped. */
export function jsonLdObjects(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    let data: unknown
    try {
      data = JSON.parse(m[1].trim())
    } catch {
      // Some portals emit raw control characters inside JSON strings.
      try {
        data = JSON.parse(m[1].trim().replace(/[\u0000-\u001F]+/g, " "))
      } catch {
        continue
      }
    }
    const stack = Array.isArray(data) ? [...data] : [data]
    while (stack.length) {
      const item = stack.shift()
      if (!item || typeof item !== "object") continue
      const obj = item as Record<string, unknown>
      if (Array.isArray(obj["@graph"])) stack.push(...(obj["@graph"] as unknown[]))
      out.push(obj)
    }
  }
  return out
}

function asText(v: unknown): string | null {
  if (v === null || v === undefined) return null
  if (typeof v === "string") return v
  if (typeof v === "number") return String(v)
  if (Array.isArray(v)) return v.map(asText).filter(Boolean).join(", ") || null
  if (typeof v === "object") {
    const o = v as Record<string, unknown>
    return asText(o.name ?? o["@value"] ?? null)
  }
  return null
}

function ldLocation(v: unknown): string | null {
  const list = Array.isArray(v) ? v : [v]
  const parts = new Set<string>()
  for (const place of list) {
    if (!place || typeof place !== "object") continue
    const p = place as Record<string, unknown>
    const addr = (p.address ?? p) as Record<string, unknown> | string
    if (typeof addr === "string") {
      parts.add(addr)
      continue
    }
    const line = [addr.addressLocality, addr.addressRegion, asText(addr.addressCountry)]
      .map((x) => (typeof x === "string" ? x.trim() : asText(x)))
      .filter((x): x is string => !!x)
    const uniq = line.filter((x, i) => line.indexOf(x) === i)
    if (uniq.length) parts.add(uniq.join(", "))
  }
  return parts.size ? [...parts].join(" / ") : null
}

/** The page's schema.org JobPosting, mapped to detail fields. Null when the page carries none. */
export function jobPostingFromLd(html: string): Partial<JobDetail> & { descriptionHtml?: string | null } | null {
  const posting = jsonLdObjects(html).find((o) => {
    const t = o["@type"]
    return t === "JobPosting" || (Array.isArray(t) && t.includes("JobPosting"))
  })
  if (!posting) return null
  const descHtml = typeof posting.description === "string" ? posting.description : null
  // Some portals entity-encode the HTML inside JSON-LD; decode once so tags parse.
  const descSrc = descHtml && /&lt;\/?[a-z]/i.test(descHtml) ? decodeHtmlEntities(descHtml) : descHtml
  const employment = asText(posting.employmentType)
  const remote = posting.jobLocationType === "TELECOMMUTE" ? "Remote" : null
  return {
    title: cleanOrNull(asText(posting.title)) ?? undefined,
    company: cleanOrNull(asText(posting.hiringOrganization)),
    location: ldLocation(posting.jobLocation) ?? remote,
    date: normalizeDate(asText(posting.datePosted)),
    deadline: normalizeDate(asText(posting.validThrough)),
    employmentType: employment ? employment.replace(/_/g, " ").toLowerCase() : null,
    url: typeof posting.url === "string" ? posting.url : undefined,
    description: htmlToText(descSrc),
    descriptionHtml: descSrc,
  }
}

/** ISO date (YYYY-MM-DD, or the full timestamp when it has a time) from common date strings; null when unparseable. */
export function normalizeDate(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.length > 10 && /T\d/.test(s) ? s : s.slice(0, 10)
  const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`
  // "27 Oct 2026" / "27 octobre 2026" / "Oct 27, 2026": read the parts directly.
  // Date.parse would read them as local midnight and toISOString shifts the day.
  const named =
    s.match(/^(\d{1,2})(?:st|nd|rd|th|er)?\s+([A-Za-zÀ-ÿ.]+),?\s+(\d{4})/) ??
    s.match(/^([A-Za-zÀ-ÿ.]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/)
  if (named) {
    const [day, monthName] = /^\d/.test(named[1]) ? [named[1], named[2]] : [named[2], named[1]]
    const month = monthNumber(monthName)
    if (month) return `${named[3]}-${String(month).padStart(2, "0")}-${day.padStart(2, "0")}`
  }
  const parsed = Date.parse(s)
  if (Number.isNaN(parsed)) return null
  const d = new Date(parsed)
  // A string with an explicit zone is an instant; anything else is a calendar date.
  if (/(Z|[+-]\d{2}:?\d{2})$/.test(s)) return d.toISOString()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const MONTHS: Record<string, number> = {
  jan: 1, janv: 1, janvier: 1, january: 1, feb: 2, fev: 2, fevr: 2, fevrier: 2, february: 2,
  mar: 3, mars: 3, march: 3, apr: 4, avr: 4, avril: 4, april: 4, may: 5, mai: 5, jun: 6, juin: 6, june: 6,
  jul: 7, juil: 7, juillet: 7, july: 7, aug: 8, aou: 8, aout: 8, august: 8, sep: 9, sept: 9, septembre: 9,
  september: 9, oct: 10, octobre: 10, october: 10, nov: 11, novembre: 11, november: 11,
  dec: 12, decembre: 12, december: 12,
}

/** Month number for an English or French month name or abbreviation (accents ignored). */
export function monthNumber(name: string): number | null {
  const key = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\./g, "").trim()
  return MONTHS[key] ?? null
}

/**
 * "30 Septembre" / "10 Aug" / "Aug 10" with no year: the most recent such date
 * on or before `today`, since a posting date cannot be in the future.
 */
export function dayMonthToIso(text: string, today: Date = new Date()): string | null {
  const m = text.match(/(\d{1,2})\s+([A-Za-zÀ-ÿ.]+)/) ?? text.match(/([A-Za-zÀ-ÿ.]+)\s+(\d{1,2})\b/)
  if (!m) return null
  const [day, monthName] = /^\d/.test(m[1]) ? [Number(m[1]), m[2]] : [Number(m[2]), m[1]]
  const month = monthNumber(monthName)
  if (!month || day < 1 || day > 31) return null
  let year = today.getUTCFullYear()
  const candidate = Date.UTC(year, month - 1, day)
  if (candidate > Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) year -= 1
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/** ISO date `days` ago from `today` for relative labels like "3 days ago" / "il y a 3 jours" / "today". */
export function relativeToIso(text: string, today: Date = new Date()): string | null {
  const s = text.toLowerCase()
  const at = (days: number) => new Date(today.getTime() - days * 86400000).toISOString().slice(0, 10)
  if (/\b(today|aujourd'hui|just now|hours? ago|heures?|minutes? ago)\b/.test(s)) return at(0)
  if (/\b(yesterday|hier)\b/.test(s)) return at(1)
  const n = s.match(/(\d+)\s*(day|jour|week|semaine|month|mois)/)
  if (!n) return null
  const unit = n[2]
  const mult = unit.startsWith("week") || unit.startsWith("semaine") ? 7 : unit.startsWith("month") || unit === "mois" ? 30 : 1
  return at(Number(n[1]) * mult)
}

/** Whether a card's date is within the last `days` days. Cards with no date are kept (unknown age is not old). */
export function withinDays(date: string | null, days: number, today: Date = new Date()): boolean {
  if (!date) return true
  const t = Date.parse(date.length === 10 ? `${date}T00:00:00Z` : date)
  if (Number.isNaN(t)) return true
  return today.getTime() - t <= days * 86400000
}
