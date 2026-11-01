import { portal } from "../portal.js"
import { CliError, httpFetch, stripInvisible, withinDays, writeError, type JobCard } from "../helpers.js"
import type { SearchOpts } from "../types.js"

function cell(text: string | null | undefined, width: number): string {
  const s = (text || "-").replace(/\s+/g, " ")
  return (s.length > width ? s.slice(0, width - 1) + "…" : s).padEnd(width)
}

export function renderTable(cards: JobCard[]): string {
  if (cards.length === 0) return "No results."
  // The id column is never truncated: it is what `detail` takes.
  const idWidth = Math.max(4, ...cards.map((c) => c.id.length))
  const header = `${"ID".padEnd(idWidth)} ${cell("TITLE", 44)} ${cell("COMPANY", 26)} ${cell("LOCATION", 22)} DATE`
  const rows = cards.map(
    (c) => `${c.id.padEnd(idWidth)} ${cell(c.title, 44)} ${cell(c.company, 26)} ${cell(c.location, 22)} ${(c.date || "-").slice(0, 10)}`,
  )
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

/** Every result carries the contract fields; missing values are null, never omitted. */
function complete(card: JobCard): JobCard {
  return {
    ...card,
    company: card.company ?? null,
    location: card.location ?? null,
    date: card.date ?? null,
  }
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const req = await portal.searchRequest(opts)
    const body = await httpFetch(portal.cliName, req.url, req.init)
    let cards = stripInvisible(portal.parseSearch(body, opts).map(complete))
    // Applied even where the portal filters server-side: cheap, and it holds the
    // contract when a portal's own age filter is looser than asked.
    if (opts.jobage !== undefined) cards = cards.filter((c) => withinDays(c.date, opts.jobage!))
    if (opts.limit !== undefined) cards = cards.slice(0, opts.limit)

    if (opts.format === "table") {
      process.stdout.write(renderTable(cards) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(
        (cards.length === 0
          ? "No results."
          : cards
              .map((c) => `${c.title}\n  ${c.company || "-"} · ${c.location || "-"} · ${c.date || "-"}\n  id: ${c.id}\n  ${c.url}`)
              .join("\n\n")) + "\n",
      )
    } else {
      process.stdout.write(
        JSON.stringify({ meta: { count: cards.length, page: opts.page }, results: cards }, null, 2) + "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), e instanceof CliError ? e.code : "SEARCH_FAILED")
    return 1
  }
}
