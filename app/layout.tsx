import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "SlopScore - Measure code quality, stop the slop",
  description: "Analyze GitHub repositories for AI-generated code patterns, README accuracy, and code quality issues. Stop the slop.",
  openGraph: {
    title: "SlopScore - Stop the slop",
    description: "Measure what's real. Analyze GitHub repositories for code quality issues.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased bg-white text-gray-900 font-sans"
      >
        <header className="border-b border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-xl font-bold text-gray-900">SlopScore</span>
              </Link>
              <nav className="flex items-center gap-6">
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
        <main className="min-h-screen">
          {children}
        </main>
        <footer className="border-t border-gray-100 bg-white py-8 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
            <p>Stop the slop. Measure what's real.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
