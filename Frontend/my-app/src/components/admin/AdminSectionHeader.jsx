/** Page title block for admin sections rendered inside AdminLayout (light theme). */
export default function AdminSectionHeader({ title, description }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      {description ? <p className="mt-1 text-sm text-gray-600 max-w-3xl">{description}</p> : null}
    </div>
  );
}
