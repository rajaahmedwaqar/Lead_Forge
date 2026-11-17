import { Link } from 'react-router-dom';
import { useSeo } from '../lib/seo';
import { Logo } from '../components/ui';

export default function NotFoundPage() {
  useSeo({ title: 'Page not found | LeadForge', noindex: true });
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <Logo />
        <h1 className="mt-8 text-4xl font-extrabold">Page not found</h1>
        <p className="mt-2 text-ink/70">The page you are looking for does not exist or has moved.</p>
        <Link to="/" className="btn-primary mt-6">Back to home</Link>
      </div>
    </main>
  );
}
