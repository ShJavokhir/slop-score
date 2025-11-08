import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "SlopScore - Measure What's Real",
  description: "Stop the slop. Analyze GitHub repositories for AI-generated code, hardcoded values, and README accuracy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <header className="border-b border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900">
                  SlopScore
                </h1>
              </Link>

              <nav className="flex items-center gap-6">
                <Link
                  href="/"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Home
                </Link>
                <Link
                  href="/leaderboard"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Leaderboard
                </Link>
              </nav>
            </div>
          </div>
        </header>

        <main className="min-h-screen bg-white">
          {children}
        </main>

        <footer className="border-t border-gray-200 bg-gray-50 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <p className="text-center text-sm text-gray-600">
              SlopScore - Stop the slop. Measure what's real.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
