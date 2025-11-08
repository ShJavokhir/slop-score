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
        <header className="border-b border-gray-100 bg-white sticky top-0 z-50 backdrop-blur-sm bg-white/95">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <Link href="/" className="flex items-center group">
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors">
                  SlopScore
                </h1>
              </Link>

              <nav className="flex items-center gap-8">
                <Link
                  href="/"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Home
                </Link>
                <Link
                  href="/leaderboard"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
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

        <footer className="border-t border-gray-100 bg-white mt-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                SlopScore - Stop the slop. Measure what's real.
              </p>
              <p className="text-xs text-gray-400">
                Analyze GitHub repositories for AI-generated patterns and code quality
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
