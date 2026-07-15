import { motion } from 'framer-motion';
import { FiCheck, FiArrowRight } from 'react-icons/fi';

/**
 * Shared post-checkout success dialog — Stripe-style receipt + clear next step.
 * Expects: title, description, ctaLabel, optional amount / productLabel / meta
 */
export default function PaymentSuccessModal({ modal, onContinue }) {
  if (!modal) return null;

  const amountLabel =
    modal.amount != null && Number.isFinite(Number(modal.amount))
      ? `GH₵${Number(modal.amount).toFixed(2)}`
      : null;

  return (
    <motion.div
      key="payment-success-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-success-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onContinue}
    >
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: 'spring', damping: 28, stiffness: 360 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[26rem] overflow-hidden rounded-t-3xl bg-white shadow-[0_24px_80px_-20px_rgba(15,23,42,0.45)] sm:rounded-3xl"
      >
        <div className="h-1 w-full bg-[#1B5EF5]" aria-hidden />

        <div className="px-6 pb-2 pt-8 text-center sm:px-8 sm:pt-10">
          <div className="relative mx-auto mb-5 h-16 w-16">
            <motion.span
              aria-hidden
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.05, type: 'spring', stiffness: 280, damping: 18 }}
              className="absolute inset-0 rounded-full bg-emerald-500/15"
            />
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.12, type: 'spring', stiffness: 320, damping: 16 }}
              className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-600/30"
            >
              <FiCheck className="h-8 w-8 stroke-[2.75]" aria-hidden />
            </motion.div>
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Confirmed
          </p>
          <h2
            id="payment-success-title"
            className="mt-2 text-2xl font-semibold tracking-tight text-slate-900"
          >
            {modal.title}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-slate-500">
            {modal.description}
          </p>

          {amountLabel ? (
            <div className="mt-6 rounded-2xl border border-slate-200/90 bg-slate-50 px-4 py-4 text-left">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Amount paid
                  </p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                    {amountLabel}
                  </p>
                </div>
                {modal.meta ? (
                  <p className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                    {modal.meta}
                  </p>
                ) : null}
              </div>
              {modal.productLabel ? (
                <p className="mt-3 border-t border-slate-200/80 pt-3 text-sm text-slate-600">
                  {modal.productLabel}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="px-6 pb-8 pt-4 sm:px-8">
          <button
            type="button"
            onClick={onContinue}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#1B5EF5] py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_28px_-10px_rgba(27,94,245,0.7)] transition hover:bg-[#1550d6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5EF5] focus-visible:ring-offset-2"
          >
            {modal.ctaLabel}
            <FiArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
          </button>
          <p className="mt-3 text-center text-xs text-slate-400">
            A confirmation will appear on your account shortly.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
