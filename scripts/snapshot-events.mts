/**
 * Captures the city's event pages to a JSON snapshot.
 *
 * Run from a machine that can reach cupertino.gov; the site's CDN refuses
 * datacenter address ranges, so this cannot run on the deploy host.
 *
 *   npm run snapshot:events
 */
import { writeFileSync } from "node:fs";
import { getCityEvents } from "../src/lib/cityEvents";

const result = await getCityEvents();
if (result.health !== "live" || result.data.length === 0) {
  console.error(`Refusing to write: fetch was not live (${result.error ?? "no events"}).`);
  console.error("Run this from a network that can reach cupertino.gov.");
  process.exit(1);
}

const out = { capturedAt: new Date().toISOString(), events: result.data };
writeFileSync("src/data/events-snapshot.json", JSON.stringify(out, null, 2) + "\n");
console.log(`Captured ${result.data.length} events.`);
for (const e of result.data) console.log(`  ${e.title} (${e.occurrences.length} dates)`);
