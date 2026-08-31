import { createServiceClient } from "@/lib/supabase/service";

export async function insertBusinessWithServices(
  payload: Record<string, unknown>,
  services: unknown,
): Promise<{ id: string; error: null } | { id: null; error: string }> {
  const service = createServiceClient();

  const { data: biz, error: bizErr } = await service
    .from("businesses")
    .insert(payload)
    .select("id")
    .single();

  if (bizErr || !biz) return { id: null, error: bizErr?.message ?? "insert returned no row" };

  const list = Array.isArray(services) ? services : [];
  if (list.length > 0) {
    const rows = (list as Record<string, unknown>[]).map((s, i) => ({
      business_id:   biz.id,
      name:          s.name        || "",
      name_he:       s.name_he     || "",
      duration:      Number(s.duration) || 30,
      price:         Number(s.price)    || 0,
      description:   (s.description as string) || null,
      display_order: i,
      active:        true,
    }));
    await service.from("services").insert(rows);
  }

  return { id: biz.id as string, error: null };
}
