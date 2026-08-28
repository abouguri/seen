import type { Metadata } from "next";
import { Instrument_Serif, Manrope } from "next/font/google";
import { APP_NAME } from "@/lib/constants";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/components/providers/ThemeProvider";
import "./globals.css";

/* Manrope reads everything, Instrument Serif says everything — see the
   .text-display-* utilities in globals.css. Instrument Serif ships a
   single weight (400) by design; asking for others silently falls back. */
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "A private record of every film you've watched.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${manrope.variable} ${instrumentSerif.variable}`}
    >
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
