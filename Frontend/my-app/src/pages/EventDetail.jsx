import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiCalendar,
  FiClock,
  FiMapPin,
  FiShare2,
  FiCheckCircle,
  FiArrowLeft,
  FiUsers,
  FiShield,
  FiVideo,
  FiDollarSign,
  FiPhone,
  FiMail,
  FiPrinter,
  FiExternalLink,
  FiX,
  FiAward,
} from 'react-icons/fi';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [showPassModal, setShowPassModal] = useState(false);
  const [confirmedTicket, setConfirmedTicket] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form state
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [attendeePhone, setAttendeePhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('momo'); // 'momo', 'direct'
  const [network, setNetwork] = useState('MTN');
  const [momoNumber, setMomoNumber] = useState('');

  const token = localStorage.getItem('authToken');
  const userStr = localStorage.getItem('user');

  useEffect(() => {
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setAttendeeName(u.fullName || '');
        setAttendeeEmail(u.email || '');
        setAttendeePhone(u.phone || '');
        setMomoNumber(u.phone || '');
      } catch {
        // ignore
      }
    }
  }, [userStr]);

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API_URL}/api/events/${id}`, { headers });
      setEvent(res.data?.event || null);
      if (res.data?.event?.ticket) {
        setConfirmedTicket(res.data.event.ticket);
      }
    } catch (err) {
      console.error('Error fetching event details:', err);
      setError(err.response?.data?.message || 'Failed to load event details.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleRegisterFree = async (e) => {
    e.preventDefault();
    if (!token) {
      navigate('/login', { state: { from: `/events/${id}` } });
      return;
    }

    setSubmitting(true);
    setError('');
    setActionSuccess('');

    try {
      const res = await axios.post(
        `${API_URL}/api/events/${id}/register`,
        {
          attendeeName,
          attendeeEmail,
          attendeePhone,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setActionSuccess('Registration confirmed! Your seat is reserved.');
      setConfirmedTicket(res.data.ticket);
      setEvent(res.data.event);
      setShowPassModal(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBuyTicket = async (e) => {
    e.preventDefault();
    if (!token) {
      navigate('/login', { state: { from: `/events/${id}` } });
      return;
    }

    setSubmitting(true);
    setError('');
    setActionSuccess('');

    try {
      const res = await axios.post(
        `${API_URL}/api/events/${id}/buy-ticket`,
        {
          attendeeName,
          attendeeEmail,
          attendeePhone: momoNumber || attendeePhone,
          paymentMethod,
          momoNumber,
          network,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setActionSuccess('Ticket purchased successfully! Your pass is confirmed.');
      setConfirmedTicket(res.data.ticket);
      setEvent(res.data.event);
      setShowPassModal(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Ticket purchase failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return {
        month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
        day: d.toLocaleDateString('en-US', { day: '2-digit' }),
        weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
        full: d.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
      };
    } catch {
      return { month: 'OCT', day: '15', weekday: 'Saturday', full: 'Saturday, October 15, 2026' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-28 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#1B5EF5]" />
          <p className="mt-4 text-sm font-semibold text-slate-500">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-slate-50 pt-28 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-3xl bg-white p-8 text-center shadow-lg border border-slate-100">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <FiX className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">Event Not Found</h2>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">{error}</p>
          <Link
            to="/events"
            className="mt-6 inline-flex rounded-xl bg-[#1B5EF5] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#1552D6]"
          >
            Back to All Events
          </Link>
        </div>
      </div>
    );
  }

  const dateObj = formatDate(event.startDate);
  const spotsRemaining =
    event.capacity > 0 ? Math.max(0, event.capacity - (event.ticketsSold || 0)) : 999;
  const isSoldOut = event.capacity > 0 && (event.ticketsSold || 0) >= event.capacity;
  const hasTicket = Boolean(event.hasTicket || confirmedTicket);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 pt-20">
      {/* Top Breadcrumb & Share Nav */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link
            to="/events"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#1B5EF5] transition"
          >
            <FiArrowLeft className="h-4 w-4" />
            <span>Back to All Events</span>
          </Link>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <FiShare2 className="h-3.5 w-3.5 text-slate-500" />
            <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Hero Banner with Cover Photo */}
      <div className="relative overflow-hidden bg-[#07152f] text-white">
        <div className="absolute inset-0 opacity-25">
          <img
            src={
              event.coverImage ||
              'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80'
            }
            alt=""
            className="h-full w-full object-cover blur-sm scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07152f] via-[#07152f]/90 to-[#07152f]/70" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-300 backdrop-blur border border-white/10">
              {event.eventType === 'online'
                ? '🌐 Live Online Stream'
                : event.eventType === 'hybrid'
                ? '⚡ Hybrid Experience'
                : '📍 In-Person Gathering'}
            </span>
            <span className="rounded-full bg-[#1B5EF5] px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
              {event.category || 'Masterclass'}
            </span>
            {hasTicket && (
              <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm flex items-center gap-1.5">
                <FiCheckCircle className="h-3.5 w-3.5" />
                <span>You're Attending</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl max-w-4xl leading-tight">
            {event.title}
          </h1>

          <p className="mt-4 text-base text-slate-300 max-w-3xl leading-relaxed">
            {event.shortDescription}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-slate-300 border-t border-white/10 pt-6">
            <div className="flex items-center gap-2">
              <FiCalendar className="h-4 w-4 text-blue-400" />
              <span className="font-semibold text-white">{dateObj.full}</span>
            </div>
            <div className="flex items-center gap-2">
              <FiClock className="h-4 w-4 text-blue-400" />
              <span>{event.time || '2:00 PM GMT'}</span>
            </div>
            <div className="flex items-center gap-2">
              <FiMapPin className="h-4 w-4 text-blue-400" />
              <span>{event.venue || 'Virtual Meeting'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Content (Left) + Booking Sticky Sidebar (Right) */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-12">
          {/* Left Column: Event Overview & Content */}
          <div className="space-y-8">
            {/* Banner preview card */}
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <img
                src={
                  event.coverImage ||
                  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80'
                }
                alt={event.title}
                className="w-full aspect-[21/9] object-cover"
              />
            </div>

            {/* About / Description Section */}
            <section className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">
                About this Event
              </h2>
              <div className="mt-6 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap font-sans">
                {event.description}
              </div>

              {event.tags && event.tags.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-2 pt-6 border-t border-slate-100">
                  {event.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Speakers Section */}
            {event.speakers && event.speakers.length > 0 && (
              <section className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">
                  Featured Speakers &amp; Mentors
                </h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  {event.speakers.map((spk, idx) => (
                    <div
                      key={spk._id || idx}
                      className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition hover:bg-white hover:shadow-sm"
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1B5EF5] to-indigo-600 text-lg font-bold text-white shadow-md">
                        {spk.name?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{spk.name}</h4>
                        <p className="text-xs font-semibold text-[#1B5EF5] mt-0.5">{spk.title}</p>
                        {spk.bio && (
                          <p className="text-xs text-slate-500 mt-2 leading-relaxed">{spk.bio}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Venue & Platform Access Info */}
            <section className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">
                Location &amp; Access Details
              </h2>
              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1B5EF5]">
                    {event.eventType === 'online' ? (
                      <FiVideo className="h-5 w-5" />
                    ) : (
                      <FiMapPin className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {event.eventType === 'online' ? 'Virtual Broadcast Platform' : 'Physical Venue'}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">{event.venue}</p>
                    {event.location && (
                      <p className="text-xs text-slate-500 mt-1">{event.location}</p>
                    )}
                  </div>
                </div>

                {/* Meeting Link status */}
                {event.eventType !== 'in-person' && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 mt-4">
                    {hasTicket && event.meetingLink ? (
                      <div>
                        <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                          <FiCheckCircle className="h-4 w-4 text-emerald-600" />
                          <span>Meeting link unlocked for registered attendee:</span>
                        </p>
                        <a
                          href={event.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[#1B5EF5] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#1552D6]"
                        >
                          <span>Join Live Stream Room</span>
                          <FiExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        🔒 The private live stream link &amp; webinar access pass will be sent to your email and accessible here once your ticket is confirmed.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Organizer details */}
            <section className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">
                Hosted by
              </h2>
              <div className="mt-5 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    {event.organizer?.name || 'QuickX Learning'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official QuickX Educational Department
                  </p>
                  <p className="text-xs text-slate-600 mt-2 flex items-center gap-2">
                    <FiMail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{event.organizer?.email || 'events@quickxlearn.com'}</span>
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Sticky Booking / Checkout Card */}
          <div>
            <div className="sticky top-24 rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
              {/* Pricing pill */}
              <div className="flex items-baseline justify-between border-b border-slate-100 pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Ticket Pass
                  </p>
                  <div className="mt-1 text-2xl font-black text-slate-900">
                    {event.isFree || Number(event.price) === 0 ? (
                      <span className="text-emerald-600">FREE</span>
                    ) : (
                      <span>GH₵{Number(event.price).toFixed(2)}</span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                      isSoldOut
                        ? 'bg-rose-100 text-rose-700'
                        : spotsRemaining < 20
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-[#1B5EF5]'
                    }`}
                  >
                    {isSoldOut ? 'Sold out' : `${spotsRemaining} spots left`}
                  </span>
                </div>
              </div>

              {/* Status alerts */}
              {actionSuccess && (
                <div className="mt-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-semibold text-emerald-800">
                  {actionSuccess}
                </div>
              )}
              {error && (
                <div className="mt-4 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-800">
                  {error}
                </div>
              )}

              {/* Booking States */}
              {hasTicket ? (
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-center">
                    <FiCheckCircle className="mx-auto h-8 w-8 text-emerald-600" />
                    <h4 className="mt-2 text-sm font-bold text-emerald-900">
                      You Have a Confirmed Ticket!
                    </h4>
                    <p className="mt-1 text-xs text-emerald-700 font-mono font-semibold">
                      #{confirmedTicket?.ticketNumber || event.myTicketNumber || 'QX-EVT-CONFIRMED'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPassModal(true)}
                    className="w-full rounded-2xl bg-[#0B1F44] py-3.5 text-xs font-bold text-white shadow-sm hover:bg-[#1B5EF5] transition flex items-center justify-center gap-2"
                  >
                    <FiAward className="h-4 w-4" />
                    <span>View Digital Ticket Pass</span>
                  </button>
                </div>
              ) : isSoldOut ? (
                <div className="mt-6 rounded-2xl bg-slate-100 p-4 text-center">
                  <p className="text-sm font-bold text-slate-700">Capacity Reached</p>
                  <p className="mt-1 text-xs text-slate-500">
                    All seats for this session are currently booked. Stay tuned for future editions.
                  </p>
                </div>
              ) : !token ? (
                <div className="mt-6 space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Sign in to your QuickX account to claim your ticket or register in seconds.
                  </p>
                  <Link
                    to="/login"
                    state={{ from: `/events/${id}` }}
                    className="block w-full rounded-2xl bg-[#1B5EF5] py-3.5 text-center text-xs font-bold text-white shadow-sm hover:bg-[#1552D6] transition"
                  >
                    Log In to Register
                  </Link>
                  <Link
                    to="/register"
                    state={{ from: `/events/${id}` }}
                    className="block w-full rounded-2xl border border-slate-200 bg-white py-3 text-center text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Create Free Account
                  </Link>
                </div>
              ) : event.isFree ? (
                /* Free Registration Form */
                <form onSubmit={handleRegisterFree} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={attendeeName}
                      onChange={(e) => setAttendeeName(e.target.value)}
                      placeholder="e.g. Ama Osei"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#1B5EF5] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={attendeeEmail}
                      onChange={(e) => setAttendeeEmail(e.target.value)}
                      placeholder="ama@example.com"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#1B5EF5] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Phone Number (optional)
                    </label>
                    <input
                      type="tel"
                      value={attendeePhone}
                      onChange={(e) => setAttendeePhone(e.target.value)}
                      placeholder="+233 55 000 0000"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#1B5EF5] focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-2xl bg-[#1B5EF5] py-3.5 text-xs font-bold text-white shadow-md hover:bg-[#1552D6] transition disabled:opacity-50"
                  >
                    {submitting ? 'Registering...' : 'Confirm Free Seat'}
                  </button>
                </form>
              ) : (
                /* Paid Checkout Form */
                <form onSubmit={handleBuyTicket} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Attendee Name
                    </label>
                    <input
                      type="text"
                      required
                      value={attendeeName}
                      onChange={(e) => setAttendeeName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#1B5EF5] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Attendee Email
                    </label>
                    <input
                      type="email"
                      required
                      value={attendeeEmail}
                      onChange={(e) => setAttendeeEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#1B5EF5] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('momo')}
                        className={`rounded-xl border p-2.5 text-xs font-bold text-center transition ${
                          paymentMethod === 'momo'
                            ? 'border-[#1B5EF5] bg-blue-50 text-[#1B5EF5]'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Mobile Money
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('direct')}
                        className={`rounded-xl border p-2.5 text-xs font-bold text-center transition ${
                          paymentMethod === 'direct'
                            ? 'border-[#1B5EF5] bg-blue-50 text-[#1B5EF5]'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Card / Direct
                      </button>
                    </div>
                  </div>

                  {paymentMethod === 'momo' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Network
                        </label>
                        <select
                          value={network}
                          onChange={(e) => setNetwork(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#1B5EF5] focus:outline-none"
                        >
                          <option value="MTN">MTN Mobile Money</option>
                          <option value="Telecel">Telecel Cash</option>
                          <option value="AirtelTigo">AirtelTigo Money</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          MoMo Number
                        </label>
                        <input
                          type="tel"
                          required
                          value={momoNumber}
                          onChange={(e) => setMomoNumber(e.target.value)}
                          placeholder="024 123 4567"
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#1B5EF5] focus:outline-none"
                        />
                      </div>
                    </>
                  )}

                  <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 flex justify-between items-center">
                    <span>Total Due:</span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      GH₵{Number(event.price).toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-2xl bg-[#1B5EF5] py-3.5 text-xs font-bold text-white shadow-md hover:bg-[#1552D6] transition disabled:opacity-50"
                  >
                    {submitting ? 'Processing Payment...' : `Pay GH₵${Number(event.price).toFixed(2)} & Get Ticket`}
                  </button>
                </form>
              )}

              {/* Safety guarantee */}
              <div className="mt-6 flex items-center justify-center gap-2 border-t border-slate-100 pt-4 text-[11px] font-medium text-slate-400">
                <FiShield className="h-4 w-4 text-emerald-500" />
                <span>Verified QuickX Organizer &amp; Secure Checkout</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Digital Ticket Pass Modal */}
      {showPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-[#07152f] px-6 py-4 text-white">
              <div className="flex items-center gap-2">
                <img src="/logo.jpg" alt="QuickX" className="h-8 w-auto rounded-md object-contain" />
                <span className="text-xs font-bold tracking-wider uppercase text-blue-300">
                  Official Event Pass
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPassModal(false)}
                className="rounded-xl p-1.5 text-white/70 hover:bg-white/10 transition"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            {/* Boarding Pass Body */}
            <div className="p-6 bg-gradient-to-b from-white via-slate-50 to-blue-50/30">
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#1B5EF5]">
                      {event.category || 'Masterclass'}
                    </span>
                    <h3 className="mt-2 text-base font-black text-slate-900 leading-snug">
                      {event.title}
                    </h3>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Ticket ID</span>
                    <span className="font-mono text-xs font-extrabold text-[#1B5EF5] block">
                      {confirmedTicket?.ticketNumber || event.myTicketNumber || 'QX-EVT-7D29'}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Date</span>
                    <span className="font-bold text-slate-800">{dateObj.full}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Time</span>
                    <span className="font-bold text-slate-800">{event.time || '2:00 PM GMT'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Attendee</span>
                    <span className="font-bold text-slate-800">
                      {confirmedTicket?.attendeeName || attendeeName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Format</span>
                    <span className="font-bold text-slate-800 capitalize">
                      {event.eventType || 'Online'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Platform / Venue</span>
                  <span className="text-xs font-semibold text-slate-700">{event.venue}</span>
                </div>

                {/* QR Code Barcode Representation */}
                <div className="mt-6 flex flex-col items-center justify-center border-t-2 border-dashed border-slate-200 pt-5">
                  <div className="h-14 w-full bg-[repeating-linear-gradient(90deg,#0B1F44,#0B1F44_3px,transparent_3px,transparent_6px,#0B1F44_6px,#0B1F44_10px,transparent_10px,transparent_13px)] rounded opacity-80" />
                  <p className="mt-2 font-mono text-[11px] font-bold tracking-widest text-slate-500">
                    {confirmedTicket?.ticketNumber || event.myTicketNumber || 'QX-EVT-CONFIRMED'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm"
                >
                  <FiPrinter className="h-4 w-4" />
                  <span>Print / Save Pass</span>
                </button>

                {event.meetingLink && (
                  <a
                    href={event.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#1B5EF5] py-3 text-xs font-bold text-white hover:bg-[#1552D6] transition shadow-sm"
                  >
                    <FiVideo className="h-4 w-4" />
                    <span>Join Session Room</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
