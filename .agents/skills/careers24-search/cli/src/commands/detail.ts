import { portal } from "../portal.js"
import { CliError, httpFetch, stripInvisible, writeError } from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = portal.normalizeId(opts.id)
  if (!id) {
    writeError(`Could not parse a job ID for this portal from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    const req = await portal.detailRequest(id)
    const body = await httpFetch(portal.cliName, req.url, req.init)
    if (!body) {
      writeError("Job not found", "NOT_FOUND")
      return 1
    }
    const job = stripInvisible(portal.parseDetail(body, id))

    if (opts.format === "plain") {
      const facts = [
        job.date ? `Posted: ${job.date}` : null,
        job.deadline ? `Deadline: ${job.deadline}` : null,
        job.employmentType ? `Employment: ${job.employmentType}` : null,
      ].filter((l): l is string => l !== null)
      const links = [`URL: ${job.url}`, job.applyUrl && job.applyUrl !== job.url ? `Apply: ${job.applyUrl}` : null].filter(
        (l): l is string => l !== null,
      )
      const sections = [
        `${job.title}\n${job.company || "-"} · ${job.location || "-"}`,
        facts.join("\n"),
        job.description || "(no description)",
        links.join("\n"),
      ].filter((s) => s !== "")
      process.stdout.write(sections.join("\n\n") + "\n")
    } else {
      process.stdout.write(JSON.stringify(job, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), e instanceof CliError ? e.code : "DETAIL_FAILED")
    return 1
  }
}
