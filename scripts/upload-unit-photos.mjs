#!/usr/bin/env node
/**
 * Replace a stay business's per-unit photo groups with a folder of photos each.
 *
 *   node scripts/upload-unit-photos.mjs --slug <business-slug> \
 *     --unit "<unit name>=<folder>" [--unit ...] \
 *     [--exclude "<unit name>=<file>,<file>"] [--apply]
 *
 * Without --apply it is a dry run: it resizes everything and prints the plan,
 * touching nothing. With --apply it uploads to the `business-images` bucket
 * (the same folder the business's existing gallery lives in), then rewrites
 * gallery_groups / gallery_images in one update. A JSON backup of the previous
 * gallery fields is written first, next to the resized files.
 *
 * Covers are preserved: each photo already on the site is matched to its
 * new copy by a small perceptual hash, and the matches keep their old order
 * at the front of the group, so a hand-picked cover stays the cover. The hero
 * image is repointed at its new copy when one matches. Old files are left in
 * storage — nothing that links to them breaks.
 *
 * Files are ordered by their leading number ("12-IMG_1.jpg" → 12).
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const ROOT = resolve(import.meta.dirname, "..");
const MAX_WIDTH = 2000;
const QUALITY = 82;
const MATCH_THRESHOLD = 40; // max hash distance (of 256) to call two photos the same

function parseArgs(argv) {
  const out = { units: [], exclude: {}, apply: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") out.apply = true;
    else if (a === "--slug") out.slug = argv[++i];
    else if (a === "--unit") {
      const [name, dir] = splitOnce(argv[++i]);
      out.units.push({ name, dir });
    } else if (a === "--exclude") {
      const [name, files] = splitOnce(argv[++i]);
      out.exclude[name] = new Set(files.split(",").map((f) => f.trim()));
    } else throw new Error(`Unknown argument: ${a}`);
  }
  if (!out.slug || !out.units.length) throw new Error("Need --slug and at least one --unit");
  return out;
}

function splitOnce(s) {
  const i = s.indexOf("=");
  if (i < 0) throw new Error(`Expected name=value, got: ${s}`);
  return [s.slice(0, i), s.slice(i + 1)];
}

function loadEnv() {
  const env = {};
  for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

function sortedImages(dir, exclude) {
  return readdirSync(dir)
    .filter((f) => [".jpg", ".jpeg", ".png"].includes(extname(f).toLowerCase()))
    .filter((f) => !exclude?.has(f))
    .sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0) || a.localeCompare(b));
}

/** 16×16 grayscale average hash — enough to tell the same photo apart from others. */
async function hash(input) {
  const px = await sharp(input).rotate().resize(16, 16, { fit: "fill" }).grayscale().raw().toBuffer();
  const avg = px.reduce((s, v) => s + v, 0) / px.length;
  return Array.from(px, (v) => (v > avg ? 1 : 0));
}

const distance = (a, b) => a.reduce((d, v, i) => d + (v !== b[i] ? 1 : 0), 0);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = loadEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: biz, error } = await supabase
    .from("businesses")
    .select("id, slug, gallery_groups, gallery_images, gallery_hidden, hero_image_url")
    .eq("slug", args.slug)
    .single();
  if (error || !biz) throw new Error(`Business not found: ${args.slug}`);

  const { data: services } = await supabase
    .from("services")
    .select("id, name, display_order")
    .eq("business_id", biz.id)
    .order("display_order");

  const existing = biz.gallery_images?.[0] || biz.hero_image_url;
  const folder = existing?.match(/business-images\/(galleries\/[^/]+)\//)?.[1];
  if (!folder) throw new Error("Could not find the business's storage folder from its current gallery");

  const workDir = join(tmpdir(), `unit-photos-${args.slug}-${Date.now()}`);
  mkdirSync(workDir, { recursive: true });

  const plan = [];
  for (const u of args.units) {
    const svc = services.find((s) => s.name === u.name);
    if (!svc) throw new Error(`No unit named "${u.name}"`);
    const files = sortedImages(u.dir, args.exclude[u.name]);
    const items = [];
    for (const f of files) {
      const out = join(workDir, `${svc.id}-${parseInt(f, 10) || items.length + 1}.jpg`);
      const info = await sharp(join(u.dir, f))
        .rotate()
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: QUALITY, mozjpeg: true })
        .toFile(out);
      items.push({ source: f, out, bytes: info.size, hash: await hash(out) });
    }

    // Match each photo already on the site to its new copy, in the old order.
    const oldUrls = biz.gallery_groups?.[svc.id] ?? [];
    const front = [];
    const matches = [];
    for (const url of oldUrls) {
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
      const h = await hash(buf);
      let best = null;
      for (const it of items) {
        const d = distance(h, it.hash);
        if (!best || d < best.d) best = { it, d };
      }
      const ok = best && best.d <= MATCH_THRESHOLD && !front.includes(best.it);
      matches.push({ url, source: ok ? best.it.source : null, d: best?.d });
      if (ok) {
        best.it.oldUrl = url;
        front.push(best.it);
      }
    }
    const ordered = [...front, ...items.filter((it) => !front.includes(it))];
    plan.push({ svc, items: ordered, matches });
  }

  for (const p of plan) {
    const mb = (p.items.reduce((s, it) => s + it.bytes, 0) / 1e6).toFixed(1);
    console.log(`\n${p.svc.name}: ${p.items.length} photos (${mb} MB)`);
    for (const m of p.matches) console.log(`  current ${m.url.split("/").pop()} -> ${m.source ?? "NO MATCH"} (distance ${m.d})`);
    console.log(`  order: ${p.items.map((it) => it.source).join(", ")}`);
  }

  if (!args.apply) {
    console.log(`\nDry run. Resized files in ${workDir}. Re-run with --apply to upload.`);
    return;
  }

  writeFileSync(
    join(workDir, "backup.json"),
    JSON.stringify({ gallery_groups: biz.gallery_groups, gallery_images: biz.gallery_images, hero_image_url: biz.hero_image_url }, null, 2),
  );

  const stamp = Date.now();
  const groups = { ...(biz.gallery_groups ?? {}) };
  let hero = biz.hero_image_url;
  for (const p of plan) {
    const urls = [];
    for (let i = 0; i < p.items.length; i++) {
      const it = p.items[i];
      const path = `${folder}/${stamp}-${p.svc.id.slice(0, 8)}-${i + 1}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("business-images")
        .upload(path, readFileSync(it.out), { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
      if (upErr) throw new Error(`Upload failed for ${it.source}: ${upErr.message}`);
      const url = supabase.storage.from("business-images").getPublicUrl(path).data.publicUrl;
      urls.push(url);
      if (it.oldUrl && it.oldUrl === biz.hero_image_url) hero = url;
    }
    groups[p.svc.id] = urls;
  }

  // Gallery order follows the units' display order; any ungrouped image stays.
  const grouped = new Set(Object.values(biz.gallery_groups ?? {}).flat());
  const ungrouped = (biz.gallery_images ?? []).filter((u) => !grouped.has(u));
  const galleryImages = [...services.flatMap((s) => groups[s.id] ?? []), ...ungrouped];

  const { error: updErr } = await supabase
    .from("businesses")
    .update({ gallery_groups: groups, gallery_images: galleryImages, hero_image_url: hero })
    .eq("id", biz.id);
  if (updErr) throw new Error(`Update failed: ${updErr.message}`);

  console.log(`\nApplied. ${galleryImages.length} gallery images. Hero ${hero === biz.hero_image_url ? "unchanged" : "repointed to its new copy"}.`);
  console.log(`Backup of the previous gallery: ${join(workDir, "backup.json")}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
