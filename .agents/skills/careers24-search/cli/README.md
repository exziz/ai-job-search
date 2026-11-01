# careers24-cli

Searches Careers24 (careers24.com, South Africa). Zero runtime dependencies; `bun install` only pulls dev types.

```bash
bun run src/cli.ts search -q "product manager" -l "Gauteng" --format table
bun run src/cli.ts detail <id> --format plain
```

## Layout

- `src/portal.ts` - Careers24's URLs and parsers (the only Careers24-specific code).
- `src/helpers.ts`, `src/types.ts`, `src/cli.ts`, `src/commands/` - the shared portal core, identical
  across this fork's portal CLIs: flag validation, fetch with backoff, output hygiene, JSON-LD parsing.
- `tests/cli-contract.test.ts` - offline contract tests against `tests/fixtures/`.
- `tests/live.test.ts` - live smoke test, run with `PORTAL_LIVE_TESTS=1 bun test`.

```bash
bun run typecheck
bun run test
```
