#!/usr/bin/env node
/**
 * Good Living Herzliya photo + amenity fixes from Job 26 (2026-10-10).
 *
 *   node scripts/good-living-data-2026-10-10.mjs            # dry run: prints the plan, writes nothing
 *   node scripts/good-living-data-2026-10-10.mjs --apply    # backup, upload, update, re-read
 *
 * 1. Big Kasa photo 1791580157783-0 is a Quiet Studio photo: moved to the end of
 *    Quiet Studio's group.
 * 2. Hero / share image: Big Kasa #1 (afe526d7-1) instead of #3 (the paved
 *    courtyard). The admin form treats gallery_images[0] as the hero, so the
 *    photo moves to the front as well as into hero_image_url.
 * 3. Small Kasa #5 (d1dd2970-5) shows a car plate: replaced in place by
 *    Debby's 22-parking.jpg, uploaded as <stamp>-small-kasa-22-parking.jpg (the
 *    name its alt text is keyed on in src/lib/brand-copy).
 * 4. Amenities: Pets allowed on Big Kasa and Quiet Studio, Free parking on
 *    Quiet Studio, no Air conditioning on Quiet Studio (out of order per the
 *    live Airbnb listing).
 *
 * Idempotent: a step already done is reported and skipped. Old files stay in
 * storage. The dry run reads with the public anon key only; --apply needs the
 * service role and writes a JSON backup of every field it changes first.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const ROOT = resolve(import.meta.dirname, "..");
const SLUG = "good-living-herzeliya";
const PARKING_SOURCE =
  "/Users/admin/Desktop/agent-team/agents/debby/assets/listing-photos-2026-10/final-ai/small-kasa/22-parking.jpg";
const PARKING_KEY = "small-kasa-22-parking";
const AMENITIES = {
  "Big Kasa": { add: ["pets-allowed"], remove: [] },
  "Quiet Studio": { add: ["pets-allowed", "free-parking"], remove: ["air-conditioning"] },
};
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
const endsWith = (suffix) => (url) => file(url) === suffix || file(url).endsWith(`-${suffix}`);

async function main() {
  const env = loadEnv();
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    apply ? env.SUPABASE_SERVICE_ROLE_KEY : env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  const { data: biz, error } = await supabase
    .from("businesses")
    .select("id, gallery_images, gallery_groups, gallery_hidden, image_focal, hero_image_url")
    .eq("slug", SLUG)
    .single();
  if (error || !biz) throw new Error(`Business not found: ${error?.message ?? SLUG}`);

  const { data: services, error: sErr } = await supabase
    .from("services")
    .select("id, name, amenities")
    .eq("business_id", biz.id);
  if (sErr) throw new Error(`Services: ${sErr.message}`);
  const unit = (name) => {
    const s = services.find((x) => x.name === name);
    if (!s) throw new Error(`No unit named "${name}"`);
    return s;
  };
  const big = unit("Big Kasa");
  const small = unit("Small Kasa");
  const quiet = unit("Quiet Studio");

  const images = [...(biz.gallery_images ?? [])];
  const groups = Object.fromEntries(Object.entries(biz.gallery_groups ?? {}).map(([k, v]) => [k, [...(v ?? [])]]));
  const focal = { ...(biz.image_focal ?? {}) };
  let hidden = [...(biz.gallery_hidden ?? [])];
  let hero = biz.hero_image_url;
  const log = [];

  // 1. Wrong-unit photo.
  const strayIdx = (groups[big.id] ?? []).findIndex(endsWith("1791580157783-0.jpg"));
  if (strayIdx >= 0) {
    const [url] = groups[big.id].splice(strayIdx, 1);
    groups[quiet.id] = [...(groups[quiet.id] ?? []).filter((u) => u !== url), url];
    log.push(`move ${file(url)}: Big Kasa #${strayIdx + 1} -> Quiet Studio #${groups[quiet.id].length}`);
  } else if ((groups[quiet.id] ?? []).some(endsWith("1791580157783-0.jpg"))) {
    log.push("move 1791580157783-0: already in Quiet Studio, skipped");
  } else throw new Error("1791580157783-0.jpg is in neither Big Kasa nor Quiet Studio");

  // 2. Hero.
  const heroUrl = images.find(endsWith("afe526d7-1.jpg"));
  if (!heroUrl) throw new Error("afe526d7-1.jpg not in gallery_images");
  if (images[0] === heroUrl && hero === heroUrl) log.push("hero: already afe526d7-1, skipped");
  else {
    images.splice(images.indexOf(heroUrl), 1);
    images.unshift(heroUrl);
    log.push(`hero: ${file(hero ?? "none")} -> ${file(heroUrl)} (also first in gallery_images)`);
    hero = heroUrl;
  }

  // 3. Parking photo.
  const oldParking = images.find(endsWith("d1dd2970-5.jpg"));
  const parkingDone = images.some(endsWith(`${PARKING_KEY}.jpg`));
  let parkingUpload = null;
  if (parkingDone) log.push(`parking: ${PARKING_KEY} already in gallery, skipped`);
  else if (!oldParking) throw new Error("d1dd2970-5.jpg not in gallery_images");
  else {
    const folder = images.find((u) => u.includes(`/galleries/${biz.id}/`))
      ? `galleries/${biz.id}`
      : oldParking.match(/business-images\/(galleries\/[^/]+)\//)?.[1];
    const path = `${folder}/${Date.now()}-${PARKING_KEY}.jpg`;
    const out = join(tmpdir(), `${PARKING_KEY}.jpg`);
    const info = await sharp(PARKING_SOURCE)
      .rotate()
      .resize({ width: 2000, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(out);
    parkingUpload = { path, out };
    log.push(`parking: replace ${file(oldParking)} with ${path.split("/").pop()} (${Math.round(info.size / 1024)} KB, ${info.width}x${info.height}), same position`);
  }

  // 4. Amenities.
  const amenityUpdates = [];
  for (const [name, { add, remove }] of Object.entries(AMENITIES)) {
    const s = unit(name);
    const before = s.amenities ?? [];
    const after = [...before.filter((a) => !remove.includes(a)), ...add.filter((a) => !before.includes(a))];
    if (after.length === before.length && after.every((a) => before.includes(a))) {
      log.push(`amenities ${name}: already correct, skipped`);
      continue;
    }
    amenityUpdates.push({ id: s.id, name, before, after });
    log.push(`amenities ${name}: +[${add.filter((a) => !before.includes(a)).join(", ")}] -[${remove.filter((a) => before.includes(a)).join(", ")}]`);
  }

  console.log(log.map((l) => `  ${l}`).join("\n"));
  if (!apply) {
    console.log("\nDry run, nothing written. Re-run with --apply.");
    return;
  }

  const backup = join(tmpdir(), `good-living-before-${Date.now()}.json`);
  writeFileSync(backup, JSON.stringify({ business: biz, services }, null, 2));
  console.log(`\nBackup: ${backup}`);

  if (parkingUpload) {
    const { error: upErr } = await supabase.storage
      .from("business-images")
      .upload(parkingUpload.path, readFileSync(parkingUpload.out), { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
    const newUrl = supabase.storage.from("business-images").getPublicUrl(parkingUpload.path).data.publicUrl;
    images[images.indexOf(oldParking)] = newUrl;
    for (const id of Object.keys(groups)) groups[id] = groups[id].map((u) => (u === oldParking ? newUrl : u));
    delete focal[oldParking];
    hidden = hidden.filter((u) => u !== oldParking);
    if (!groups[small.id]?.includes(newUrl)) throw new Error("New parking photo did not land in Small Kasa's group");
  }

  const { error: bErr } = await supabase
    .from("businesses")
    .update({ gallery_images: images, gallery_groups: groups, gallery_hidden: hidden, image_focal: focal, hero_image_url: hero })
    .eq("id", biz.id);
  if (bErr) throw new Error(`Business update failed: ${bErr.message}`);

  for (const u of amenityUpdates) {
    const { error: aErr } = await supabase.from("services").update({ amenities: u.after }).eq("id", u.id);
    if (aErr) throw new Error(`Amenities update failed for ${u.name}: ${aErr.message}`);
  }

  // Read back what the public page will read.
  const { data: check } = await supabase.from("businesses").select("hero_image_url, gallery_images, gallery_groups").eq("id", biz.id).single();
  console.log(`Applied. hero=${file(check.hero_image_url)} first=${file(check.gallery_images[0])} quiet=${check.gallery_groups[quiet.id].length} big=${check.gallery_groups[big.id].length} small=${check.gallery_groups[small.id].length}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
