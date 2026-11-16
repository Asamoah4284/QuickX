import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Container, Eyebrow } from '../../ui/primitives';
import { LEGAL } from '../../lib/legal';

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-fg">{title}</h2>
      <div className="space-y-3 leading-relaxed text-fg-muted">{children}</div>
    </section>
  );
}

function List({ items }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item) => (
        <li key={typeof item === 'string' ? item : item.key}>{item}</li>
      ))}
    </ul>
  );
}

export default function Privacy() {
  return (
    <>
      <Helmet>
        <title>Privacy policy | QuickX</title>
        <meta name="description" content="How QuickX Learn collects, uses and protects your personal information, on the website and in the app." />
      </Helmet>
      <Container className="max-w-3xl space-y-10 py-12 sm:py-16">
        <header>
          <Eyebrow>Legal</Eyebrow>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">Privacy policy</h1>
          <p className="mt-3 text-sm text-fg-subtle">Last updated {LEGAL.updated}</p>
          <p className="mt-5 leading-relaxed text-fg-muted">
            This policy explains what personal information {LEGAL.company} (&quot;we&quot;) collects when you use the QuickX Learn
            website ({LEGAL.site}) and the QuickX Learn app for Android and iPhone, why we collect it, who we share it with and the
            choices you have. We are based in {LEGAL.country}.
          </p>
        </header>

        <Section title="What we collect">
          <p>Information you give us:</p>
          <List
            items={[
              'Account details: your name, email address, phone number, country and password (stored scrambled, never in plain text).',
              'A profile photo, if you add one.',
              'What you post in the community: posts, comments, questions, answers, pictures and private messages.',
              'Mentorship requests: the date, time and topic you choose.',
              'Event registrations: the name, email and phone number you enter.',
              'Your Mobile Money number and network, when you ask for a withdrawal.',
              'Delivery details, when you order a hardcopy book.',
            ]}
          />
          <p>Information created when you use the service:</p>
          <List
            items={[
              'Purchases and plans: what you bought, when, the amount and the payment reference.',
              'Wallet activity: Pie deposits and payouts, refunds, referral earnings and withdrawals.',
              'Course progress: lessons you watched or finished.',
              'A notification token for your phone or browser, if you allow notifications.',
              'Basic technical information needed to run the service safely, such as your IP address in server logs.',
            ]}
          />
          <p>
            We do <strong className="text-fg">not</strong> collect or store your card number or Mobile Money PIN. Payments are handled
            by Paystack.
          </p>
        </Section>

        <Section title="How we use it">
          <List
            items={[
              'To create and run your account, and let you sign in.',
              'To give you what you paid for: courses, signals, the community, mentorship, books, event tickets and Pies.',
              'To process payments, payouts, refunds and withdrawals, and to keep the financial records the law requires.',
              'To send you notifications you asked for, such as new signals, replies and payouts, and service messages such as sign-in codes and receipts.',
              'To keep the community safe: dealing with reports, spam and abuse.',
              'To answer you when you contact us.',
              'To understand which website pages are used, so we can improve them (see "Cookies and analytics").',
            ]}
          />
          <p>We do not sell your personal information. We do not show ads in the app.</p>
        </Section>

        <Section title="Who can see what">
          <List
            items={[
              'Other members can see your name, profile photo and what you post in the community. Private messages are only seen by the people in the conversation.',
              'In a Pie, other members see a short version of your name and your share. The mentor sees your full name and amount.',
              'The mentor and our team can see your account, purchases and bookings to provide the service and support you.',
            ]}
          />
        </Section>

        <Section title="Services we use">
          <p>We share only what each service needs to do its job:</p>
          <List
            items={[
              'Paystack: card and Mobile Money payments.',
              'Moolre: sending sign-in codes by SMS and earlier Mobile Money payments.',
              'SendGrid: sending emails such as sign-in codes and receipts.',
              'Amazon Web Services (S3 and CloudFront): storing and delivering videos, pictures and files.',
              'Our database and server hosting providers: storing your account and activity.',
              'Expo, Google Firebase Cloud Messaging and Apple Push Notification service: delivering notifications to your phone.',
              'Vercel Analytics and Meta Pixel: measuring visits to the website (see below).',
            ]}
          />
          <p>
            Some of these providers store data outside {LEGAL.country}. We use providers that protect data with industry
            standard security. We may also share information when the law requires it, or to protect our members or the
            service from fraud or harm.
          </p>
        </Section>

        <Section title="Cookies and analytics">
          <p>
            The website stores your sign-in on your device so you stay signed in. It uses Vercel Analytics to count page visits,
            and Meta Pixel on some book store pages to measure our Facebook and Instagram adverts. Meta may use this with
            information it already has about you, under its own privacy policy. The app does not use advertising trackers.
          </p>
        </Section>

        <Section title="How long we keep it">
          <List
            items={[
              'Your account information: for as long as you have an account.',
              'Payment, wallet and withdrawal records: for as long as tax and accounting law requires, even after you delete your account. They are no longer linked to your name or contact details.',
              'Server logs: for a short period, for security.',
            ]}
          />
        </Section>

        <Section title="Deleting your account">
          <p>
            You can delete your account at any time in the app (Account, then Delete account) or on the website. See{' '}
            <Link to="/delete-account" className="font-semibold text-brand-300 hover:underline">
              how to delete your account
            </Link>{' '}
            for exactly what is removed and what is kept.
          </p>
        </Section>

        <Section title="Your choices and rights">
          <List
            items={[
              'See and correct your details on your account page.',
              'Turn notifications off in your phone or browser settings.',
              'Ask us for a copy of your information, or ask us to correct or delete it.',
              `Complain to the Data Protection Commission of ${LEGAL.country} if you think we have handled your information wrongly.`,
            ]}
          />
        </Section>

        <Section title="Security">
          <p>
            Information travels over encrypted connections (HTTPS). Passwords are stored scrambled. Access to member
            information is limited to the people who need it to run the service. No system is perfectly secure, so please use a
            strong password and keep your phone locked.
          </p>
        </Section>

        <Section title="Children">
          <p>
            QuickX is for adults aged 18 and over, because it involves trading with real money. We do not knowingly collect
            information from anyone under 18. If you think a child has an account, contact us and we will delete it.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            If we change this policy, we will update the date at the top. If the change is important, we will also tell you in the
            app or by email.
          </p>
        </Section>

        <Section title="Contact us">
          <p>
            Email{' '}
            <a href={`mailto:${LEGAL.supportEmail}`} className="font-semibold text-brand-300 hover:underline">
              {LEGAL.supportEmail}
            </a>{' '}
            or message us on WhatsApp at{' '}
            <a href={LEGAL.whatsappUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand-300 hover:underline">
              {LEGAL.whatsappNumber}
            </a>
            .
          </p>
        </Section>
      </Container>
    </>
  );
}
