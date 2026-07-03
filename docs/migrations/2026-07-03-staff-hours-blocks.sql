-- 2026-07-03 per-staff working hours + per-staff time blocking.
-- working_hours: null = staff inherits business hours; set = that staff's own weekly schedule
--                (same shape as businesses.business_hours).
-- blocked_times.staff_id: null = blocks the whole business (holiday/owner);
--                         set = blocks just that staff (break/vacation).
-- Idempotent. Existing rows unaffected (null working_hours, null staff_id).

alter table public.staff
  add column if not exists working_hours jsonb;

alter table public.blocked_times
  add column if not exists staff_id uuid references public.staff(id) on delete cascade;
