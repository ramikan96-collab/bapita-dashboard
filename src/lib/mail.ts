import nodemailer from "nodemailer";
import { createServiceClient } from "@/lib/supabase/service";
import { isDemo } from "@/lib/outreach/demo";

/**
 * The one place tenant-scoped mail leaves this application.
 *
 * Before this file there were nine separate `nodemailer.createTransport(...)` call sites, each
 * with its own `sendMail`. That is fine until sales demos exist: a demo tenant is a real,
 * live, bookable page built from a prospect's Google listing, for a business that has never
 * heard of Bapita. If a curious visitor books on one, the old code would email a confirmation
 * "from" that business to a stranger. Guarding nine call sites means the tenth one ships
 * unguarded, so the guard lives here instead.
 *
 * Scope, deliberately: this covers mail that carries a `businessId` — booking confirmations,
 * reschedules, payment receipts, access requests. Bapita's own mail (signup, password reset,
 * support, addon requests) has no tenant and is not routed through here.
 */

let cached: nodemailer.Transporter | null = null;

export function mailTransport(): nodemailer.Transporter {
  if (!cached) {
    cached = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return cached;
}

export class DemoTenantMailBlocked extends Error {
  constructor(businessId: string) {
    super(`Refused to send mail for demo business ${businessId}.`);
    this.name = "DemoTenantMailBlocked";
  }
}

/**
 * Fails CLOSED. A business row that cannot be read is treated as a demo and the send is
 * refused — an undelivered confirmation is an annoyance, a message sent from a business that
 * never signed up is a different category of problem.
 */
export async function isDemoBusiness(businessId: string | null | undefined): Promise<boolean> {
  if (!businessId) return false; // no tenant: this is Bapita's own mail, not a tenant's
  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from("businesses")
      .select("demo_expires_at")
      .eq("id", businessId)
      .maybeSingle();
    if (error) {
      console.error("mail guard: business lookup failed, refusing send", error.message);
      return true;
    }
    if (!data) {
      console.error(`mail guard: business ${businessId} not found, refusing send`);
      return true;
    }
    return isDemo(data);
  } catch (e) {
    console.error("mail guard: lookup threw, refusing send", e);
    return true;
  }
}

export type TenantMailOptions = nodemailer.SendMailOptions & {
  /** The tenant this mail is on behalf of. Omit only for Bapita's own mail. */
  businessId?: string | null;
};

/**
 * Sends mail on behalf of a tenant, unless that tenant is a demo.
 *
 * @returns `{ sent: true }`, or `{ sent: false, reason: "demo" }` when it was blocked.
 *          Blocking is not an error: the caller's flow succeeded, the mail simply must not go.
 */
export async function sendTenantMail(
  options: TenantMailOptions,
): Promise<{ sent: boolean; reason?: "demo" }> {
  const { businessId, ...mail } = options;

  if (await isDemoBusiness(businessId)) {
    console.warn(
      `mail blocked for demo business ${businessId}: "${String(mail.subject ?? "")}" → ${String(mail.to ?? "")}`,
    );
    return { sent: false, reason: "demo" };
  }

  await mailTransport().sendMail(mail);
  return { sent: true };
}
