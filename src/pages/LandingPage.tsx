import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Mail, MapPin, Search, ShieldCheck, Workflow } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useSeo } from '../lib/seo';
import { Logo, ThemeToggle } from '../components/ui';
import { Reveal, Typewriter } from '../components/landing';
import ProductPreview from '../components/ProductPreview';

const INDUSTRIES = ['Dentists', 'Barbers', 'Real Estate Agents', 'Gyms', 'Law Firms', 'Restaurants', 'Marketing Agencies'];

const features = [
  { icon: MapPin, title: 'Discover businesses', text: 'Search any keyword in any city. Get names, phones, ratings, websites and map pins in one list.' },
  { icon: Mail, title: 'Contact details found', text: 'LeadForge reads each business website for a contact email. You can add or correct addresses yourself.' },
  { icon: Workflow, title: 'Organize your pipeline', text: 'Move leads from New to Closed Won and keep notes and drafts with every business.' },
  { icon: BarChart3, title: 'Every search saved', text: 'Each search is its own session. Reopen any earlier one without results mixing together.' },
  { icon: Search, title: 'Outreach that sounds human', text: 'Draft with AI or your own template, preview it, and send through your Gmail without leaving the page.' },
  { icon: ShieldCheck, title: 'Private by design', text: 'Your leads belong to your account only. Other customers and search engines never see them.' },
];

const steps = [
  { n: '1', title: 'Search', text: 'Type who you want to reach and where. LeadForge gathers the businesses for you.' },
  { n: '2', title: 'Organize', text: 'Review them on the map and in the table, add notes and move each lead through your pipeline.' },
  { n: '3', title: 'Reach out', text: 'Draft a personal email and send it. The stage updates to Contacted automatically.' },
];

const navLink = 'hidden rounded-lg px-3 py-2 text-sm font-semibold text-ink/70 transition hover:bg-moss-light hover:text-ink md:inline-block';

export default function LandingPage() {
  useSeo({
    title: 'LeadForge | Find local business leads and send outreach',
    description: 'LeadForge finds local businesses on Google Maps, collects their contact details, tracks your pipeline and helps you write and send personalised outreach emails.',
  });
  const { profile } = useAuth();
  const home = profile?.role === 'admin' ? '/admin' : '/app';
  const cta = profile ? { to: home, label: 'Open dashboard' } : { to: '/login?mode=signup', label: 'Start Finding Leads' };

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-moss focus:px-4 focus:py-2 focus:text-moss-fg">Skip to content</a>

      <header className="sticky top-0 z-50 border-b border-line bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2.5">
          <Link to="/" aria-label="LeadForge home"><Logo /></Link>
          <nav aria-label="Main" className="flex items-center gap-1">
            <a href="#features" className={navLink}>Features</a>
            <a href="#how" className={navLink}>How it works</a>
            <a href="#preview" className={navLink}>Preview</a>
            <ThemeToggle />
            {!profile && <Link to="/login" className="btn-ghost hidden sm:inline-flex">Sign in</Link>}
            <Link to={cta.to} className="btn-primary">{profile ? cta.label : 'Get started'}</Link>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="mx-auto max-w-5xl px-4 pb-10 pt-16 text-center sm:pt-24">
          <h1 className="animate-fade-up text-5xl font-extrabold leading-[1.1] tracking-tight [animation-delay:80ms] sm:text-6xl lg:text-7xl">
            <span className="block">Find leads for</span>
            <Typewriter words={INDUSTRIES} />
          </h1>
          <p className="mx-auto mt-6 max-w-2xl animate-fade-up text-lg text-ink/65 [animation-delay:160ms] sm:text-xl">
            LeadForge helps you discover businesses, organize your prospects, and streamline outreach, all from one clean workspace.
          </p>
          <div className="mt-9 flex animate-fade-up flex-col items-center justify-center gap-3 [animation-delay:240ms] sm:flex-row">
            <Link to={cta.to} className="btn-primary px-7 py-3 text-base">{cta.label} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            <a href="#features" className="btn-outline px-7 py-3 text-base">Explore Features</a>
          </div>
        </section>

        <section id="preview" aria-label="Product preview" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-24">
          <Reveal><ProductPreview /></Reveal>
        </section>

        <section id="features" aria-labelledby="features-title" className="mx-auto max-w-7xl scroll-mt-16 px-4 pb-24">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <h2 id="features-title" className="text-3xl font-extrabold tracking-tight sm:text-4xl">Everything you need to prospect</h2>
            <p className="mt-3 text-ink/65">From first search to sent email, in one place.</p>
          </Reveal>
          <ul className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="bg-surface p-7 transition hover:bg-moss-light/60">
                <Reveal delay={(i % 3) * 80}>
                  <span className="mb-4 grid h-10 w-10 place-items-center rounded-lg border border-line bg-paper text-moss"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                  <h3 className="text-lg font-extrabold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/65">{text}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>

        <section id="how" aria-labelledby="how-title" className="mx-auto max-w-5xl scroll-mt-16 px-4 pb-24">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <h2 id="how-title" className="text-3xl font-extrabold tracking-tight sm:text-4xl">How it works</h2>
          </Reveal>
          <ol className="grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.n}>
                <Reveal delay={i * 100}>
                  <span className="mb-4 grid h-9 w-9 place-items-center rounded-full bg-moss text-sm font-extrabold text-moss-fg">{s.n}</span>
                  <h3 className="text-xl font-extrabold">{s.title}</h3>
                  <p className="mt-2 text-ink/65">{s.text}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="cta-title" className="mx-auto max-w-5xl px-4 pb-24">
          <Reveal>
            <div className="rounded-3xl bg-ink px-6 py-14 text-center text-paper sm:px-12">
              <h2 id="cta-title" className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ready to find your next customers?</h2>
              <p className="mx-auto mt-3 max-w-xl opacity-75">Create an account and run your first search in a couple of minutes.</p>
              <Link to={cta.to} className="btn mt-8 bg-paper px-7 py-3 text-base text-ink hover:opacity-90">{cta.label} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-line py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-sm text-ink/60 sm:flex-row">
          <Logo className="!text-base" />
          <p>&copy; {new Date().getFullYear()} LeadForge. Lead data is private to each account.</p>
        </div>
      </footer>
    </div>
  );
}
