import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { APP_NAME } from "@/lib/constants";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/components/providers/ThemeProvider";
import "./globals.css";

/* Manrope reads everything. The display face — see the .text-display-*
   utilities in globals.css — is Helvetica, which isn't loaded here: it's
   a licensed desktop font, not distributable, and it's already installed
   on the platforms that have it. The stack in --display resolves it
   locally or falls back to one of its metric clones. */
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

/* Inter carries the wordmark and nothing else — one weight, so it's a
   single self-hosted woff2 rather than a family. A logotype has to be
   the same shape in the nav, on the sign-in page and in the favicon, and
   that's the one piece of type in the app that can't be allowed to fall
   through to whatever the UI face happens to be. Everything else still
   reads in Manrope. */
const inter = Inter({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "A private record of every film you've watched.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${manrope.variable} ${inter.variable}`}>
      <head>
        {/* Applies a stored Light/Dark override before first paint, so
            switching Appearance never causes a flash of the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-bg text-label">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
