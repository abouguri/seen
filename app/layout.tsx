import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { APP_NAME } from "@/lib/constants";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/components/providers/ThemeProvider";
import "./globals.css";

/* Manrope reads everything. The display face — see the .text-display-*
   utilities in globals.css — is Helvetica, which isn't loaded here: it's
   a licensed desktop font, not distributable, and it's already installed
   on the platforms that have it. The stack in --display resolves it
   locally or falls back to one of its metric clones. */
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  title: APP_NAME,
  description: "A private record of every film you've watched.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${manrope.variable}`}>
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
