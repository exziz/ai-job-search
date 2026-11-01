#!/usr/bin/env bun
// Portal CLI entry point: argument parsing, validation and command dispatch.
// Identical across the portal CLIs in this fork; everything portal-specific
// comes from ./portal.ts.

import { portal } from "./portal.js"
import { runSearch } from "./commands/search.js"
import { runDetail } from "./commands/detail.js"
import type { SearchOpts } from "./types.js"

type FlagValue = string | boolean
interface Flags {
  _: string[]
  [k: string]: FlagValue | string[]
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  const alias: Record<string, string> = { q: "query", l: "location", n: "limit", c: "country" }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith("-") && a !== "-") {
      const raw = a.replace(/^-+/, "")
      const eq = raw.indexOf("=")
      const name = eq === -1 ? raw : raw.slice(0, eq)
      const key = alias[name] ?? name
      if (eq !== -1) {
        flags[key] = raw.slice(eq + 1)
        continue
      }
      const next = argv[i + 1]
      if (next === undefined || (next.startsWith("-") && next !== "-")) {
        flags[key] = true
      } else {
        flags[key] = next
        i++
      }
    } else {
      ;(flags._ as string[]).push(a)
    }
  }
  return flags
}

function help(): string {
  const lines = [
    `${portal.cliName} - ${portal.summary}`,
    "",
    "USAGE",
    "  bun run src/cli.ts search --query \"<keywords>\" [flags]",
    "  bun run src/cli.ts detail <id|url> [--format json|plain]",
    "",
    "SEARCH FLAGS",
    "  --query, -q <text>      Keywords (job title, skill). REQUIRED.",
  ]
  if (portal.flags.location) lines.push(`  --location, -l <text>   ${portal.flags.location}`)
  if (portal.flags.country) lines.push(`  --country, -c <code>    ${portal.flags.country}`)
  lines.push(
    `  --jobage <days>         Posted within N days.${portal.jobageServerSide ? "" : " Applied client-side on each result's date."}`,
    "  --page <n>              1-indexed results page. Default 1.",
    "  --limit, -n <n>         Cap results emitted (client-side).",
    "  --format <fmt>          json (default) | table | plain.",
    "",
    "EXAMPLES",
    ...portal.examples.map((e) => `  ${e}`),
    "",
    "Errors go to stderr as {\"error\": \"...\", \"code\": \"...\"} with exit code 1.",
    "",
  )
  return lines.join("\n")
}

function fail(error: string, code: string): number {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
  return 1
}

/** Whole number >= 1, or null after writing the error. */
function positiveInt(name: string, raw: FlagValue | string[]): number | null {
  // Number(), not parseInt(): parseInt("0.5") is 0 and "7days" is 7.
  const val = typeof raw === "string" ? Number(raw.trim()) : NaN
  if (!Number.isInteger(val) || val < 1) {
    fail(`--${name} must be a whole number of at least 1, got "${raw}"`, "BAD_ARG")
    return null
  }
  return val
}

async function main(): Promise<number> {
  const flags = parseFlags(process.argv.slice(2))
  const cmd = (flags._ as string[])[0]

  if (!cmd || flags.help || flags.h) {
    process.stdout.write(help())
    return cmd ? 0 : 1
  }

  const known: Record<string, Set<string>> = {
    search: new Set(["query", "jobage", "page", "limit", "format", "help", "h"]),
    detail: new Set(["format", "help", "h"]),
  }
  if (portal.flags.location) known.search.add("location")
  if (portal.flags.country) known.search.add("country")

  const allowed = known[cmd]
  if (!allowed) return fail(`Unknown command "${cmd}"`, "BAD_CMD")
  // Unknown flags are rejected, never ignored: a discarded filter silently
  // changes what the search returns.
  for (const key of Object.keys(flags)) {
    if (key !== "_" && !allowed.has(key)) {
      return fail(
        `unknown flag --${key} for '${cmd}' - flags are never silently ignored, because a discarded filter changes what the search returns; see --help for the supported flags`,
        "UNKNOWN_FLAG",
      )
    }
  }

  if (cmd === "search") {
    if (typeof flags.query !== "string" || !flags.query.trim()) {
      return fail("the --query/-q flag is required and needs a non-empty value", "NO_QUERY")
    }
    for (const name of ["location", "country"]) {
      if (flags[name] !== undefined && (typeof flags[name] !== "string" || !(flags[name] as string).trim())) {
        return fail(`--${name} requires a non-empty value`, "BAD_ARG")
      }
    }
    let country: string | undefined
    if (portal.countries) {
      country = typeof flags.country === "string" ? flags.country.trim().toLowerCase() : portal.countries.default
      if (!portal.countries.values.includes(country)) {
        return fail(`--country must be one of ${portal.countries.values.join("|")}, got "${country}"`, "BAD_ARG")
      }
    }
    const fmt = flags.format !== undefined ? String(flags.format) : "json"
    if (!["json", "table", "plain"].includes(fmt)) {
      return fail(`--format must be one of json|table|plain, got "${fmt}"`, "BAD_ARG")
    }
    const opts: SearchOpts = {
      query: flags.query.trim(),
      location: typeof flags.location === "string" ? flags.location.trim() : undefined,
      country,
      page: 1,
      format: fmt as SearchOpts["format"],
    }
    for (const name of ["jobage", "page", "limit"] as const) {
      if (flags[name] === undefined) continue
      const v = positiveInt(name, flags[name])
      if (v === null) return 1
      opts[name] = v
    }
    return runSearch(opts)
  }

  const id = (flags._ as string[])[1]
  if (!id) return fail("detail requires an <id|url>", "NO_ID")
  const fmt = flags.format !== undefined ? String(flags.format) : "json"
  if (!["json", "plain"].includes(fmt)) return fail(`--format must be one of json|plain, got "${fmt}"`, "BAD_ARG")
  return runDetail({ id, format: fmt as "json" | "plain" })
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    process.stderr.write(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e), code: "INTERNAL_ERROR" }) + "\n",
    )
    process.exit(1)
  })
