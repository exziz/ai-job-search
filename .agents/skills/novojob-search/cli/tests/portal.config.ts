// Portal-specific inputs for the shared contract and live tests.
export const config = {
  liveQuery: "product manager",
  liveArgs: [] as string[],
  detailId: "136876",
  fixtures: [
    { match: "/offre-d-emploi/", file: "detail.html" },
    { match: "/offres-d-emploi/", file: "search.html" },
  ],
  env: {} as Record<string, string>,
}
