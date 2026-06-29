import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { formatGhs } from '../utils/formatGhs';

const DEFAULT_BOOK_COVER = '/images/bk-1.jpg';
const WHATSAPP_NUMBER = '233542343069';

/**
 * Modal form to request a printed copy — opens WhatsApp with prefilled details.
 */
export default function HardcopyRequestModal({ book, open, onClose }) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!open) return;
    setName('');
    setLocation('');
    setPhone('');
  }, [open, book?._id]);

  if (!open || !book) return null;

  const hardcopyAmount =
    book.hardcopyPrice != null && book.hardcopyPrice !== ''
      ? Number(book.hardcopyPrice)
      : Number(book.price ?? 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    const lines = [
      'New Hardcopy Request:',
      '',
      `Book: ${book.title}`,
      book.author ? `Author: ${book.author}` : null,
      `Price: GHS${hardcopyAmount}`,
      'Qty: 1',
      `Name: ${name.trim()}`,
      phone.trim() ? `Phone: ${phone.trim()}` : null,
      `Delivery location: ${location.trim()}`,
    ].filter(Boolean);

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(whatsappUrl, '_blank');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hardcopy-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 id="hardcopy-modal-title" className="text-lg font-semibold tracking-tight text-slate-950">
              Request hardcopy
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Prefer a printed book? We&apos;ll confirm delivery on WhatsApp.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            onClick={onClose}
            aria-label="Close"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-5 flex items-start gap-4">
            <img
              src={book.thumbnail || DEFAULT_BOOK_COVER}
              alt=""
              className="h-20 w-16 shrink-0 rounded-xl border border-slate-200 object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = DEFAULT_BOOK_COVER;
              }}
            />
            <div>
              <h4 className="text-base font-semibold text-slate-950">{book.title}</h4>
              {book.author ? <p className="mt-0.5 text-sm text-slate-600">{book.author}</p> : null}
              <p className="mt-1 text-sm font-semibold text-blue-700">{formatGhs(hardcopyAmount)}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="hardcopy-name" className="block text-sm font-semibold text-slate-800">
                Your name
              </label>
              <input
                type="text"
                id="hardcopy-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Asamoah Richard"
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="hardcopy-phone" className="block text-sm font-semibold text-slate-800">
                Phone number
              </label>
              <input
                type="tel"
                id="hardcopy-phone"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 024 123 4567"
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="hardcopy-location" className="block text-sm font-semibold text-slate-800">
                Delivery location
              </label>
              <input
                type="text"
                id="hardcopy-location"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Accra, East Legon"
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Send via WhatsApp
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
