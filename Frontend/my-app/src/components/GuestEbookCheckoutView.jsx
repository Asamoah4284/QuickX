import { Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiChevronDown, FiLock, FiShoppingBag } from 'react-icons/fi';
import PaymentSuccessModal from './PaymentSuccessModal';

/** Minimal guest checkout for a single ebook — email, MoMo, pay, instant download. */
export default function GuestEbookCheckoutView({
  checkoutItem,
  checkoutItemImageSrc,
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
  return (
    <div className="min-h-screen bg-ink-900 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-md">
        <button
          type="button"
          onClick={handleBack}
          className="mb-6 inline-flex items-center text-sm font-medium text-fg-muted transition hover:text-fg"
        >
          <FiArrowLeft className="mr-2 h-4 w-4" aria-hidden />
          Back to book
        </button>

        <div className="overflow-hidden rounded-2xl bg-ink-850 shadow-sm ring-1 ring-line">
          <div className="border-b border-line p-5 sm:p-6">
            <div className="flex gap-4">
              {checkoutItemImageSrc ? (
                <img
                  src={checkoutItemImageSrc}
                  alt=""
                  className="h-24 w-[4.5rem] shrink-0 rounded-lg object-contain bg-ink-900 ring-1 ring-line"
                />
              ) : (
                <div className="flex h-24 w-[4.5rem] shrink-0 items-center justify-center rounded-lg bg-ink-900 text-fg-muted">
                  <FiShoppingBag className="h-8 w-8" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-up">
                  No account needed
                </p>
                <h1 className="mt-1 text-lg font-semibold leading-snug text-fg">
                  {checkoutItem.title}
                </h1>
                {checkoutItem.author ? (
                  <p className="mt-0.5 text-sm text-fg-subtle">By {checkoutItem.author}</p>
                ) : null}
                <p className="mt-2 text-2xl font-bold text-fg">GH₵{total}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-6">
            <p className="mb-5 text-sm leading-relaxed text-fg-muted">
              Pay with Mobile Money or Card. After payment you go straight to your download page — no
              sign-up required.
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="guest-email" className="mb-1 block text-sm font-medium text-fg-muted">
                  Email for your download link
                </label>
                <input
                  type="email"
                  id="guest-email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  className={`w-full rounded-xl border px-3 py-3 text-base ${
                    errors.email ? 'border-down' : 'border-line'
                  } focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20`}
                  placeholder="you@email.com"
                />
                {errors.email ? (
                  <p className="mt-1 text-sm text-down">{errors.email}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="guest-provider" className="mb-1 block text-sm font-medium text-fg-muted">
                  Mobile Money network
                </label>
                <div className="relative">
                  <select
                    id="guest-provider"
                    name="provider"
                    value={formData.provider}
                    onChange={handleChange}
                    className="w-full appearance-none rounded-xl border border-line px-3 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="mtn">MTN Mobile Money</option>
                    <option value="vodafone">Vodafone Cash</option>
                    <option value="airtel">AirtelTigo Money</option>
                  </select>
                  <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-subtle" />
                </div>
              </div>

              <div>
                <label htmlFor="guest-phone" className="mb-1 block text-sm font-medium text-fg-muted">
                  MoMo phone number
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
                  className={`w-full rounded-xl border px-3 py-3 text-base ${
                    errors.phoneNumber ? 'border-down' : 'border-line'
                  } focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20`}
                  placeholder="0XX XXX XXXX"
                  maxLength={10}
                />
                {errors.phoneNumber ? (
                  <p className="mt-1 text-sm text-down">{errors.phoneNumber}</p>
                ) : (
                  <p className="mt-1 text-xs text-fg-subtle">Use the number registered on your wallet</p>
                )}
              </div>
            </div>

            <div className="mt-6">
              {guestMoMoReady ? (
                <button
                  type="button"
                  onClick={onPayClick}
                  disabled={isProcessing}
                  className={`flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-brand-700 ${
                    isProcessing ? 'cursor-not-allowed opacity-70' : ''
                  }`}
                >
                  {`Pay GH₵${total}`}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed rounded-xl bg-ink-700 py-4 text-base font-semibold text-fg-subtle"
                >
                  Enter email and phone to pay
                </button>
              )}
            </div>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-fg-subtle">
              <FiLock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Secured by Paystack
            </p>

            <p className="mt-4 text-center text-sm text-fg-subtle">
              Have an account?{' '}
              <Link to="/login" className="font-medium text-brand-400 hover:text-brand-300">
                Sign in
              </Link>{' '}
              to save this book to your library.
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
