import { join } from "path"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"

const CLI_PATH = join(import.meta.dir, "../src/cli.ts")

export interface CLIResult {
  stdout: string
  stderr: string
  exitCode: number
}

export async function runCLI(args: string[], preload?: string, env?: Record<string, string>): Promise<CLIResult> {
  const proc = Bun.spawn(["bun", "run", ...(preload ? ["--preload", preload] : []), CLI_PATH, ...args], {
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...(env ?? {}) },
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode }
}

/**
 * Run the real CLI offline: every fetch is answered from a saved fixture file
 * (picked by the first rule whose substring appears in the URL), and the
 * requested URLs are recorded. Unmatched URLs fail the request.
 */
export async function runWithFixtures(
  args: string[],
  rules: { match: string; file: string; contentType?: string }[],
  env?: Record<string, string>,
): Promise<{ result: CLIResult; urls: string[] }> {
  const dir = mkdtempSync(join(tmpdir(), "portal-fixture-"))
  const log = join(dir, "urls.log")
  const preload = join(dir, "fetch.ts")
  const resolved = rules.map((r) => ({ ...r, file: join(import.meta.dir, "fixtures", r.file) }))
  writeFileSync(
    preload,
    `
    import { appendFileSync } from "node:fs";
    const rules = ${JSON.stringify(resolved)};
    globalThis.fetch = async (input) => {
      const url = input instanceof Request ? input.url : String(input);
      appendFileSync(${JSON.stringify(log)}, url + "\\n");
      const rule = rules.find((r) => url.includes(r.match));
      if (!rule) return new Response("no fixture for " + url, { status: 599 });
      return new Response(Bun.file(rule.file), { headers: { "content-type": rule.contentType ?? "text/html" } });
    };
  `,
  )
  writeFileSync(log, "")
  try {
    const result = await runCLI(args, preload, env)
    const urls = (await Bun.file(log).text()).split("\n").filter(Boolean)
    return { result, urls }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

export function parseJSON<T = unknown>(result: CLIResult): T {
  if (result.exitCode !== 0) {
    throw new Error(`CLI exited with code ${result.exitCode}. stderr: ${result.stderr}`)
  }
  try {
    return JSON.parse(result.stdout) as T
  } catch {
    throw new Error(`Failed to parse JSON. stdout: ${result.stdout}\nstderr: ${result.stderr}`)
  }
}

export function parseError(result: CLIResult): { error: string; code: string } {
  return JSON.parse(result.stderr.split("\n").pop() ?? "{}")
}
