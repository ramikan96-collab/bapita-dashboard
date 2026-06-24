import type { createClient } from "@/lib/supabase/client";
import type { StaffMember } from "@/types";

type Client = ReturnType<typeof createClient>;

/**
 * Reconcile the public.staff table for a business with an editor's current list.
 * Upserts each member (preserving its id so existing references stay valid),
 * then deletes rows that were removed. The `color`/`active` columns are omitted,
 * so they default on insert and are left untouched on update. Throws the
 * Supabase error on failure.
 */
export async function syncStaffTable(
  supabase: Client,
  businessId: string,
  members: StaffMember[],
) {
  if (members.length) {
    const rows = members.map((m, i) => ({
      id:          m.id,
      business_id: businessId,
      name:        m.name.trim(),
      role:        (m.role || "").trim(),
      photo_url:   m.photo_url || null,
      sort_order:  i,
    }));
    const { error } = await supabase.from("staff").upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }

  const ids = members.map(m => m.id);
  let del = supabase.from("staff").delete().eq("business_id", businessId);
  if (ids.length) del = del.not("id", "in", `(${ids.join(",")})`);
  const { error: delErr } = await del;
  if (delErr) throw delErr;
}

/** Load a business's staff (ordered) in the editor-facing StaffMember shape. */
export async function loadStaff(supabase: Client, businessId: string): Promise<StaffMember[]> {
  const { data } = await supabase
    .from("staff")
    .select("id, name, role, photo_url")
    .eq("business_id", businessId)
    .order("sort_order");
  return (data || []) as StaffMember[];
}
