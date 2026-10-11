import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FiCalendar, FiClock, FiMapPin, FiArrowRight, FiUsers, FiTag } from 'react-icons/fi';

const FALLBACK_EVENTS = [
  {
    _id: 'sample-1',
    title: 'Forex Price Action Masterclass: Live Scalping & Liquidity',
    shortDescription: 'Master institutional liquidity concepts, order blocks, and high-probability scalping strategies with senior QuickX traders.',
    category: 'Trading',
    eventType: 'online',
    venue: 'Virtual (Zoom Live Stream)',
    startDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    time: '6:30 PM GMT',
    coverImage: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80',
    isFree: true,
    price: 0,
    capacity: 300,
    ticketsSold: 42,
    speakers: [{ name: 'Kofi Mensah', title: 'Head of Technical Analysis' }]
  },
  {
    _id: 'sample-2',
    title: 'Algorithmic & AI Trading Intensive 2026',
    shortDescription: 'Build, backtest, and automate algorithmic trading models using Python, Pine Script, and AI indicators.',
    category: 'Workshop',
    eventType: 'online',
    venue: 'Virtual (Google Meet)',
    startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    time: '10:00 AM GMT',
    coverImage: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=800&q=80',
    isFree: false,
    price: 150,
    capacity: 100,
    ticketsSold: 18,
    speakers: [{ name: 'Dr. Kwame Addo', title: 'Quant Finance Lead' }]
  },
  {
    _id: 'sample-3',
    title: 'Accra Tech & Web3 Developers Summit',
    shortDescription: 'The premier annual gathering of African builders, fintech architects, and web3 creators.',
    category: 'Conference',
    eventType: 'hybrid',
    venue: 'Accra Digital Centre, Accra',
    startDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
    time: '9:00 AM GMT',
    coverImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
    isFree: false,
    price: 250,
    capacity: 250,
    ticketsSold: 64,
    speakers: [{ name: 'Nana Yaw Osei', title: 'Principal Architect' }]
  }
];

export default function HomeEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${API_URL}/api/events?limit=3&timeFilter=upcoming`)
      .then((res) => {
        if (!cancelled) {
          const list = res.data?.events;
          if (Array.isArray(list) && list.length > 0) {
            setEvents(list.slice(0, 3));
          } else {
            setEvents(FALLBACK_EVENTS);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setEvents(FALLBACK_EVENTS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [API_URL]);

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return {
        month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
        day: d.toLocaleDateString('en-US', { day: '2-digit' }),
        weekday: d.toLocaleDateString('en-US', { weekday: 'short' })
      };
    } catch {
      return { month: 'OCT', day: '15', weekday: 'Sat' };
    }
  };

  return (
    <section className="relative overflow-hidden border-b border-slate-200/80 bg-slate-50/60 py-16 sm:py-24">
      {/* Decorative gradient glow */}
      <div
        className="pointer-events-none absolute -top-40 right-0 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-40 left-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        {/* Section Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#1B5EF5]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1B5EF5] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1B5EF5]" />
              </span>
              Live Sessions &amp; Summits
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0B1F44] sm:text-4xl">
              Upcoming Events &amp; Masterclasses
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Interactive live market rooms, hands-on developer masterclasses, and in-person summits. Reserve your seat before capacity is reached.
            </p>
          </div>

          <Link
            to="/events"
            className="group inline-flex items-center gap-2 self-start rounded-2xl bg-[#0B1F44] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1B5EF5] sm:self-auto"
          >
            <span>Explore all events</span>
            <FiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Events Grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((evt) => {
            const dateObj = formatDate(evt.startDate);
            const spotsRemaining =
              evt.capacity > 0 ? Math.max(0, evt.capacity - (evt.ticketsSold || 0)) : 999;
            const isSoldOut = evt.capacity > 0 && (evt.ticketsSold || 0) >= evt.capacity;
            const primarySpeaker = evt.speakers?.[0];

            return (
              <article
                key={evt._id}
                className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[#1B5EF5]/40 hover:shadow-[0_16px_36px_rgba(27,94,245,0.12)]"
              >
                {/* Media banner */}
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  <img
                    src={evt.coverImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80'}
                    alt={evt.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />

                  {/* Format pill */}
                  <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                    <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-800 shadow-sm backdrop-blur">
                      {evt.eventType === 'online' ? '🌐 Live Online' : evt.eventType === 'hybrid' ? '⚡ Hybrid' : '📍 In-Person'}
                    </span>
                    <span className="rounded-full bg-[#1B5EF5] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
                      {evt.category || 'Event'}
                    </span>
                  </div>

                  {/* Date badge */}
                  <div className="absolute bottom-3.5 left-3.5 flex items-center gap-2 rounded-2xl bg-white/95 px-3 py-1.5 shadow-md backdrop-blur">
                    <div className="text-center leading-none">
                      <span className="block text-[10px] font-extrabold uppercase text-[#1B5EF5]">
                        {dateObj.month}
                      </span>
                      <span className="block text-base font-black text-slate-900">
                        {dateObj.day}
                      </span>
                    </div>
                    <div className="border-l border-slate-200 pl-2 text-left">
                      <span className="block text-[11px] font-semibold text-slate-700">
                        {dateObj.weekday}
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        {evt.time || '2:00 PM GMT'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="line-clamp-2 text-lg font-bold leading-snug text-slate-900 group-hover:text-[#1B5EF5] transition-colors">
                    <Link to={`/events/${evt._id}`}>
                      {evt.title}
                    </Link>
                  </h3>

                  <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-slate-600">
                    {evt.shortDescription || evt.description}
                  </p>

                  {/* Speaker and venue metadata */}
                  <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
                    {primarySpeaker && (
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-[#1B5EF5]">
                          {primarySpeaker.name?.charAt(0) || 'S'}
                        </div>
                        <span className="font-medium text-slate-800 truncate">
                          {primarySpeaker.name}
                        </span>
                        {primarySpeaker.title && (
                          <span className="text-slate-400 truncate">· {primarySpeaker.title}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-slate-500 truncate">
                      <FiMapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{evt.venue || 'Virtual Platform'}</span>
                    </div>
                  </div>

                  {/* Footer: Price & CTA */}
                  <div className="mt-auto pt-5 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                        Access
                      </p>
                      <div className="text-base font-extrabold text-slate-900">
                        {evt.isFree || Number(evt.price) === 0 ? (
                          <span className="text-emerald-600 font-bold">Free</span>
                        ) : (
                          <span>GH₵{Number(evt.price).toFixed(2)}</span>
                        )}
                      </div>
                    </div>

                    <Link
                      to={`/events/${evt._id}`}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-sm ${
                        isSoldOut
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-[#1B5EF5] text-white hover:bg-[#1552D6]'
                      }`}
                    >
                      {isSoldOut ? 'Sold out' : evt.isFree ? 'Register Free' : 'Get Ticket'}
                      <FiArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Bottom Banner */}
        <div className="mt-12 rounded-3xl border border-blue-200/60 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-white p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1B5EF5] text-white shadow-md shadow-blue-500/20">
              <FiCalendar className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">
                Want to host a workshop or masterclass on QuickX?
              </h4>
              <p className="text-xs text-slate-600">
                Approved creators and industry leaders can schedule, ticket, and broadcast sessions to thousands of eager students.
              </p>
            </div>
          </div>
          <Link
            to="/creator/onboarding"
            className="shrink-0 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-[#0B1F44] ring-1 ring-slate-200 shadow-sm transition hover:bg-slate-50"
          >
            Apply as Host / Creator
          </Link>
        </div>
      </div>
    </section>
  );
}
