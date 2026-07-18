import { Link } from 'react-router-dom';

const highlights = [
  {
    id: 1,
    topic: 'Business',
    title: 'Markets & trading foundations',
    image: 'https://i.pinimg.com/736x/90/a3/bc/90a3bc59e3f92890f4c251c9d79559ae.jpg',
    href: '/courses',
  },
  {
    id: 2,
    topic: 'Development',
    title: 'Build practical tech skills',
    image: 'https://i.pinimg.com/736x/22/ff/c3/22ffc3a863846e2d265dc4f6ac994abd.jpg',
    href: '/courses',
  },
  {
    id: 3,
    topic: 'Design',
    title: 'Learn with clear structure',
    image: 'https://i.pinimg.com/736x/06/98/6a/06986a1609bd2fcbd8cb047c789738d0.jpg',
    href: '/courses',
  },
];

export default function Courses() {
  return (
    <section className="bg-white pt-16 pb-12 sm:pt-20 sm:pb-16 md:pt-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-[#0B1F44] sm:text-3xl md:text-4xl">
            Trending on Quick X
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500 sm:text-base">
            A snapshot of what learners are opening right now—browse the full catalog anytime.
          </p>
        </div>

        <div className="mt-8 grid gap-5 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {highlights.map((item) => (
            <Link
              key={item.id}
              to={item.href}
              className="group relative block aspect-[16/10] overflow-hidden rounded-2xl bg-slate-100 shadow-[0_8px_30px_rgba(15,23,42,0.08)] ring-1 ring-black/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(15,23,42,0.12)]"
              aria-label={`${item.topic}: ${item.title}`}
            >
              <img
                src={item.image}
                alt=""
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <span className="absolute left-3 top-3 rounded-md bg-teal-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm sm:left-4 sm:top-4">
                {item.topic}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
