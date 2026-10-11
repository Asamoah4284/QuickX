import { Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiChevronDown, FiLock, FiShoppingBag, FiTruck, FiClock, FiCheck } from 'react-icons/fi';
import PaymentSuccessModal from './PaymentSuccessModal';
import { publicAssetUrl } from '../utils/publicAssetUrl';

function resolveItemCover(item, apiUrl) {
  const raw = item?.thumbnail ?? item?.image;
  if (!raw) return null;
  const s = typeof raw === 'string' ? raw.trim() : String(raw).trim();
  if (!s) return null;
  if (s.startsWith('http')) return publicAssetUrl(s);
  if (!apiUrl) return null;
  return publicAssetUrl(`${apiUrl}${s}`);
}

/**
 * Minimal guest checkout for single or multiple books (cart/bundles/physical copies).
 * Displays full detailing for every individual book included in the order.
 */
export default function GuestEbookCheckoutView({
  checkoutItem,
  checkoutItemImageSrc,
  books = [],
  apiUrl,
  total,
  formData,
  errors,
  guestMoMoReady,
  isProcessing,
  handleBack,
  handleChange,
  formatPhoneNumber,
  setFormData,
  setErrors,
  handleSubmit,
  onPayClick,
  paymentSuccessModal,
  completeSuccessAndNavigate,
}) {
  const resolvedBooks = Array.isArray(books) && books.length > 0
    ? books
    : Array.isArray(checkoutItem?.books) && checkoutItem.books.length > 0
      ? checkoutItem.books
      : Array.isArray(checkoutItem?.items) && checkoutItem.items.length > 0
        ? checkoutItem.items
        : [];

  const isMultiple = resolvedBooks.length > 1;
  const isPhysical =
    checkoutItem?.format === 'hardcopy' ||
    checkoutItem?.deliveryType != null ||
    resolvedBooks.some((b) => b?.format === 'hardcopy');

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-lg">
        <button
          type="button"
          onClick={handleBack}
          className="mb-6 inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <FiArrowLeft className="mr-2 h-4 w-4" aria-hidden />
          Back to store
        </button>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {/* Order Details Header */}
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                <FiCheck className="h-3.5 w-3.5" />
                No account needed
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {isMultiple ? `${resolvedBooks.length} Books in Order` : 'Single Book Order'}
              </span>
            </div>

            {isMultiple ? (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <h1 className="text-base font-bold text-slate-900">
                    {checkoutItem.title || 'Included Titles in this Order'}
                  </h1>
                  <span className="text-xl font-black text-slate-900">GH₵{total}</span>
                </div>

                <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/70 p-2">
                  {resolvedBooks.map((b, idx) => {
                    const coverSrc = resolveItemCover(b, apiUrl) || (idx === 0 ? checkoutItemImageSrc : null);
                    return (
                      <div key={String(b.id || b._id || idx)} className="flex items-center gap-3 py-2.5 first:pt-1 last:pb-1">
                        {coverSrc ? (
                          <img
                            src={coverSrc}
                            alt=""
                            className="h-16 w-12 shrink-0 rounded-lg bg-white object-contain p-0.5 shadow-sm ring-1 ring-slate-200"
                          />
                        ) : (
                          <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-slate-300 ring-1 ring-slate-200">
                            <FiShoppingBag className="h-6 w-6" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="line-clamp-1 text-sm font-semibold text-slate-900">{b.title}</h4>
                          {b.author ? <p className="text-xs text-slate-500">By {b.author}</p> : null}
                          <div className="mt-1 flex items-center gap-2 text-xs">
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 font-bold text-blue-700">
                              {b.format === 'hardcopy' ? 'Physical Copy' : 'Digital Book'}
                              {(b.quantity || 1) > 1 ? ` · Qty ${b.quantity}` : ''}
                            </span>
                            {b.price ? (
                              <span className="font-semibold text-slate-700">
                                GH₵{Number(b.price || 0) * (b.quantity || 1)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex gap-4">
                {checkoutItemImageSrc ? (
                  <img
                    src={checkoutItemImageSrc}
                    alt=""
                    className="h-28 w-20 shrink-0 rounded-xl bg-slate-50 object-contain p-0.5 shadow-sm ring-1 ring-slate-100"
                  />
                ) : (
                  <div className="flex h-28 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-300">
                    <FiShoppingBag className="h-8 w-8" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-bold leading-snug text-slate-900">
                    {checkoutItem.title}
                  </h1>
                  {checkoutItem.author ? (
                    <p className="mt-0.5 text-sm text-slate-500">By {checkoutItem.author}</p>
                  ) : null}
                  <p className="mt-2 text-2xl font-black text-blue-700">GH₵{total}</p>
                </div>
              </div>
            )}

            {/* Physical Delivery Details banner if applicable */}
            {isPhysical ? (
              <div className="mt-3.5 rounded-xl border border-blue-100 bg-blue-50/80 p-3 text-xs text-blue-950">
                <div className="flex items-center gap-1.5 font-semibold text-blue-900">
                  <FiTruck className="h-3.5 w-3.5 text-blue-700" />
                  <span>Physical Delivery Details:</span>
                </div>
                <div className="mt-1 space-y-0.5 text-blue-800">
                  <p className="flex items-center gap-1">
                    <FiClock className="h-3 w-3 text-blue-600" />
                    Timeframe: {checkoutItem.estimatedDays || '2 - 4 business days'}
                  </p>
                  {checkoutItem.shippingAddress?.location ? (
                    <p className="truncate">Destination: {checkoutItem.shippingAddress.location}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-6">
            <p className="mb-5 text-xs leading-relaxed text-slate-600">
              Pay securely with Mobile Money or Card. After payment you receive immediate confirmation
              and direct access without creating an account.
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="guest-email" className="mb-1 block text-sm font-semibold text-slate-700">
                  Email Address for Receipt &amp; Downloads
                </label>
                <input
                  type="email"
                  id="guest-email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-base ${
                    errors.email ? 'border-red-500' : 'border-slate-200'
                  } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  placeholder="you@email.com"
                />
                {errors.email ? (
                  <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="guest-provider" className="mb-1 block text-sm font-semibold text-slate-700">
                  Mobile Money Network
                </label>
                <div className="relative">
                  <select
                    id="guest-provider"
                    name="provider"
                    value={formData.provider}
                    onChange={handleChange}
                    className="w-full appearance-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="mtn">MTN Mobile Money</option>
                    <option value="vodafone">Telecel (Vodafone) Cash</option>
                    <option value="airtel">AT (AirtelTigo) Money</option>
                  </select>
                  <FiChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label htmlFor="guest-phone" className="mb-1 block text-sm font-semibold text-slate-700">
                  Mobile Money Phone Number
                </label>
                <input
                  type="tel"
                  id="guest-phone"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value);
                    setFormData((prev) => ({ ...prev, phoneNumber: formatted }));
                    if (errors.phoneNumber) {
                      setErrors((prev) => ({ ...prev, phoneNumber: null }));
                    }
                  }}
                  autoComplete="tel"
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-base ${
                    errors.phoneNumber ? 'border-red-500' : 'border-slate-200'
                  } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  placeholder="0XX XXX XXXX"
                  maxLength={10}
                />
                {errors.phoneNumber ? (
                  <p className="mt-1 text-xs text-red-500">{errors.phoneNumber}</p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">Prompt will be sent to this number for payment</p>
                )}
              </div>
            </div>

            <div className="mt-6">
              {guestMoMoReady ? (
                <button
                  type="button"
                  onClick={onPayClick}
                  disabled={isProcessing}
                  className={`flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-blue-700 ${
                    isProcessing ? 'cursor-not-allowed opacity-70' : ''
                  }`}
                >
                  {`Pay GH₵${total}`}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed rounded-xl bg-slate-200 py-3.5 text-base font-semibold text-slate-500"
                >
                  Enter email and phone to pay
                </button>
              )}
            </div>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <FiLock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Secured by Paystack
            </p>

            <p className="mt-4 text-center text-xs text-slate-500">
              Have an account?{' '}
              <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
                Sign in
              </Link>{' '}
              to save purchases directly to your profile.
            </p>
          </form>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {paymentSuccessModal ? (
          <PaymentSuccessModal
            modal={paymentSuccessModal}
            onContinue={completeSuccessAndNavigate}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
