import { Link } from 'react-router-dom';

export default function Call() {
  return (
    <section className="bg-[#F7F9FC]">
      <div className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-8 sm:py-20 md:py-24">
        <h2 className="text-[clamp(1.85rem,4.5vw,2.75rem)] font-bold leading-tight tracking-tight text-[#0B1F44]">
          Your next skill is one course away
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-500 sm:text-base">
          Search the catalog, compare what each course covers, and learn with instructors who break
          topics down clearly—whenever it fits your schedule.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/courses"
            className="inline-flex items-center justify-center rounded-xl bg-[#1B5EF5] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1552D6]"
          >
            Browse the catalog
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center justify-center rounded-xl border border-[#1B5EF5]/35 bg-transparent px-6 py-3 text-sm font-semibold text-[#1B5EF5] transition hover:border-[#1B5EF5] hover:bg-[#1B5EF5]/5"
          >
            Create an account
          </Link>
        </div>
      </div>
    </section>
  );
}
