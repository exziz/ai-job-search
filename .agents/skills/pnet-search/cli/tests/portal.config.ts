// Portal-specific inputs for the shared contract and live tests.
export const config = {
  liveQuery: "senior product manager",
  liveArgs: [] as string[],
  detailId: "Product-Manager-Cape-Town-Takealot-Group-Pty-Ltd--4298284",
  fixtures: [
    { match: "/jobs--", file: "detail.html" },
    { match: "pnet.co.za/jobs/", file: "search.html" },
  ],
  env: {} as Record<string, string>,
}
