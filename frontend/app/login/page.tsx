type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl = params?.callbackUrl ?? "/dashboard";
  const signInUrl = `/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <main className="min-h-screen bg-[#FAFAFA] px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.04)]">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Welcome</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-950">Sign in to your dashboard.</h1>
          <p className="mt-4 text-sm leading-7 text-gray-500">
            Use Google to save analyses, track your usage, and unlock upgrades when you need them.
          </p>

          <a
            href={signInUrl}
            className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/10 active:scale-[0.99]"
          >
            Continue with Google
          </a>
        </div>
      </div>
    </main>
  );
}
