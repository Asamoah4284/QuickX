export default function WizardStepper({ steps, currentStep, onStepSelect }) {
  const isClickable = typeof onStepSelect === 'function';

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-creator">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const active = currentStep === stepNumber;
          const completed = currentStep > stepNumber;

          const classes = `flex w-full items-start gap-3 rounded-2xl border px-4 py-4 text-left transition ${
            completed
              ? 'border-emerald-200 bg-emerald-50'
              : active
                ? 'border-white/15 bg-blue-950 text-white shadow-md shadow-blue-950/25'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
          } ${isClickable ? 'cursor-pointer' : ''}`;

          const content = (
            <>
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  completed
                    ? 'bg-emerald-500 text-white'
                    : active
                      ? 'bg-white text-blue-950 shadow-sm'
                      : 'bg-slate-100 text-slate-500'
                }`}
              >
                {completed ? '✓' : stepNumber}
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-900'}`}>
                  {step.label}
                </p>
                <p className={`mt-1 text-xs ${active ? 'text-blue-100/85' : 'text-slate-500'}`}>
                  {step.description}
                </p>
              </div>
            </>
          );

          return isClickable ? (
            <button
              key={step.label}
              type="button"
              onClick={() => onStepSelect(stepNumber)}
              className={classes}
            >
              {content}
            </button>
          ) : (
            <div key={step.label} className={classes}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
