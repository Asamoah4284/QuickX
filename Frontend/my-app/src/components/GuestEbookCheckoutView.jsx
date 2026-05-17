import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiCheck, FiChevronDown, FiLock, FiShoppingBag } from 'react-icons/fi';
import { PaystackButton } from 'react-paystack';

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
  getPaystackConfig,
  paymentSuccessModal,
  completeSuccessAndNavigate,
}) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-md">
        <button
          type="button"
          onClick={handleBack}
          className="mb-6 inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <FiArrowLeft className="mr-2 h-4 w-4" aria-hidden />
          Back to book
        </button>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <div className="flex gap-4">
              {checkoutItemImageSrc ? (
                <img
                  src={checkoutItemImageSrc}
                  alt=""
                  className="h-24 w-[4.5rem] shrink-0 rounded-lg object-contain bg-slate-50 ring-1 ring-slate-100"
                />
              ) : (
                <div className="flex h-24 w-[4.5rem] shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-300">
                  <FiShoppingBag className="h-8 w-8" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                  No account needed
                </p>
                <h1 className="mt-1 text-lg font-semibold leading-snug text-slate-900">
                  {checkoutItem.title}
                </h1>
                {checkoutItem.author ? (
                  <p className="mt-0.5 text-sm text-slate-500">By {checkoutItem.author}</p>
                ) : null}
                <p className="mt-2 text-2xl font-bold text-slate-900">GH₵{total}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-6">
            <p className="mb-5 text-sm leading-relaxed text-slate-600">
              Pay with Mobile Money. After payment you go straight to your download page — no
              sign-up required.
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="guest-email" className="mb-1 block text-sm font-medium text-slate-700">
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
                    errors.email ? 'border-red-500' : 'border-slate-200'
                  } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  placeholder="you@email.com"
                />
                {errors.email ? (
                  <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="guest-provider" className="mb-1 block text-sm font-medium text-slate-700">
                  Mobile Money network
                </label>
                <div className="relative">
                  <select
                    id="guest-provider"
                    name="provider"
                    value={formData.provider}
                    onChange={handleChange}
                    className="w-full appearance-none rounded-xl border border-slate-200 px-3 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="mtn">MTN Mobile Money</option>
                    <option value="vodafone">Vodafone Cash</option>
                    <option value="airtel">AirtelTigo Money</option>
                  </select>
                  <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <label htmlFor="guest-phone" className="mb-1 block text-sm font-medium text-slate-700">
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
                    errors.phoneNumber ? 'border-red-500' : 'border-slate-200'
                  } focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  placeholder="0XX XXX XXXX"
                  maxLength={10}
                />
                {errors.phoneNumber ? (
                  <p className="mt-1 text-sm text-red-500">{errors.phoneNumber}</p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">Use the number registered on your wallet</p>
                )}
              </div>
            </div>

            <div className="mt-6">
              {guestMoMoReady ? (
                <PaystackButton
                  {...getPaystackConfig()}
                  text={`Pay GH₵${total} with Mobile Money`}
                  className={`flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 ${
                    isProcessing ? 'cursor-not-allowed opacity-70' : ''
                  }`}
                  disabled={isProcessing}
                />
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed rounded-xl bg-slate-200 py-4 text-base font-semibold text-slate-500"
                >
                  Enter email and phone to pay
                </button>
              )}
            </div>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <FiLock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Secured by Paystack
            </p>

            <p className="mt-4 text-center text-sm text-slate-500">
              Have an account?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">
                Sign in
              </Link>{' '}
              to save this book to your library.
            </p>
          </form>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {paymentSuccessModal ? (
          <motion.div
            key="payment-success-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-success-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
            onClick={completeSuccessAndNavigate}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
            >
              <div className="px-6 pb-6 pt-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <FiCheck className="h-7 w-7 stroke-[3]" aria-hidden />
                </div>
                <h2 id="payment-success-title" className="text-xl font-bold text-gray-900">
                  {paymentSuccessModal.title}
                </h2>
                <p className="mt-2 text-sm text-gray-600">{paymentSuccessModal.description}</p>
              </div>
              <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
                <button
                  type="button"
                  onClick={completeSuccessAndNavigate}
                  className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  {paymentSuccessModal.ctaLabel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
