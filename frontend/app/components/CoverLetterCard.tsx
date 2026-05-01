type CoverLetterCardProps = {
  copied: boolean;
  onCopy: () => void | Promise<void>;
  value: string;
};

export default function CoverLetterCard({ copied, onCopy, value }: CoverLetterCardProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5 transition-all duration-200 hover:border-gray-300">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cover letter</h2>
          <p className="mt-2 text-sm text-gray-500">A concise draft you can personalize before sending.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            void onCopy();
          }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-all duration-200 ease-out hover:border-gray-300 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/10 active:scale-[0.99]"
        >
          {copied ? "Copied!" : "Copy Cover Letter"}
        </button>
      </div>
      <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-700">{value || "No cover letter returned."}</div>
    </section>
  );
}
