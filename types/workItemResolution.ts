export type MissingInfoResolutionValue =
  | { field: "proposalRoute"; status: "clear" | "conflict"; note?: string }
  | { field: "personIntent"; status: "confirmed" | "declined"; note?: string }
  | { field: "availabilityStart"; status: "matched" | "mismatched"; date?: string }
  | { field: "informationFreshness"; note?: string }
  | { field: "duplicateProposal"; status: "none" | "possible" | "confirmed"; note?: string }
  | { field: "disclosureScope"; status: "defined" | "restricted"; note?: string };
