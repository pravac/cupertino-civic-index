import type { Councilmember } from "@/lib/types";

/**
 * Cupertino has five councilmembers elected at large to overlapping four-year
 * terms. The Mayor and Vice Mayor are not elected by voters. The council
 * appoints them from its own membership for one-year terms, which is the single
 * most common point of confusion for residents.
 *
 * Curated because cupertino.gov blocks automated fetching. Verify against
 * COUNCIL_SOURCE_URL after each election and each annual reorganization.
 */
export const COUNCIL_SOURCE_URL = "https://www.cupertino.gov/Your-City/City-Council";

export const COUNCIL_LAST_VERIFIED = "2026-08-25";

export const COUNCIL: Councilmember[] = [
  { name: "Kitty Moore", role: "Mayor" },
  { name: "Liang Chao", role: "Vice Mayor" },
  { name: "J.R. Fruen", role: "Councilmember", termEnds: "December 2026" },
  { name: "Sheila Mohan", role: "Councilmember" },
  { name: 'R. "Ray" Wang', role: "Councilmember" },
];

export const COUNCIL_FACTS = [
  {
    label: "How the Mayor is chosen",
    value:
      "Appointed annually by the council from among its five members, not by voters directly.",
  },
  {
    label: "How members are elected",
    value: "At large by all Cupertino voters, to overlapping four-year terms.",
  },
  {
    label: "Regular meetings",
    value: "Typically the first and third Tuesday of the month at 6:45 p.m.",
  },
  {
    label: "Where",
    value: "Community Hall, 10350 Torre Avenue, and by teleconference.",
  },
];
