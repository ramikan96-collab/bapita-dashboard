import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Bapita",
  description: "Terms of Service for Bapita: our agreements with you.",
};

/**
 * Rewritten 2026-08-28, alongside the privacy policy and for the same reasons.
 *
 * What changed, beyond the four-product suite becoming one product: the money
 * is described as it is actually charged (a one-time build fee plus a monthly
 * fee, not a self-serve subscription), the payments add-on gets a section of
 * its own — a business collecting money from ITS clients through our software
 * needs to know who is liable for what — and the founding-customer price lock
 * is written down here rather than only appearing on the pricing section, so
 * that it is a term and not a claim.
 */

/* Shared type styles, so a new section cannot drift from the rest of the page. */
const P = "text-[0.95rem] leading-relaxed text-hub-cream/70 mb-4";
const UL = `${P} list-disc list-inside space-y-2`;
const H2 = "mt-10 mb-3 text-xl font-bold text-hub-cream";
const A = "text-hub-cream hover:underline";

export default function TermsOfService() {
  return (
    <main className="bg-hub-ink min-h-screen">
      <div className="mx-auto max-w-3xl px-5 py-24 sm:px-8">
        {/* -my-2 keeps the visual position while giving the link a 44px
            target — it was 22px, the smallest on the page. */}
        <Link
          href="/"
          className="-my-2 inline-flex min-h-11 items-center text-sm text-hub-cream/50 hover:text-hub-cream transition-colors"
        >
          ← Back to bapita.com
        </Link>

        <h1 className="mt-12 text-display-lg font-extrabold tracking-tight text-hub-cream">
          Terms of Service
        </h1>

        <p className={`${P} mt-6`}>Last updated: August 2026</p>

        <section>
          <h2 className={H2}>Our services</h2>
          <p className={P}>
            Bapita builds and runs a booking website and an owner dashboard for
            your business, and keeps them running. Optional add-ons — automated
            reminders, online payments, review requests, SEO, a Google Business
            profile, Google Calendar sync and extra pages — can be switched on
            when you want them. Using Bapita means you agree to these terms.
          </p>
        </section>

        <section>
          <h2 className={H2}>Accounts and access</h2>
          <p className={P}>
            We create your account and build your site for you. You are
            responsible for keeping your login credentials secure and
            confidential. Do not share your account with others unless you
            explicitly add them as authorized users. If you suspect
            unauthorized access, notify us immediately at{" "}
            <a href="mailto:info.bapita@gmail.com" className={A}>
              info.bapita@gmail.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className={H2}>What you pay</h2>
          <p className={P}>
            There are two figures, and they are quoted to you in full on the
            call before anything is built:
          </p>
          <ul className={UL}>
            <li>
              <strong>A one-time build fee</strong>, payable before we start.
              This covers designing, building and launching your site.
            </li>
            <li>
              <strong>A monthly fee</strong>, which covers hosting, maintenance,
              support and a set number of content changes each month.
            </li>
          </ul>
          <p className={P}>
            Recurring add-ons are billed monthly on top of that. One-time
            add-ons are billed once. We take no commission and no percentage of
            any booking, ever. Prices are quoted excluding VAT where VAT
            applies. Invoices are issued through Green Invoice.
          </p>
        </section>

        <section>
          <h2 className={H2}>Founding-customer pricing</h2>
          <p className={P}>
            While Bapita is in early access, customers who sign up under
            founding-customer pricing keep their agreed monthly fee for as long
            as their subscription runs continuously, including after we raise
            prices for new customers. This is a commitment, not an introductory
            rate with an expiry date. It applies to the monthly fee for the core
            service and does not lock the price of add-ons bought later. It ends
            if the subscription is cancelled and restarted.
          </p>
        </section>

        <section>
          <h2 className={H2}>Cancellation</h2>
          <p className={P}>
            You can cancel at any time by emailing{" "}
            <a href="mailto:info.bapita@gmail.com" className={A}>
              info.bapita@gmail.com
            </a>
            . Cancellation takes effect at the end of your current billing
            period, and you keep using the service until then. We do not refund
            partial months. The one-time build fee is not refundable once the
            build has started, because the work has been done.
          </p>
          <p className={P}>
            When you cancel, we take your booking site offline at the end of the
            billing period. If you brought your own domain, it stays yours.
          </p>
        </section>

        <section>
          <h2 className={H2}>Payments taken from your clients</h2>
          <p className={P}>
            If you switch the payments add-on on, your clients pay you through{" "}
            <a
              href="https://www.greeninvoice.co.il/"
              target="_blank"
              rel="noopener nofollow"
              className={A}
            >
              Green Invoice
            </a>{" "}
            and its clearing partner Grow, using an account in your name. That
            makes some things your responsibility rather than ours:
          </p>
          <ul className={UL}>
            <li>
              The money is yours and settles to your account. Bapita never holds
              it and takes no cut of it.
            </li>
            <li>
              You are the merchant of record. Refunds, chargebacks, disputes and
              the tax treatment of what you take are yours to handle, under your
              own agreement with Green Invoice and its clearing partner.
            </li>
            <li>
              Your deposit, cancellation and no-show policy is yours to set and
              to state to your clients. We display it; we do not enforce it for
              you.
            </li>
            <li>
              Card details never pass through Bapita. See the{" "}
              <Link href="/privacy" className={A}>
                privacy policy
              </Link>
              .
            </li>
          </ul>
        </section>

        <section>
          <h2 className={H2}>Your data ownership</h2>
          <p className={P}>
            You own all data you put into Bapita, including client information,
            content, schedules and customer records. When you cancel, we delete
            your data 30 days after the subscription ends — ask before then and
            we will export it for you first. Payment and invoice records are
            kept for as long as Israeli tax law requires.
          </p>
          <p className={P}>
            You are the data controller for your clients&apos; information and
            we process it on your behalf. That means it is your responsibility
            to have a lawful basis for collecting it and to answer your
            clients&apos; requests about it; we will help you action them.
          </p>
        </section>

        <section>
          <h2 className={H2}>Acceptable use</h2>
          <p className={P}>You agree not to use Bapita to:</p>
          <ul className={UL}>
            <li>Violate any law, regulation, or third-party rights</li>
            <li>Send spam, abuse, or harass other users or businesses</li>
            <li>Attempt to hack, override, or damage our systems</li>
            <li>Share false or misleading information</li>
            <li>Impersonate another person or business</li>
            <li>Reverse-engineer or scrape our platform</li>
          </ul>
          <p className={P}>
            Violation of these rules may result in suspension or termination of
            your account without refund.
          </p>
        </section>

        <section>
          <h2 className={H2}>Availability and support</h2>
          <p className={P}>
            We aim to keep your site available at all times, but we do not offer
            a contractual uptime guarantee, and parts of the service depend on
            providers we do not control. Planned maintenance is scheduled
            outside business hours wherever possible. Support is by email and
            message during Israeli business hours, and content changes included
            in your monthly fee are made within a few working days.
          </p>
        </section>

        <section>
          <h2 className={H2}>Limitation of liability</h2>
          <p className={P}>
            Bapita is provided &quot;as is.&quot; We make no warranties that our
            services will be error-free, always available, or meet your specific
            needs. To the maximum extent allowed by law, Bapita is not
            responsible for:
          </p>
          <ul className={UL}>
            <li>
              Data loss, corruption, or unauthorized access (except due to our
              negligence)
            </li>
            <li>Lost revenue, profits, or business opportunities</li>
            <li>Service interruptions or downtime</li>
            <li>Third-party content or actions</li>
          </ul>
          <p className={P}>
            Our total liability to you is limited to the amount you&apos;ve paid
            us in the past 12 months.
          </p>
        </section>

        <section>
          <h2 className={H2}>Indemnity</h2>
          <p className={P}>
            You agree to defend, indemnify, and hold Bapita harmless from any
            claims, damages, or costs (including legal fees) arising from your
            use of Bapita, your data, or your violation of these terms or any
            law.
          </p>
        </section>

        <section>
          <h2 className={H2}>Third-party services</h2>
          <p className={P}>
            Bapita relies on and integrates with services we do not control —
            among them Supabase, Vercel, Green Invoice and Grow, Google, and our
            email and messaging providers. Your use of those services is subject
            to their own terms and privacy policies, and we are not responsible
            for their actions or failures.
          </p>
        </section>

        <section>
          <h2 className={H2}>Governing law</h2>
          <p className={P}>
            These terms are governed by the laws of the State of Israel, and the
            competent courts of Tel Aviv-Jaffa have exclusive jurisdiction over
            any dispute arising from them.
          </p>
        </section>

        <section>
          <h2 className={H2}>Changes to terms</h2>
          <p className={P}>
            We may update these terms at any time. Material changes will be
            announced via email or a notice on our website. Your continued use
            of Bapita after changes are posted means you accept the updated
            terms. If you do not agree with new terms, you may cancel your
            subscription.
          </p>
        </section>

        <section>
          <h2 className={H2}>Contact us</h2>
          <p className={P}>
            Questions about these terms? Get in touch at{" "}
            <a href="mailto:info.bapita@gmail.com" className={A}>
              info.bapita@gmail.com
            </a>
            . We&apos;re here to help.
          </p>
        </section>
      </div>
    </main>
  );
}
