import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Bapita",
  description: "Privacy Policy for Bapita: how we handle your data.",
};

/**
 * Rewritten 2026-08-28. The previous version predated three things it therefore
 * did not disclose: card payments taken through Green Invoice/Grow, the Google
 * account connection that reads and writes an owner's calendar, and the second
 * analytics tool. It also described a four-product suite that no longer exists.
 *
 * Two audiences, and the split is the reason this page is structured the way it
 * is: a business owner is our CUSTOMER, and the people who book with that owner
 * are their clients, whose data we hold on the owner's behalf and not for our
 * own purposes. Every section says which of the two it is talking about.
 */

/* Shared type styles, so a new section cannot drift from the rest of the page. */
const P = "text-[0.95rem] leading-relaxed text-hub-cream/70 mb-4";
const UL = `${P} list-disc list-inside space-y-2`;
const H2 = "mt-10 mb-3 text-xl font-bold text-hub-cream";
const A = "text-hub-cream hover:underline";

export default function PrivacyPolicy() {
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
          Privacy Policy
        </h1>

        <p className={`${P} mt-6`}>Last updated: August 2026</p>

        <section>
          <h2 className={H2}>Who we are</h2>
          <p className={P}>
            Bapita builds and runs booking websites and owner dashboards for
            small businesses in Israel — hair salons, nail and lash studios,
            clinics, and short term rentals. We build the site for the owner, we
            host it, and we keep it running. We are a small team and we care
            about keeping your data safe.
          </p>
          <p className={P}>
            This policy covers two different people, and it is worth being clear
            which one you are:
          </p>
          <ul className={UL}>
            <li>
              <strong>Business owners</strong> — our customers, who have a
              Bapita account and a booking site we built.
            </li>
            <li>
              <strong>Clients and guests</strong> — the people who book an
              appointment or a stay through one of those sites. If that is you,
              the business you booked with decides what happens to your data.
              We hold it on their behalf, and we do not use it for anything of
              our own.
            </li>
          </ul>
        </section>

        <section>
          <h2 className={H2}>What data we collect</h2>
          <ul className={UL}>
            <li>
              <strong>Contact forms and calls:</strong> name, business name,
              phone number, and email when you ask us to get in touch or book a
              call with us. Calls are scheduled through Calendly, which
              receives the details you enter on its own booking form.
            </li>
            <li>
              <strong>Owner accounts:</strong> your email, a hashed password,
              your business details, your services and prices, your working
              hours, your staff, and any photos you give us.
            </li>
            <li>
              <strong>Bookings:</strong> client name, phone number, email,
              appointment or stay dates and times, the service booked, and any
              note the client leaves. This is the business owner&apos;s data,
              held by us on their behalf.
            </li>
            <li>
              <strong>Payments:</strong> where a business has payments switched
              on, the amount, the status, and the reference of the transaction.
              See <em>Payments</em> below — we never see or store card numbers.
            </li>
            <li>
              <strong>Google account data:</strong> only where an owner
              explicitly connects one. See <em>Connecting a Google account</em>{" "}
              below.
            </li>
            <li>
              <strong>Product usage and analytics:</strong> pages visited and
              features used, so we can see what works. See{" "}
              <em>Analytics and cookies</em> below.
            </li>
            <li>
              <strong>Push notifications:</strong> if an owner turns them on, a
              browser-issued subscription token so new bookings can reach their
              phone. It identifies a browser, not a person, and it is deleted
              when notifications are turned off.
            </li>
          </ul>
        </section>

        <section>
          <h2 className={H2}>How we use your data</h2>
          <ul className={UL}>
            <li>Run the booking site and dashboard we built for you</li>
            <li>Send booking confirmations and reminders</li>
            <li>Take and reconcile payments where that is switched on</li>
            <li>Answer your questions and support you</li>
            <li>Improve the product</li>
            <li>Meet our legal and tax obligations</li>
            <li>Prevent fraud and abuse</li>
          </ul>
          <p className={P}>
            We do not sell your data, we do not rent it, and we do not use a
            business&apos;s client list for our own marketing.
          </p>
        </section>

        <section>
          <h2 className={H2}>Payments</h2>
          <p className={P}>
            Where a business has online payments switched on, the payment itself
            is processed by{" "}
            <a
              href="https://www.greeninvoice.co.il/"
              target="_blank"
              rel="noopener nofollow"
              className={A}
            >
              Green Invoice
            </a>{" "}
            and its clearing partner Grow, who are the payment processors of
            record. The client is sent to their secure payment page to enter
            card details.
          </p>
          <p className={P}>
            <strong>
              Card numbers, CVV codes and expiry dates never reach Bapita.
            </strong>{" "}
            We never see them, we never store them, and they are never in our
            database. What we store is the transaction reference, the amount,
            the currency and the status, so a booking can be marked paid and an
            owner can reconcile their takings. Green Invoice also issues the tax
            document for the transaction, which means the client&apos;s name and
            email are shared with them for that purpose. Their handling of that
            data is governed by their own privacy policy.
          </p>
        </section>

        <section>
          <h2 className={H2}>Connecting a Google account</h2>
          <p className={P}>
            A business owner can connect their Google Calendar so that bookings
            and busy time stay in step. This is entirely optional, it is never
            done for you, and nothing is connected until you complete
            Google&apos;s own consent screen.
          </p>
          <p className={P}>When it is connected, we:</p>
          <ul className={UL}>
            <li>
              read busy times from the calendar you selected, so a slot you are
              already committed to is not offered to a client;
            </li>
            <li>
              write bookings taken through Bapita into that calendar, so your
              day is in one place.
            </li>
          </ul>
          <p className={P}>
            We do not read the contents of unrelated events, we do not touch any
            other Google service, and we do not use Google data for advertising
            or sell it to anyone. Bapita&apos;s use of information received from
            Google APIs adheres to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener nofollow"
              className={A}
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. You can disconnect at any
            time from your dashboard settings, or revoke access directly in your{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener nofollow"
              className={A}
            >
              Google account permissions
            </a>
            . Disconnecting deletes the access tokens we hold.
          </p>
        </section>

        <section>
          <h2 className={H2}>Analytics and cookies</h2>
          <p className={P}>We use two analytics tools on bapita.com:</p>
          <ul className={UL}>
            <li>
              <strong>Plausible Analytics</strong> — cookieless and privacy
              focused. It sets no cookies, stores no personal data, and does not
              track anyone across sites. It tells us how many people visited a
              page, and nothing about who they are.
            </li>
            <li>
              <strong>Google Analytics 4</strong> — this one does set first
              party cookies (such as <code>_ga</code>) in your browser, and
              sends usage data to Google. We use it for aggregate traffic
              reporting only. You can block it with your browser&apos;s cookie
              settings, a tracker blocker, or Google&apos;s own{" "}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noopener nofollow"
                className={A}
              >
                opt-out add-on
              </a>
              .
            </li>
          </ul>
          <p className={P}>
            The booking sites we build for our customers also carry a session
            cookie where one is needed to keep a booking or a login working.
            Those are strictly functional — nothing is used for advertising.
          </p>
        </section>

        <section>
          <h2 className={H2}>Where your data is stored</h2>
          <p className={P}>
            Our database and file storage run on{" "}
            <a
              href="https://supabase.com/"
              target="_blank"
              rel="noopener nofollow"
              className={A}
            >
              Supabase
            </a>
            , and the application is hosted on{" "}
            <a
              href="https://vercel.com/"
              target="_blank"
              rel="noopener nofollow"
              className={A}
            >
              Vercel
            </a>
            . Transactional email is sent through our email providers. All of
            these may process and store data in data centres outside Israel. We
            use encryption in transit and at rest, row level access controls so
            one business can never read another&apos;s data, and regular
            backups.
          </p>
        </section>

        <section>
          <h2 className={H2}>Who we share it with</h2>
          <p className={P}>
            We do not sell, rent, or share personal data with third parties for
            marketing. We share it only with the service providers who make the
            product work — the hosting, database, email, payment and analytics
            providers named above, each under their own terms — and where we are
            required to by law or a court order, or where it is necessary to
            protect the security of our services.
          </p>
        </section>

        <section>
          <h2 className={H2}>How long we keep it</h2>
          <ul className={UL}>
            <li>
              <strong>Active accounts:</strong> as long as the account is open.
            </li>
            <li>
              <strong>After you cancel:</strong> your account and its data are
              deleted 30 days after the subscription ends. Ask us before then
              and we will export it for you first.
            </li>
            <li>
              <strong>Bookings and client records:</strong> deleted with the
              account they belong to, subject to the exception below.
            </li>
            <li>
              <strong>Payment and invoice records:</strong> kept for as long as
              Israeli tax law requires us and Green Invoice to keep them, which
              is longer than the 30 days above and which we cannot shorten on
              request.
            </li>
            <li>
              <strong>Enquiries that never became customers:</strong> deleted
              within 24 months.
            </li>
            <li>
              <strong>Analytics:</strong> aggregate only, and held to the
              provider&apos;s own retention period.
            </li>
          </ul>
        </section>

        <section>
          <h2 className={H2}>Your rights</h2>
          <p className={P}>You have the right to:</p>
          <ul className={UL}>
            <li>Request a copy of the personal data we hold about you</li>
            <li>Ask us to correct anything that is wrong</li>
            <li>
              Ask us to delete your data, subject to the retention rules above
            </li>
            <li>Opt out of marketing communications at any time</li>
            <li>Disconnect a connected Google account at any time</li>
            <li>Block cookies in your browser settings</li>
          </ul>
          <p className={P}>
            If you booked an appointment or a stay with a business that uses
            Bapita, contact that business first — it is their record. We will
            help them action it. To exercise any of these rights with us
            directly, email{" "}
            <a href="mailto:info.bapita@gmail.com" className={A}>
              info.bapita@gmail.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className={H2}>Children</h2>
          <p className={P}>
            Bapita is a tool for businesses and is not directed at children. We
            do not knowingly collect data from anyone under 16. If a booking was
            made for a child by a parent or guardian, that record belongs to the
            business it was made with.
          </p>
        </section>

        <section>
          <h2 className={H2}>Changes to this policy</h2>
          <p className={P}>
            We may update this privacy policy from time to time. If we make
            material changes, we&apos;ll notify you by email or a prominent
            notice on our website. Your continued use of our services means you
            accept the updated policy.
          </p>
        </section>

        <section>
          <h2 className={H2}>Questions?</h2>
          <p className={P}>
            If you have any questions about our privacy practices, please
            contact us at{" "}
            <a href="mailto:info.bapita@gmail.com" className={A}>
              info.bapita@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
