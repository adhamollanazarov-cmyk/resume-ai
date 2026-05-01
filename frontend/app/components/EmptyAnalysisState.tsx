"use client";

type EmptyAnalysisStateProps = {
  onStart?: () => void;
};

type StepCardProps = {
  icon: React.ReactNode;
  number: 1 | 2 | 3;
  text: string;
};

function StepCard({ icon, number, text }: StepCardProps) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-[#DDD7C8] bg-white p-4 shadow-[0_14px_32px_rgba(79,62,30,0.05)]">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1ECE0] text-sm font-semibold text-[#5E6650]">
        {number}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span className="text-[#5E6650]">{icon}</span>
          <p className="text-sm font-medium leading-6 text-[#22211D]">{text}</p>
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4">
      <path
        d="M5.5 10.5L8.5 13.5L14.5 6.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        d="M7 3.75H13.75L18 8V19.25C18 19.6642 17.6642 20 17.25 20H7C6.58579 20 6.25 19.6642 6.25 19.25V4.5C6.25 4.08579 6.58579 3.75 7 3.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M13.5 4V8.25H17.75" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.75 11H15.25" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
      <path d="M8.75 14H15.25" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        d="M9 4.75H15C15.4142 4.75 15.75 5.08579 15.75 5.5V7H17.25C17.6642 7 18 7.33579 18 7.75V19.25C18 19.6642 17.6642 20 17.25 20H6.75C6.33579 20 6 19.6642 6 19.25V7.75C6 7.33579 6.33579 7 6.75 7H8.25V5.5C8.25 5.08579 8.58579 4.75 9 4.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M9.5 7H14.5V4.75H9.5V7Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 11H15" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
      <path d="M9 14H13.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path d="M5.5 18.5V10.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
      <path d="M11.75 18.5V7.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
      <path d="M18 18.5V13" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
      <path d="M4.5 18.5H19.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
      <path d="M5.5 7.5L11.75 5L18 9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
    </svg>
  );
}

function SparkleIllustration() {
  return (
    <svg aria-hidden="true" viewBox="0 0 320 220" className="mx-auto h-auto w-full max-w-[280px] text-[#5E6650]">
      <rect x="66" y="28" width="188" height="164" rx="24" fill="#FCFBF7" stroke="#D8D0BD" strokeWidth="2" />
      <rect x="92" y="54" width="88" height="12" rx="6" fill="#E8E0D0" />
      <rect x="92" y="78" width="136" height="10" rx="5" fill="#EDE6D8" />
      <rect x="92" y="98" width="120" height="10" rx="5" fill="#EDE6D8" />
      <rect x="92" y="118" width="98" height="10" rx="5" fill="#EDE6D8" />
      <rect x="92" y="144" width="132" height="28" rx="14" fill="#F3EEE4" stroke="#D8D0BD" />
      <path
        d="M117 158L128 169L149 148"
        fill="none"
        stroke="#4F7A65"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path d="M254 48L259 61L272 66L259 71L254 84L249 71L236 66L249 61Z" fill="#E5DDCB" stroke="#CFC3AB" />
      <path d="M46 88L50 98L60 102L50 106L46 116L42 106L32 102L42 98Z" fill="#F0E9DB" stroke="#D4C7AE" />
      <path d="M264 126L267 134L275 137L267 140L264 148L261 140L253 137L261 134Z" fill="#F0E9DB" stroke="#D4C7AE" />
      <circle cx="233" cy="151" r="22" fill="#F7F2E6" stroke="#D8D0BD" />
      <path d="M220 152H246" fill="none" stroke="#4F7A65" strokeLinecap="round" strokeWidth="4" />
      <path d="M220 143L231 132L246 132" fill="none" stroke="#4F7A65" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
    </svg>
  );
}

export default function EmptyAnalysisState({ onStart }: EmptyAnalysisStateProps) {
  function handleStart() {
    if (onStart) {
      onStart();
      return;
    }

    const target = document.getElementById("analyze-form");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    window.location.assign("/#analyze-form");
  }

  return (
    <div className="mt-5 rounded-[28px] border border-[#DDD7C8] bg-[#F7F3EA] px-5 py-8 text-center shadow-[0_24px_60px_rgba(79,62,30,0.06)] sm:px-8">
      <SparkleIllustration />

      <h3 className="mt-6 text-2xl font-semibold tracking-tight text-[#22211D] sm:text-[2rem]">
        Your first analysis is one upload away
      </h3>

      <div className="mx-auto mt-8 grid max-w-3xl gap-4 lg:grid-cols-3">
        <StepCard icon={<DocumentIcon />} number={1} text="Upload your resume PDF" />
        <StepCard icon={<ClipboardIcon />} number={2} text="Paste the job description" />
        <StepCard icon={<ChartIcon />} number={3} text="Get your match score + tailored cover letter" />
      </div>

      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={handleStart}
          className="rounded-xl bg-[#22211D] px-5 py-3 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#171612] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/10 active:scale-[0.99]"
        >
          Start my free analysis →
        </button>
      </div>

      <p className="mt-3 text-xs text-[#7D7668]">3 free analyses included • No credit card required</p>

      <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-[#E0D8C8] bg-white px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7D7668]">What you&apos;ll get:</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {["Match score", "ATS keywords", "Rewritten bullets", "Cover letter"].map((item) => (
            <div key={item} className="flex items-center justify-center gap-2 rounded-xl bg-[#FCFBF7] px-3 py-3 text-sm text-[#4C4A43]">
              <span className="text-[#5E6650]">
                <CheckIcon />
              </span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
