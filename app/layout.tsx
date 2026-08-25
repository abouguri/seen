import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { APP_NAME } from "@/lib/constants";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/components/providers/ThemeProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: APP_NAME,
  description: "A private record of every film you've watched.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${inter.variable}`}>
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
