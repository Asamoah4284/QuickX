export default function WizardStepper({ steps, currentStep, onStepSelect }) {
  const isClickable = typeof onStepSelect === 'function';

  return (
    <nav aria-label="Wizard progress" className="rounded-2xl border border-slate-200/80 bg-white px-3 py-4 sm:px-6 sm:py-5">
      <ol className="flex w-full items-start">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const active = currentStep === stepNumber;
          const completed = currentStep > stepNumber;
          const isLast = index === steps.length - 1;

          const circle = (
            <span
              className={`relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition sm:h-9 sm:w-9 sm:text-sm ${
                completed
                  ? 'bg-[#1B5EF5] text-white'
                  : active
                    ? 'bg-[#0B1F44] text-white shadow-sm ring-4 ring-[#1B5EF5]/15'
                    : 'bg-slate-100 text-slate-400 ring-1 ring-slate-200'
              }`}
            >
              {completed ? (
                <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                stepNumber
              )}
            </span>
          );

          const labelBlock = (
            <span className="mt-2.5 block min-w-0 text-center">
              <span
                className={`block text-[11px] font-semibold leading-tight sm:text-sm ${
                  active ? 'text-[#0B1F44]' : completed ? 'text-slate-800' : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
              {step.description ? (
                <span
                  className={`mt-0.5 hidden text-[11px] leading-snug sm:block ${
                    active ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  {step.description}
                </span>
              ) : null}
            </span>
          );

          return (
            <li key={step.label} className="relative flex min-w-0 flex-1 flex-col items-center">
              {!isLast ? (
                <span
                  aria-hidden
                  className={`absolute left-[calc(50%+1.125rem)] right-[calc(-50%+1.125rem)] top-4 h-0.5 sm:top-[1.125rem] ${
                    completed ? 'bg-[#1B5EF5]' : 'bg-slate-200'
                  }`}
                />
              ) : null}

              {isClickable ? (
                <button
                  type="button"
                  onClick={() => onStepSelect(stepNumber)}
                  aria-current={active ? 'step' : undefined}
                  className="relative z-[1] flex w-full max-w-[9.5rem] flex-col items-center rounded-xl px-1 py-0.5 outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#1B5EF5]/40"
                >
                  {circle}
                  {labelBlock}
                </button>
              ) : (
                <div
                  className="relative z-[1] flex w-full max-w-[9.5rem] flex-col items-center px-1"
                  aria-current={active ? 'step' : undefined}
                >
                  {circle}
                  {labelBlock}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
