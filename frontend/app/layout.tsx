import type { Metadata } from "next";
import Link from "next/link";

import SignOutButton from "@/app/components/SignOutButton";
import { getCurrentSession } from "@/lib/auth-helpers";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Resume Analyzer",
  description: "Analyze resumes, optimize role fit, and manage usage in a calm SaaS dashboard.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();

  return (
    <html lang="en">
      <body className="text-gray-950 antialiased">
        <div className="border-b border-gray-200 bg-[#FAFAFA]/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
            <Link href="/" className="text-sm font-semibold tracking-[0.2em] text-gray-700">
              AI RESUME
            </Link>
            <nav className="flex items-center gap-3">
              {session?.user?.id ? (
                <>
                  <Link
                    href="/dashboard"
                    className="rounded-full px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
                  >
                    Dashboard
                  </Link>
                  <SignOutButton />
                </>
              ) : (
                <Link
                  href="/login"
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50"
                >
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
