import { Link } from 'react-router-dom';

const links = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/tutors/applications', label: 'Tutor applications' },
  { to: '/admin/courses/review-queue', label: 'Course review queue' },
  { to: '/admin/platform/settings', label: 'Platform settings' },
];

export default function AdminPageShell({ title, description, children }) {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 text-white">
          <p className="text-sm text-blue-300">Admin control panel</p>
          <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">{description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {links.map((link) => (
              <Link key={link.to} to={link.to} className="rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-200">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
