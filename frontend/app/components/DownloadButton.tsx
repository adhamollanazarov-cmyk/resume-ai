type DownloadButtonProps = {
  disabled?: boolean;
  isBusy?: boolean;
  label?: string;
  onClick: () => void | Promise<void>;
};

export default function DownloadButton({
  disabled = false,
  isBusy = false,
  label = "Download PDF",
  onClick,
}: DownloadButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {
        void onClick();
      }}
      disabled={disabled || isBusy}
      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-all duration-200 ease-out hover:border-gray-300 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/10 active:scale-[0.99] disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
    >
      {isBusy ? "Preparing..." : label}
    </button>
  );
}
