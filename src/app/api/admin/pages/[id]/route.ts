import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { pageSlugErrorMessage, validatePageSlug } from "@/lib/reserved-page-slugs";
import { sanitizePageContent } from "@/lib/pages";
import { notifyPagePublished } from "@/lib/pages-server";
import { PAGE_SECTIONS } from "@/types";

function sectionOrder(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const allowed = new Set<string>(PAGE_SECTIONS);
  const out = raw.filter((s): s is string => typeof s === "string" && allowed.has(s));
  return out.length ? out : null;
}

function text(raw: unknown, max: number): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().slice(0, max);
  return v || null;
}

/** PATCH /api/admin/pages/<id> — update, publish or unpublish. Only sent keys change. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.slug === "string") {
    const slugError = validatePageSlug(body.slug);
    if (slugError) return NextResponse.json({ error: pageSlugErrorMessage(slugError) }, { status: 400 });
    patch.slug = body.slug.trim().toLowerCase();
  }
  if (typeof body.title === "string") {
    const title = text(body.title, 200);
    if (!title) return NextResponse.json({ error: "Give the page a title." }, { status: 400 });
    patch.title = title;
  }
  if ("title_he" in body)        patch.title_he        = text(body.title_he, 200);
  if ("service_id" in body)      patch.service_id      = text(body.service_id, 64);
  if ("section_order" in body)   patch.section_order   = sectionOrder(body.section_order);
  if ("content" in body)         patch.content         = sanitizePageContent(body.content);
  if ("seo_title" in body)       patch.seo_title       = text(body.seo_title, 200);
  if ("seo_description" in body) patch.seo_description = text(body.seo_description, 400);
  if ("og_image_url" in body)    patch.og_image_url    = text(body.og_image_url, 500);
  if ("published" in body)       patch.published       = body.published === true;
  if (typeof body.display_order === "number") patch.display_order = body.display_order;
  // `kind` is deliberately not editable: a detail page and a custom page hold
  // different content shapes, and flipping one into the other silently empties it.

  const service = createServiceClient();
  const { data, error } = await service.from("pages").update(patch).eq("id", id).select().single();

  if (error) {
    const message = error.code === "23505"
      ? "That slug is already used by another page on this business."
      : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (patch.published === true && data) await notifyPagePublished(data.business_id, data.slug);
  return NextResponse.json({ page: data });
}

/** DELETE /api/admin/pages/<id> */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }
  const { id } = await params;

  const service = createServiceClient();
  const { error } = await service.from("pages").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
