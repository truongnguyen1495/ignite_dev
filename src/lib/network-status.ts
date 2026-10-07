// Single source of truth for how a Team Network member's status looks and
// behaves. Plain data and string matching only — no Prisma runtime import —
// so a Client Component, a Server Action and a node:test file can all use it.

// Same five values as the NetworkMemberStatus enum in schema.prisma, spelled
// out as a union so client code never has to import the Prisma runtime just
// to name a status.
export type NetworkStatus = "LEAD" | "ACTIVE" | "INACTIVE" | "ZERO_PP" | "CUSTOMER";

// Display order everywhere a list of statuses is shown (KPI strip, selects,
// legends): the funnel order from the spec, Customer → 0_PP → Active → Lead,
// is reversed on purpose so the strip leads with the people who matter most.
export const NETWORK_STATUS_ORDER: readonly NetworkStatus[] = ["LEAD", "ACTIVE", "INACTIVE", "ZERO_PP", "CUSTOMER"];

// Every class here is a complete literal string so Tailwind's static scanner
// finds it — never build these by interpolating the status name.
//   pill  — tinted chip, the same recipe as Badge (text colour on its own tint)
//   dot   — the solid colour on its own, for stripes, bars and legends
export const NETWORK_STATUS_CONFIG: Record<
  NetworkStatus,
  { label: string; pill: string; dot: string; stripe: string }
> = {
  LEAD: { label: "Lead", pill: "bg-status-lead-bg text-status-lead", dot: "bg-status-lead", stripe: "before:bg-status-lead" },
  ACTIVE: { label: "Active", pill: "bg-success-bg text-success", dot: "bg-success", stripe: "before:bg-success" },
  INACTIVE: {
    label: "In-active",
    pill: "bg-status-inactive-bg text-status-inactive",
    dot: "bg-status-inactive",
    stripe: "before:bg-status-inactive",
  },
  ZERO_PP: { label: "0_PP", pill: "bg-warning-bg text-warning", dot: "bg-warning", stripe: "before:bg-warning" },
  CUSTOMER: { label: "Customer", pill: "bg-info-bg text-info", dot: "bg-info", stripe: "before:bg-info" },
};

// Moving someone to one of these needs a written reason; the others can be
// left blank. Lead is a rank an admin grants and Inactive is a flag worth
// explaining later, so both leave a trail the history tab can show.
export const NETWORK_STATUS_NEEDS_REASON: Record<NetworkStatus, boolean> = {
  LEAD: true,
  ACTIVE: false,
  INACTIVE: true,
  ZERO_PP: false,
  CUSTOMER: false,
};

function squash(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

// Reads a status the way the source spreadsheet spells it: "Lead", "In-active",
// "0_PP", "Customer". Case, hyphens, underscores and spaces are ignored, so
// "in active", "INACTIVE" and "In-active" are all the same status. Returns
// null for anything unrecognised — the importer reports those instead of
// guessing.
export function parseNetworkStatus(raw: string | null | undefined): NetworkStatus | null {
  if (!raw) return null;
  switch (squash(raw)) {
    case "lead":
      return "LEAD";
    case "active":
      return "ACTIVE";
    case "inactive":
      return "INACTIVE";
    case "0pp":
    case "zeropp":
      return "ZERO_PP";
    case "customer":
      return "CUSTOMER";
    default:
      return null;
  }
}

export function isNetworkStatus(value: unknown): value is NetworkStatus {
  return typeof value === "string" && (NETWORK_STATUS_ORDER as readonly string[]).includes(value);
}
