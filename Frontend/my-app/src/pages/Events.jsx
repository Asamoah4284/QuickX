import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { formatCurrency } from '../utils/currencyStore';
import {
  FiCalendar,
  FiClock,
  FiMapPin,
  FiSearch,
  FiFilter,
  FiTag,
  FiArrowRight,
  FiUsers,
  FiCheckCircle,
  FiX,
  FiExternalLink,
  FiDownload,
  FiAward,
} from 'react-icons/fi';
import { FaTelegramPlane } from 'react-icons/fa';

const CATEGORIES = [
  'All',
  'Trading',
  'Tech',
  'Workshop',
  'Webinar',
  'Masterclass',
  'Conference',
];

const FORMATS = [
  { value: 'all', label: 'All Formats' },
  { value: 'online', label: 'Online / Virtual' },
  { value: 'in-person', label: 'In-Person' },
  { value: 'hybrid', label: 'Hybrid' },
];

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedFormat, setSelectedFormat] = useState('all');
  const [pricingFilter, setPricingFilter] = useState('all'); // 'all', 'free', 'paid'
  const [timeFilter, setTimeFilter] = useState('upcoming'); // 'upcoming', 'all', 'past'
  const [myTickets, setMyTickets] = useState([]);
  const [showMyTicketsModal, setShowMyTicketsModal] = useState(false);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [selectedTicketPass, setSelectedTicketPass] = useState(null);

  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('authToken');
  const isLoggedIn = Boolean(token);

  useEffect(() => {
    fetchEvents();
  }, [selectedCategory, selectedFormat, pricingFilter, timeFilter]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'All') params.append('category', selectedCategory);
      if (selectedFormat !== 'all') params.append('eventType', selectedFormat);
      if (pricingFilter === 'free') params.append('isFree', 'true');
      if (pricingFilter === 'paid') params.append('isFree', 'false');
      if (timeFilter !== 'all') params.append('timeFilter', timeFilter);
      if (search.trim()) params.append('search', search.trim());

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API_URL}/api/events?${params.toString()}`, { headers });
      setEvents(res.data?.events || []);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEvents();
  };

  const fetchMyTickets = async () => {
    if (!token) {
      navigate('/login', { state: { from: '/events' } });
      return;
    }
    setTicketsLoading(true);
    setShowMyTicketsModal(true);
    try {
      const res = await axios.get(`${API_URL}/api/events/my/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyTickets(res.data?.tickets || []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setTicketsLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return {
        month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
        day: d.toLocaleDateString('en-US', { day: '2-digit' }),
        weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
        full: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      };
    } catch {
      return { month: 'OCT', day: '15', weekday: 'Sat', full: 'Oct 15, 2026' };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 pt-20">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-[#07152f] text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(900px 400px at 15% 10%, rgba(27,94,245,0.4), transparent 60%), radial-gradient(700px 400px at 85% 90%, rgba(99,102,241,0.25), transparent 60%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-4 flex items-center gap-2 text-xs font-semibold text-blue-300">
            <Link to="/" className="hover:underline">Home</Link>
            <span className="text-white/40">/</span>
            <span className="text-white/90">Events &amp; Masterclasses</span>
          </nav>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-300 backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Sessions &amp; Masterclasses
              </span>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Learn Live. Build Live. Connect with Titans.
              </h1>
              <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
                Immerse yourself in live trading rooms, quant bootcamps, and developer summits. Connect directly with mentors and gain actionable real-market mastery.
              </p>
            </div>

            {isLoggedIn && (
              <button
                type="button"
                onClick={fetchMyTickets}
                className="inline-flex items-center gap-2.5 rounded-2xl bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20 border border-white/20 shadow-lg"
              >
                <FiAward className="h-5 w-5 text-amber-400" />
                <span>My Registered Tickets</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar Section */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search masterclasses, topics, venues, or speakers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-11 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 transition focus:border-[#1B5EF5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B5EF5]/20"
              />
            </div>

            <button
              type="submit"
              className="rounded-2xl bg-[#1B5EF5] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1552D6]"
            >
              Search
            </button>
          </form>

          {/* Quick filter row */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
            {/* Category pills */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1">
                Category:
              </span>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    selectedCategory === cat
                      ? 'bg-[#1B5EF5] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Time filters */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'all', label: 'All Dates' },
                { id: 'past', label: 'Past' },
              ].map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => setTimeFilter(tf.id)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                    timeFilter === tf.id
                      ? 'bg-white text-slate-900 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Format & Pricing dropdowns */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Format:</span>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm focus:border-[#1B5EF5] focus:outline-none"
              >
                {FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Price:</span>
              <select
                value={pricingFilter}
                onChange={(e) => setPricingFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm focus:border-[#1B5EF5] focus:outline-none"
              >
                <option value="all">All Prices</option>
                <option value="free">Free Only</option>
                <option value="paid">Paid Only</option>
              </select>
            </div>

            {(selectedCategory !== 'All' ||
              selectedFormat !== 'all' ||
              pricingFilter !== 'all' ||
              timeFilter !== 'upcoming' ||
              search) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setSelectedFormat('all');
                  setPricingFilter('all');
                  setTimeFilter('upcoming');
                  setSearch('');
                }}
                className="text-xs font-bold text-rose-600 hover:underline ml-auto"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        {/* Telegram Community Banner */}
        <div className="mt-6 rounded-2xl border border-sky-200/70 bg-gradient-to-r from-sky-50/90 via-blue-50/60 to-indigo-50/40 p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#229ED9] text-white shadow-sm">
                <FaTelegramPlane className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Never miss live trading workshops & free masterclasses</p>
                <p className="text-xs text-slate-600 mt-0.5">Get early invites, recordings, and VIP perks inside our 5,000+ member Telegram group.</p>
              </div>
            </div>
            <a
              href="https://t.me/quickxtrading"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#229ED9] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#1e8cc0] shrink-0"
            >
              <FaTelegramPlane className="h-3.5 w-3.5" />
              Join Community
            </a>
          </div>
        </div>
      </div>

      {/* Events Results Section */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-10">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm font-semibold text-slate-600">
            Showing <span className="font-bold text-slate-900">{events.length}</span> event
            {events.length === 1 ? '' : 's'}
          </p>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-3xl border border-slate-200 bg-white p-4 shadow-sm h-96 flex flex-col justify-between"
              >
                <div className="aspect-[16/10] bg-slate-200 rounded-2xl" />
                <div className="space-y-3 mt-4">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                  <div className="h-3 bg-slate-200 rounded w-full" />
                </div>
                <div className="h-10 bg-slate-200 rounded-xl mt-4" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-[#1B5EF5]">
              <FiCalendar className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">No events found</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
              We couldn't find any sessions matching your current filters. Try searching for a different keyword or resetting your filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('All');
                setSelectedFormat('all');
                setPricingFilter('all');
                setTimeFilter('all');
                setSearch('');
              }}
              className="mt-6 inline-flex rounded-xl bg-[#1B5EF5] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#1552D6]"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((evt) => {
              const dateObj = formatDate(evt.startDate);
              const spotsRemaining =
                evt.capacity > 0 ? Math.max(0, evt.capacity - (evt.ticketsSold || 0)) : 999;
              const isSoldOut = evt.capacity > 0 && (evt.ticketsSold || 0) >= evt.capacity;
              const primarySpeaker = evt.speakers?.[0];
              const userHasTicket = Boolean(evt.hasTicket);

              return (
                <article
                  key={evt._id}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[#1B5EF5]/40 hover:shadow-[0_16px_36px_rgba(27,94,245,0.12)]"
                >
                  {/* Media banner */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                    <img
                      src={
                        evt.coverImage ||
                        'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80'
                      }
                      alt={evt.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />

                    {/* Format pill */}
                    <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                      <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-800 shadow-sm backdrop-blur">
                        {evt.eventType === 'online'
                          ? '🌐 Live Online'
                          : evt.eventType === 'hybrid'
                          ? '⚡ Hybrid'
                          : '📍 In-Person'}
                      </span>
                      <span className="rounded-full bg-[#1B5EF5] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
                        {evt.category || 'Event'}
                      </span>
                    </div>

                    {userHasTicket && (
                      <div className="absolute top-3.5 right-3.5 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-md flex items-center gap-1">
                        <FiCheckCircle className="h-3.5 w-3.5" />
                        <span>Registered</span>
                      </div>
                    )}

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
                      <Link to={`/events/${evt._id}`}>{evt.title}</Link>
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

                    {/* Spots remaining progress */}
                    {evt.capacity > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-1">
                          <span>
                            {evt.ticketsSold || 0} / {evt.capacity} seats filled
                          </span>
                          <span className={spotsRemaining < 15 ? 'text-rose-600 font-bold' : ''}>
                            {spotsRemaining} spots left
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              spotsRemaining < 15 ? 'bg-rose-500' : 'bg-[#1B5EF5]'
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round(((evt.ticketsSold || 0) / evt.capacity) * 100)
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Footer: Price & CTA */}
                    <div className="mt-auto pt-5 border-t border-slate-100 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                          Price
                        </p>
                        <div className="text-base font-extrabold text-slate-900">
                          {evt.isFree || Number(evt.price) === 0 ? (
                            <span className="text-emerald-600 font-bold">Free</span>
                          ) : (
                            <span>{formatCurrency(Number(evt.price || 0))}</span>
                          )}
                        </div>
                      </div>

                      <Link
                        to={`/events/${evt._id}`}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-sm ${
                          userHasTicket
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : isSoldOut
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-[#1B5EF5] text-white hover:bg-[#1552D6]'
                        }`}
                      >
                        {userHasTicket
                          ? 'View Ticket Pass'
                          : isSoldOut
                          ? 'Sold Out'
                          : evt.isFree
                          ? 'Register Free'
                          : 'Get Ticket'}
                        <FiArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* My Tickets Drawer / Modal */}
      {showMyTicketsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1B5EF5] text-white">
                  <FiAward className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">My Registered Event Tickets</h3>
                  <p className="text-xs text-slate-500">Your confirmed registrations and event passes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMyTicketsModal(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 transition"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-4">
              {ticketsLoading ? (
                <p className="text-center text-sm text-slate-400 py-8">Loading your tickets...</p>
              ) : myTickets.length === 0 ? (
                <div className="text-center py-10">
                  <FiCalendar className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-700">No tickets found</p>
                  <p className="mt-1 text-xs text-slate-500">
                    You haven't registered for any events yet. Check out the upcoming events list!
                  </p>
                </div>
              ) : (
                myTickets.map((t) => (
                  <div
                    key={t._id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition"
                  >
                    <div>
                      <span className="inline-block rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1B5EF5] mb-1.5">
                        {t.ticketNumber}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                        {t.eventId?.title || 'QuickX Event'}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t.eventId?.startDate ? formatDate(t.eventId.startDate).full : ''} ·{' '}
                        {t.eventId?.time || '2:00 PM GMT'}
                      </p>
                      <p className="text-xs text-slate-600 mt-1 font-medium">
                        Attendee: {t.attendeeName} ({t.attendeeEmail})
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/events/${t.eventId?._id || t.eventId}`}
                        className="rounded-xl bg-[#1B5EF5] px-4 py-2 text-xs font-bold text-white hover:bg-[#1552D6] transition"
                      >
                        View Event
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
