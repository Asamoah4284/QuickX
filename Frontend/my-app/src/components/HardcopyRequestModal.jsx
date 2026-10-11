import { useEffect, useState, useMemo } from 'react';
import { FiX, FiMapPin, FiTruck, FiCreditCard, FiClock, FiCheckCircle } from 'react-icons/fi';
import { formatGhs } from '../utils/formatGhs';

const DEFAULT_BOOK_COVER = '/images/bk-1.jpg';
const WHATSAPP_NUMBER = '233559037872';

/**
 * Modal form to order a physical book with configured delivery options:
 * - Pickup
 * - Pay on Delivery
 * - Instant Pay (direct online checkout)
 */
export default function HardcopyRequestModal({ book, open, onClose, onSelectInstantPay }) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState('pay_on_delivery');
  const [pickupNote, setPickupNote] = useState('');

  // Extract delivery options from book configuration
  const deliveryOptions = useMemo(() => {
    const raw = book?.deliveryOptions || {};
    const types = Array.isArray(raw.availableTypes) && raw.availableTypes.length > 0
      ? raw.availableTypes
      : ['pickup', 'pay_on_delivery', 'instant_pay'];

    return {
      availableTypes: types,
      estimatedDays: (raw.estimatedDays || '2 - 4 business days').trim(),
      pickupLocations: (raw.pickupLocations || '').trim(),
      deliveryFee: Number(raw.deliveryFee || 0),
    };
  }, [book]);

  useEffect(() => {
    if (!open) return;
    setName('');
    setLocation('');
    setPhone('');
    setPickupNote('');

    // Pre-select first available delivery type
    if (deliveryOptions.availableTypes.length > 0) {
      if (deliveryOptions.availableTypes.includes('pay_on_delivery')) {
        setDeliveryType('pay_on_delivery');
      } else {
        setDeliveryType(deliveryOptions.availableTypes[0]);
      }
    } else {
      setDeliveryType('pay_on_delivery');
    }
  }, [open, book?._id, deliveryOptions]);

  if (!open || !book) return null;

  const hardcopyAmount =
    book.hardcopyPrice != null && book.hardcopyPrice !== ''
      ? Number(book.hardcopyPrice)
      : Number(book.price ?? 0);

  const activeFee = deliveryType === 'pickup' ? 0 : deliveryOptions.deliveryFee;
  const totalAmount = hardcopyAmount + activeFee;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (deliveryType === 'instant_pay' && typeof onSelectInstantPay === 'function') {
      onSelectInstantPay({
        name: name.trim(),
        phone: phone.trim(),
        location: location.trim(),
        deliveryType: 'instant_pay',
        deliveryFee: activeFee,
        estimatedDays: deliveryOptions.estimatedDays,
      });
      return;
    }

    // Default or fallback: WhatsApp order dispatch
    const deliveryTypeLabel =
      deliveryType === 'pickup'
        ? 'Self-Pickup'
        : deliveryType === 'instant_pay'
          ? 'Instant Pay (Online)'
          : 'Pay on Delivery';

    const lines = [
      '📦 *New Physical Book Order*',
      '',
      `📖 *Book:* ${book.title}`,
      book.author ? `✍️ *Author:* ${book.author}` : null,
      `💵 *Book Price:* GHS ${hardcopyAmount}`,
      `🚚 *Delivery Type:* ${deliveryTypeLabel}`,
      `⏱️ *Estimated Delivery:* ${deliveryOptions.estimatedDays}`,
      `🏷️ *Delivery Fee:* ${activeFee > 0 ? `GHS ${activeFee}` : 'Free'}`,
      `💰 *Total to Pay:* GHS ${totalAmount}`,
      '',
      `👤 *Customer Name:* ${name.trim()}`,
      phone.trim() ? `📞 *Phone:* ${phone.trim()}` : null,
      deliveryType === 'pickup'
        ? `📍 *Pickup Point:* ${deliveryOptions.pickupLocations || 'Designated Pickup Station'}${
            pickupNote.trim() ? `\n📝 *Notes:* ${pickupNote.trim()}` : ''
          }`
        : `📍 *Delivery Address:* ${location.trim()}`,
    ].filter(Boolean);

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(whatsappUrl, '_blank');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hardcopy-modal-title"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div>
            <h3 id="hardcopy-modal-title" className="text-lg font-bold tracking-tight text-slate-950">
              Order Physical Book
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Select delivery preferences and receive your printed copy.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-700"
            onClick={onClose}
            aria-label="Close"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Book Snapshot */}
          <div className="mb-5 flex items-start gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
            <img
              src={book.thumbnail || DEFAULT_BOOK_COVER}
              alt=""
              className="h-20 w-16 shrink-0 rounded-lg border border-slate-200 object-cover shadow-sm"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = DEFAULT_BOOK_COVER;
              }}
            />
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                Printed Hardcopy
              </span>
              <h4 className="mt-1 line-clamp-1 text-sm font-bold text-slate-950">{book.title}</h4>
              {book.author ? <p className="text-xs text-slate-500">By {book.author}</p> : null}
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-base font-extrabold text-blue-700">{formatGhs(hardcopyAmount)}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <FiClock className="h-3 w-3" />
                  {deliveryOptions.estimatedDays}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Options Selector */}
          <div className="mb-5">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
              Choose Available Delivery Method
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {deliveryOptions.availableTypes.includes('pickup') ? (
                <button
                  type="button"
                  onClick={() => setDeliveryType('pickup')}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                    deliveryType === 'pickup'
                      ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <FiMapPin className={`h-4 w-4 ${deliveryType === 'pickup' ? 'text-blue-600' : 'text-slate-500'}`} />
                    {deliveryType === 'pickup' ? <FiCheckCircle className="h-4 w-4 text-blue-600" /> : null}
                  </div>
                  <span className="mt-2 text-xs font-bold text-slate-900">Station Pickup</span>
                  <span className="text-[11px] font-semibold text-emerald-600">Free pickup</span>
                  <span className="mt-0.5 text-[10px] text-slate-400">Ready in {deliveryOptions.estimatedDays}</span>
                </button>
              ) : null}

              {deliveryOptions.availableTypes.includes('pay_on_delivery') ? (
                <button
                  type="button"
                  onClick={() => setDeliveryType('pay_on_delivery')}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                    deliveryType === 'pay_on_delivery'
                      ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <FiTruck className={`h-4 w-4 ${deliveryType === 'pay_on_delivery' ? 'text-blue-600' : 'text-slate-500'}`} />
                    {deliveryType === 'pay_on_delivery' ? <FiCheckCircle className="h-4 w-4 text-blue-600" /> : null}
                  </div>
                  <span className="mt-2 text-xs font-bold text-slate-900">Pay on Delivery</span>
                  <span className="text-[11px] font-semibold text-slate-600">
                    {deliveryOptions.deliveryFee > 0 ? formatGhs(deliveryOptions.deliveryFee) : 'Free delivery'}
                  </span>
                  <span className="mt-0.5 text-[10px] text-slate-400">In {deliveryOptions.estimatedDays}</span>
                </button>
              ) : null}

              {deliveryOptions.availableTypes.includes('instant_pay') ? (
                <button
                  type="button"
                  onClick={() => setDeliveryType('instant_pay')}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                    deliveryType === 'instant_pay'
                      ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <FiCreditCard className={`h-4 w-4 ${deliveryType === 'instant_pay' ? 'text-blue-600' : 'text-slate-500'}`} />
                    {deliveryType === 'instant_pay' ? <FiCheckCircle className="h-4 w-4 text-blue-600" /> : null}
                  </div>
                  <span className="mt-2 text-xs font-bold text-slate-900">Instant Pay</span>
                  <span className="text-[11px] font-semibold text-blue-700">MoMo / Card</span>
                  <span className="mt-0.5 text-[10px] text-slate-400">In {deliveryOptions.estimatedDays}</span>
                </button>
              ) : null}
            </div>
          </div>

          {/* Location / Instructions details */}
          {deliveryType === 'pickup' && deliveryOptions.pickupLocations ? (
            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-900">
              <p className="font-semibold text-blue-950 flex items-center gap-1.5">
                <FiMapPin className="h-3.5 w-3.5 text-blue-700" />
                Pickup Station:
              </p>
              <p className="mt-1 text-blue-800">{deliveryOptions.pickupLocations}</p>
            </div>
          ) : null}

          {/* Form Fields */}
          <div className="space-y-3.5">
            <div>
              <label htmlFor="hardcopy-name" className="block text-xs font-semibold text-slate-700">
                Your Full Name
              </label>
              <input
                type="text"
                id="hardcopy-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Asamoah Richard"
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="hardcopy-phone" className="block text-xs font-semibold text-slate-700">
                Phone Number (for call/MoMo updates)
              </label>
              <input
                type="tel"
                id="hardcopy-phone"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 024 123 4567"
                className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {deliveryType === 'pickup' ? (
              <div>
                <label htmlFor="hardcopy-pickup-notes" className="block text-xs font-semibold text-slate-700">
                  Pickup Notes / Preferred Time (optional)
                </label>
                <input
                  type="text"
                  id="hardcopy-pickup-notes"
                  value={pickupNote}
                  onChange={(e) => setPickupNote(e.target.value)}
                  placeholder="e.g. Will pick up after 2 PM"
                  className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="hardcopy-location" className="block text-xs font-semibold text-slate-700">
                  Delivery Address / Landmark & City
                </label>
                <input
                  type="text"
                  id="hardcopy-location"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. East Legon, Near Shell Station, Accra"
                  className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Pricing & Timeframe Breakdown */}
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Book Price</span>
              <span>{formatGhs(hardcopyAmount)}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs text-slate-600">
              <span>Delivery Fee</span>
              <span>{activeFee > 0 ? formatGhs(activeFee) : 'Free'}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-bold text-slate-900">
              <span>Total Amount</span>
              <span className="text-blue-700">{formatGhs(totalAmount)}</span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-1">
              <FiClock className="h-3 w-3 text-slate-400" />
              Estimated delivery timeframe: {deliveryOptions.estimatedDays}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={onClose}
            >
              Cancel
            </button>

            {deliveryType === 'instant_pay' ? (
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
              >
                <FiCreditCard className="h-4 w-4" />
                Proceed to Instant Checkout
              </button>
            ) : (
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
              >
                Confirm via WhatsApp
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
