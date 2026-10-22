/**
 * Puts Good Living's hero back to what it was before good-living-data-2026-10-10
 * (Rami, 2026-10-22: the courtyard, not Big Kasa #1). Restores hero_image_url and
 * the order of the first gallery images from that script's backup; the photo move,
 * parking swap and amenities from that run stay as they are.
 *
 *   node scripts/good-living-hero-revert-2026-10-22.mjs [backup.json]           dry run
 *   node scripts/good-living-hero-revert-2026-10-22.mjs [backup.json] --apply   write
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = resolve(import.meta.dirname, "..");
const SLUG = "good-living-herzeliya";
const apply = process.argv.includes("--apply");

function loadEnv() {
  const env = {};
  for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const file = (url) => url.split("/").pop();

function backupPath() {
  const arg = process.argv.slice(2).find((a) => a.endsWith(".json"));
  if (arg) return resolve(arg);
  const dir = join(ROOT, "backups");
  const all = readdirSync(dir).filter((f) => f.startsWith("good-living-before-")).sort();
  if (!all.length) throw new Error("No good-living-before-*.json in backups/");
  return join(dir, all[0]);
}

async function main() {
  const path = backupPath();
  const before = JSON.parse(readFileSync(path, "utf8")).business;
  const env = loadEnv();
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    apply ? env.SUPABASE_SERVICE_ROLE_KEY : env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  const { data: biz, error } = await supabase
    .from("businesses")
    .select("id, gallery_images, hero_image_url")
    .eq("slug", SLUG)
    .single();
  if (error) throw new Error(`Read failed: ${error.message}`);

  // Old order first, for every image that is still in the gallery; anything new
  // (the replacement parking photo) keeps its current relative place after them.
  const current = biz.gallery_images ?? [];
  const order = new Map(before.gallery_images.map((u, i) => [u, i]));
  const images = [...current].sort((a, b) => {
    const ia = order.get(a), ib = order.get(b);
    if (ia === undefined || ib === undefined) return current.indexOf(a) - current.indexOf(b);
    return ia - ib;
  });
  // Re-seat each unknown image at its current index so the parking swap keeps its slot.
  const known = images.filter((u) => order.has(u));
  const result = [];
  let k = 0;
  for (const u of current) result.push(order.has(u) ? known[k++] : u);

  if (result.length !== current.length || new Set(result).size !== new Set(current).size)
    throw new Error("Reorder changed the set of images, refusing");

  console.log(`  backup: ${path}`);
  console.log(`  hero: ${file(biz.hero_image_url ?? "none")} -> ${file(before.hero_image_url ?? "none")}`);
  console.log(`  first 4 now:   ${current.slice(0, 4).map(file).join(", ")}`);
  console.log(`  first 4 after: ${result.slice(0, 4).map(file).join(", ")}`);

  if (!apply) {
    console.log("\nDry run, nothing written. Re-run with --apply.");
    return;
  }

  const { error: uErr } = await supabase
    .from("businesses")
    .update({ hero_image_url: before.hero_image_url, gallery_images: result })
    .eq("id", biz.id);
  if (uErr) throw new Error(`Update failed: ${uErr.message}`);
  console.log("\nApplied.");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
