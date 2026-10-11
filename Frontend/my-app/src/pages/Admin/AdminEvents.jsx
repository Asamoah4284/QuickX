import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FiCalendar,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiUsers,
  FiDollarSign,
  FiClock,
  FiMapPin,
  FiCheckCircle,
  FiX,
  FiSearch,
  FiFilter,
  FiVideo,
  FiEye,
} from 'react-icons/fi';

const PRESET_COVERS = [
  {
    name: 'Trading & Charts',
    url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'AI & Algorithmic',
    url: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Tech Conference',
    url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Crypto & Blockchain',
    url: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?auto=format&fit=crop&w=1200&q=80',
  },
];

const INITIAL_FORM = {
  title: '',
  description: '',
  shortDescription: '',
  category: 'Masterclass',
  eventType: 'online',
  venue: 'Virtual (Zoom / Google Meet)',
  location: '',
  meetingLink: '',
  startDate: '',
  time: '2:00 PM GMT',
  coverImage: PRESET_COVERS[0].url,
  isFree: false,
  price: 0,
  capacity: 150,
  status: 'published',
  speakerName: '',
  speakerTitle: '',
  speakerBio: '',
};

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    publishedEvents: 0,
    upcomingEvents: 0,
    totalTickets: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Attendees modal
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [selectedEventForAttendees, setSelectedEventForAttendees] = useState(null);
  const [attendeesList, setAttendeesList] = useState([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const adminToken = localStorage.getItem('adminToken');

  useEffect(() => {
    fetchEventsAndStats();
  }, [statusFilter]);

  const fetchEventsAndStats = async () => {
    setLoading(true);
    try {
      const headers = adminToken ? { Authorization: `Bearer ${adminToken}` } : {};

      // 1. Fetch events
      const res = await axios.get(`${API_URL}/api/events?status=${statusFilter}`, { headers });
      setEvents(res.data?.events || []);

      // 2. Fetch admin metrics
      const statsRes = await axios.get(`${API_URL}/api/events/admin/stats`, { headers });
      if (statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error('Error loading events for admin:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingEventId(null);
    // default date to tomorrow at 2:00 PM
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    const dateStr = tomorrow.toISOString().split('T')[0];
    setFormData({
      ...INITIAL_FORM,
      startDate: dateStr,
    });
    setFormError('');
    setShowFormModal(true);
  };

  const handleOpenEdit = (evt) => {
    setEditingEventId(evt._id);
    const primarySpeaker = evt.speakers?.[0];
    setFormData({
      title: evt.title || '',
      description: evt.description || '',
      shortDescription: evt.shortDescription || '',
      category: evt.category || 'Masterclass',
      eventType: evt.eventType || 'online',
      venue: evt.venue || '',
      location: evt.location || '',
      meetingLink: evt.meetingLink || '',
      startDate: evt.startDate ? new Date(evt.startDate).toISOString().split('T')[0] : '',
      time: evt.time || '2:00 PM GMT',
      coverImage: evt.coverImage || PRESET_COVERS[0].url,
      isFree: Boolean(evt.isFree),
      price: evt.price || 0,
      capacity: evt.capacity || 150,
      status: evt.status || 'published',
      speakerName: primarySpeaker?.name || '',
      speakerTitle: primarySpeaker?.title || '',
      speakerBio: primarySpeaker?.bio || '',
    });
    setFormError('');
    setShowFormModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      const payload = {
        title: formData.title,
        description: formData.description,
        shortDescription: formData.shortDescription,
        category: formData.category,
        eventType: formData.eventType,
        venue: formData.venue,
        location: formData.location,
        meetingLink: formData.meetingLink,
        startDate: formData.startDate,
        time: formData.time,
        coverImage: formData.coverImage,
        isFree: formData.isFree,
        price: formData.isFree ? 0 : Number(formData.price),
        capacity: Number(formData.capacity),
        status: formData.status,
        speakers: formData.speakerName
          ? [
              {
                name: formData.speakerName,
                title: formData.speakerTitle,
                bio: formData.speakerBio,
              },
            ]
          : [],
      };

      if (editingEventId) {
        await axios.put(`${API_URL}/api/events/${editingEventId}`, payload, { headers });
      } else {
        await axios.post(`${API_URL}/api/events`, payload, { headers });
      }

      setShowFormModal(false);
      fetchEventsAndStats();
    } catch (err) {
      console.error('Error saving event:', err);
      setFormError(err.response?.data?.message || 'Failed to save event.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      await axios.delete(`${API_URL}/api/events/${id}`, { headers });
      fetchEventsAndStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete event.');
    }
  };

  const handleViewAttendees = async (evt) => {
    setSelectedEventForAttendees(evt);
    setShowAttendeesModal(true);
    setAttendeesLoading(true);

    try {
      const headers = { Authorization: `Bearer ${adminToken}` };
      const res = await axios.get(`${API_URL}/api/events/${evt._id}/attendees`, { headers });
      setAttendeesList(res.data?.attendees || []);
    } catch (err) {
      console.error('Error loading attendees:', err);
    } finally {
      setAttendeesLoading(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.title?.toLowerCase().includes(q) ||
      e.venue?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      {/* Page Title & Top CTA */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Events Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create, schedule, ticket, and manage attendees for masterclasses, webinars, and summits.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#1B5EF5] px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-[#1552D6] transition"
        >
          <FiPlus className="h-4 w-4" />
          <span>Create New Event</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Events</span>
            <FiCalendar className="h-5 w-5 text-blue-500" />
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{stats.totalEvents}</p>
          <span className="text-[11px] text-slate-500">
            {stats.publishedEvents} active / published
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Upcoming Sessions</span>
            <FiClock className="h-5 w-5 text-indigo-500" />
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{stats.upcomingEvents}</p>
          <span className="text-[11px] text-emerald-600 font-semibold">Ready for bookings</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Tickets Sold</span>
            <FiUsers className="h-5 w-5 text-amber-500" />
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{stats.totalTickets}</p>
          <span className="text-[11px] text-slate-500">Confirmed attendees</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Event Revenue</span>
            <FiDollarSign className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">
            GH₵{Number(stats.totalRevenue).toFixed(2)}
          </p>
          <span className="text-[11px] text-slate-500">Paid ticket sales</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search by event title, category, or venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 py-2 text-xs text-slate-900 focus:border-[#1B5EF5] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm focus:border-[#1B5EF5] focus:outline-none"
          >
            <option value="all">All Events</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Events Table / Card List */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">Loading events...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center">
            <FiCalendar className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-base font-bold text-slate-800">No events found</h3>
            <p className="mt-1 text-xs text-slate-500">
              Get started by creating your first masterclass or workshop.
            </p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#1B5EF5] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#1552D6]"
            >
              <FiPlus className="h-4 w-4" />
              <span>Create Event</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-6">Event</th>
                  <th className="py-4 px-4">Date &amp; Time</th>
                  <th className="py-4 px-4">Price / Seats</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map((evt) => (
                  <tr key={evt._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3.5">
                        <img
                          src={
                            evt.coverImage ||
                            'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=400&q=80'
                          }
                          alt=""
                          className="h-12 w-16 rounded-xl object-cover shrink-0 shadow-sm"
                        />
                        <div className="min-w-0">
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-[#1B5EF5] uppercase">
                            {evt.category || 'Event'}
                          </span>
                          <h4 className="mt-1 text-sm font-bold text-slate-900 line-clamp-1">
                            {evt.title}
                          </h4>
                          <span className="text-[11px] text-slate-500 capitalize">
                            {evt.eventType} · {evt.venue || 'Virtual Platform'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-slate-700 whitespace-nowrap">
                      <span className="font-bold text-slate-900 block">
                        {evt.startDate
                          ? new Date(evt.startDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'TBD'}
                      </span>
                      <span className="text-slate-500 text-[11px]">{evt.time || '2:00 PM GMT'}</span>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-extrabold text-slate-900 block">
                        {evt.isFree || Number(evt.price) === 0 ? (
                          <span className="text-emerald-600">Free</span>
                        ) : (
                          `GH₵${Number(evt.price).toFixed(2)}`
                        )}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        {evt.ticketsSold || 0} / {evt.capacity || 150} seats
                      </span>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          evt.status === 'published'
                            ? 'bg-emerald-100 text-emerald-800'
                            : evt.status === 'draft'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {evt.status}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewAttendees(evt)}
                          title="View Attendees"
                          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:border-blue-400 hover:text-[#1B5EF5] transition shadow-sm"
                        >
                          <FiUsers className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(evt)}
                          title="Edit Event"
                          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:border-blue-400 hover:text-[#1B5EF5] transition shadow-sm"
                        >
                          <FiEdit2 className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(evt._id, evt.title)}
                          title="Delete Event"
                          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:border-rose-400 hover:text-rose-600 transition shadow-sm"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Event Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">
                {editingEventId ? 'Edit Event' : 'Create New Event'}
              </h3>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 transition"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="overflow-y-auto p-6 space-y-4">
              {formError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-semibold">
                  {formError}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Masterclass: Live Scalping & Liquidity Concepts"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#1B5EF5] focus:outline-none"
                />
              </div>

              {/* Category, Type & Status in 3 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-[#1B5EF5] focus:outline-none"
                  >
                    <option value="Masterclass">Masterclass</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Webinar">Webinar</option>
                    <option value="Conference">Conference</option>
                    <option value="Trading">Trading</option>
                    <option value="Tech">Tech</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Format</label>
                  <select
                    value={formData.eventType}
                    onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-[#1B5EF5] focus:outline-none"
                  >
                    <option value="online">Live Online</option>
                    <option value="in-person">In-Person</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-[#1B5EF5] focus:outline-none"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#1B5EF5] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Time</label>
                  <input
                    type="text"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    placeholder="e.g. 6:30 PM - 8:30 PM GMT"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#1B5EF5] focus:outline-none"
                  />
                </div>
              </div>

              {/* Venue & Meeting Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Venue / Platform
                  </label>
                  <input
                    type="text"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    placeholder="e.g. Virtual (Zoom Live Stream)"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#1B5EF5] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Meeting / Live Stream Link
                  </label>
                  <input
                    type="url"
                    value={formData.meetingLink}
                    onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                    placeholder="https://meet.quickxlearn.com/session-room"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#1B5EF5] focus:outline-none"
                  />
                </div>
              </div>

              {/* Pricing & Capacity */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isFree"
                    checked={formData.isFree}
                    onChange={(e) => setFormData({ ...formData, isFree: e.target.checked })}
                    className="h-4 w-4 rounded text-[#1B5EF5]"
                  />
                  <label htmlFor="isFree" className="text-xs font-bold text-slate-800">
                    This is a Free Event (No ticket charge)
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {!formData.isFree && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Price (GH₵)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#1B5EF5] focus:outline-none"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Max Capacity (Seats)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#1B5EF5] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Cover Image & Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cover Image URL
                </label>
                <input
                  type="url"
                  value={formData.coverImage}
                  onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#1B5EF5] focus:outline-none"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="text-[10px] text-slate-400 font-bold self-center">Presets:</span>
                  {PRESET_COVERS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setFormData({ ...formData, coverImage: preset.url })}
                      className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-200 transition"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descriptions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Short Summary
                </label>
                <input
                  type="text"
                  value={formData.shortDescription}
                  onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                  placeholder="One sentence overview..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#1B5EF5] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Description &amp; Agenda *
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed breakdown of topics, session structure, learning outcomes..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:border-[#1B5EF5] focus:outline-none"
                />
              </div>

              {/* Speaker */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <p className="text-xs font-bold text-slate-800">Primary Keynote Speaker</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Speaker Name</label>
                    <input
                      type="text"
                      value={formData.speakerName}
                      onChange={(e) => setFormData({ ...formData, speakerName: e.target.value })}
                      placeholder="e.g. Kofi Mensah"
                      className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Speaker Title</label>
                    <input
                      type="text"
                      value={formData.speakerTitle}
                      onChange={(e) => setFormData({ ...formData, speakerTitle: e.target.value })}
                      placeholder="e.g. Senior FX Analyst"
                      className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="rounded-xl bg-[#1B5EF5] px-6 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#1552D6] disabled:opacity-50"
                >
                  {formSubmitting
                    ? 'Saving...'
                    : editingEventId
                    ? 'Update Event'
                    : 'Publish Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendees Roster Modal */}
      {showAttendeesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Attendee Roster: {selectedEventForAttendees?.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Total Attendees: {attendeesList.length}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAttendeesModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 transition"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              {attendeesLoading ? (
                <p className="text-center text-sm text-slate-400 py-8">Loading attendees...</p>
              ) : attendeesList.length === 0 ? (
                <div className="text-center py-12">
                  <FiUsers className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-2 text-sm font-bold text-slate-700">No attendees yet</p>
                  <p className="text-xs text-slate-500">
                    No tickets have been registered for this event yet.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-2.5 px-3">Ticket ID</th>
                      <th className="py-2.5 px-3">Attendee</th>
                      <th className="py-2.5 px-3">Contact</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendeesList.map((att) => (
                      <tr key={att._id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-3 font-mono font-bold text-[#1B5EF5]">
                          {att.ticketNumber}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {att.attendeeName}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <div>{att.attendeeEmail}</div>
                          <div className="text-[10px] text-slate-400">{att.attendeePhone || '—'}</div>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {att.isFree ? (
                            <span className="text-emerald-600">Free</span>
                          ) : (
                            `GH₵${att.pricePaid}`
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-500 text-[11px]">
                          {new Date(att.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
