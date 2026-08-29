import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { pageSlugErrorMessage, validatePageSlug } from "@/lib/reserved-page-slugs";
import { PAGE_KINDS, sanitizePageContent } from "@/lib/pages";
import { notifyPagePublished } from "@/lib/pages-server";
import { PAGE_SECTION_KEYS, PAGE_SECTIONS } from "@/types";

// Admin-only writer for the multi-page add-on. The service client bypasses RLS,
// and `pages` has no write policy for anyone, so this route IS the only way a
// page can be created. The admin check therefore has to happen here — the
// redirect in admin/layout.tsx guards the UI, not this.

function sectionOrder(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const allowed = new Set<string>(PAGE_SECTIONS);
  const out = raw.filter((s): s is string => typeof s === "string" && allowed.has(s));
  return out.length ? out : null;
}

function sectionKey(raw: unknown): string | null {
  const allowed = new Set<string>(PAGE_SECTION_KEYS);
  return typeof raw === "string" && allowed.has(raw) ? raw : null;
}

function text(raw: unknown, max: number): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().slice(0, max);
  return v || null;
}

/** GET /api/admin/pages?business_id=… — every page of one business, drafts included. */
export async function GET(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }
  const businessId = new URL(req.url).searchParams.get("business_id");
  if (!businessId) {
    return NextResponse.json({ error: "business_id required" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("pages")
    .select("*")
    .eq("business_id", businessId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pages: data ?? [] });
}

/** POST /api/admin/pages — create one page. */
export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const businessId = text(body.business_id, 64);
  const title = text(body.title, 200);
  const kind = text(body.kind, 20);
  const rawSlug = typeof body.slug === "string" ? body.slug : "";

  if (!businessId) return NextResponse.json({ error: "business_id required" }, { status: 400 });
  if (!title)      return NextResponse.json({ error: "Give the page a title." }, { status: 400 });
  if (!kind || !PAGE_KINDS.includes(kind as never)) {
    return NextResponse.json({ error: "kind must be 'detail' or 'custom'" }, { status: 400 });
  }

  const slugError = validatePageSlug(rawSlug);
  if (slugError) return NextResponse.json({ error: pageSlugErrorMessage(slugError) }, { status: 400 });
  const slug = rawSlug.trim().toLowerCase();

  const service = createServiceClient();
  const { data, error } = await service
    .from("pages")
    .insert({
      business_id:     businessId,
      slug,
      kind,
      service_id:      kind === "detail" ? text(body.service_id, 64) : null,
      title,
      title_he:        text(body.title_he, 200),
      section_order:   sectionOrder(body.section_order),
      section_key:     sectionKey(body.section_key),
      content:         sanitizePageContent(body.content),
      seo_title:       text(body.seo_title, 200),
      seo_description: text(body.seo_description, 400),
      og_image_url:    text(body.og_image_url, 500),
      published:       body.published === true,
      display_order:   typeof body.display_order === "number" ? body.display_order : 0,
    })
    .select()
    .single();

  if (error) {
    // 23505 = the (business_id, slug) unique constraint, i.e. the DB backstop
    // catching a duplicate the UI let through.
    const message = error.code === "23505"
      ? "That slug is already used by another page on this business."
      : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (data?.published) await notifyPagePublished(data.business_id, data.slug);
  return NextResponse.json({ page: data });
}

/** PATCH /api/admin/pages — reorder: { order: [{ id, display_order }, …] }. */
export async function PATCH(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  let body: { order?: { id?: string; display_order?: number }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (!Array.isArray(body.order)) {
    return NextResponse.json({ error: "order required" }, { status: 400 });
  }

  const service = createServiceClient();
  for (const row of body.order) {
    if (!row?.id || typeof row.display_order !== "number") continue;
    await service.from("pages").update({ display_order: row.display_order, updated_at: new Date().toISOString() }).eq("id", row.id);
  }
  return NextResponse.json({ ok: true });
}
