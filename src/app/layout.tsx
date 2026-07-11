import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Claude Project Hub",
  description: "Requirements, Architektur und Tests für Claude-Projekte",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto max-w-5xl px-6 py-4">
            <a href="/" className="text-lg font-semibold tracking-tight">
              Claude Project Hub
            </a>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
        <footer className="border-t border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4 text-sm text-neutral-500">
            <a
              href="https://github.com/FabianReichert23/claude-project-hub"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-900"
            >
              GitHub: FabianReichert23/claude-project-hub
            </a>
            <a href="mailto:fabian.reichert1997@gmail.com" className="hover:text-neutral-900">
              Kontakt: fabian.reichert1997@gmail.com
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
