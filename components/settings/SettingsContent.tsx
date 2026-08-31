"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/client";
import { useTheme, type ThemePreference } from "@/components/providers/ThemeProvider";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { Button } from "@/components/ui/Button";
import { copy } from "@/lib/copy";
import { APP_NAME } from "@/lib/constants";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: copy.settings.appearanceSystem },
  { value: "light", label: copy.settings.appearanceLight },
  { value: "dark", label: copy.settings.appearanceDark },
];

export function SettingsContent({
  email,
  userId,
  initialPublicStats,
}: {
  email: string;
  userId: string;
  initialPublicStats: boolean;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [publicStats, setPublicStats] = useState(initialPublicStats);
  const [copied, setCopied] = useState(false);
  // Starts as the origin-less relative path on both server and initial
  // client render (so they match), then fills in the real origin after
  // mount — window.location isn't available during SSR, and branching
  // render output on typeof window is exactly what causes a hydration
  // mismatch (the server and the first client render must produce
  // identical output; only an effect runs after that).
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const publicStatsUrl = `${origin}/u/${userId}/stats`;

  async function handleTogglePublicStats() {
    const next = !publicStats;
    setPublicStats(next); // optimistic — this toggle has no failure mode worth blocking on
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ publicStats: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setPublicStats(!next);
    }
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(publicStatsUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error();
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/sign-in");
      router.refresh();
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-4 pt-8 pb-16 md:px-9">
      <h1 className="text-display-2 mb-8">{copy.settings.title}</h1>

      <Section title={copy.settings.accountSection}>
        <p className="text-body text-label-2">
          {copy.settings.signedInAs} <span className="text-label">{email}</span>
        </p>
        <button type="button" onClick={handleSignOut} className="text-body text-accent-text mt-3 text-left">
          {copy.account.signOut}
        </button>
      </Section>

      <Section title={copy.settings.appearanceSection}>
        <div className="bg-surface-1 flex gap-1 rounded-md p-1">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={clsx(
                "text-footnote min-h-9 flex-1 rounded-sm px-3 py-1.5",
                theme === option.value ? "bg-accent text-on-accent" : "text-label-2",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title={copy.settings.importSection}>
        <p className="text-body text-label-2 mb-3">{copy.settings.importDescription}</p>
        <Link href="/settings/import">
          <Button variant="secondary">{copy.import.title}</Button>
        </Link>
      </Section>

      <Section title={copy.settings.exportSection}>
        <p className="text-body text-label-2 mb-3">{copy.settings.exportDescription}</p>
        <div className="flex gap-2">
          <a href="/api/export?format=json" download>
            <Button variant="secondary">{copy.settings.exportJson}</Button>
          </a>
          <a href="/api/export?format=csv" download>
            <Button variant="secondary">{copy.settings.exportCsv}</Button>
          </a>
        </div>
      </Section>

      <Section title={copy.settings.publicStatsSection}>
        <p className="text-body text-label-2 mb-3">{copy.settings.publicStatsDescription}</p>
        <button
          type="button"
          onClick={handleTogglePublicStats}
          role="switch"
          aria-checked={publicStats}
          className={clsx(
            "flex h-7 w-12 items-center rounded-full p-1 transition-colors duration-(--t-hover)",
            publicStats ? "bg-accent" : "bg-surface-2",
          )}
        >
          <span
            className={clsx(
              "h-5 w-5 rounded-full bg-white transition-transform duration-(--t-hover)",
              publicStats && "translate-x-5",
            )}
          />
          <span className="sr-only">{copy.settings.publicStatsToggleLabel}</span>
        </button>

        {publicStats && (
          <div className="mt-4">
            <p className="text-footnote text-label-3 mb-1.5">{copy.settings.publicStatsUrlLabel}</p>
            <div className="flex items-center gap-2">
              <code className="text-footnote bg-surface-2 text-label truncate rounded-xs px-2 py-1.5">
                {publicStatsUrl}
              </code>
              <Button variant="secondary" onClick={handleCopyLink} className="shrink-0">
                {copied ? copy.settings.publicStatsCopied : copy.settings.publicStatsCopyLink}
              </Button>
            </div>
          </div>
        )}
      </Section>

      <Section title={copy.settings.aboutSection}>
        <Image src="/tmdb-logo.svg" alt="TMDB" width={140} height={10} className="mb-3 h-auto w-32" />
        <p className="text-footnote text-label-2 max-w-[48ch]">{copy.settings.tmdbAttribution}</p>
      </Section>

      <Section title={copy.settings.dangerSection}>
        <button type="button" onClick={() => setDeleteOpen(true)} className="text-body text-danger">
          {copy.settings.deleteAccount}
        </button>
      </Section>

      <p className="text-caption text-label-3 mt-4">{APP_NAME}</p>

      <ConfirmSheet
        open={deleteOpen}
        title={copy.settings.deleteAccountConfirmTitle}
        body={copy.settings.deleteAccountConfirmBody}
        confirmLabel={deleting ? "…" : copy.settings.deleteAccountAction}
        onConfirm={handleDeleteAccount}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-separator mb-8 border-b pb-8 last:border-0">
      <h2 className="text-title-2 mb-3">{title}</h2>
      {children}
    </div>
  );
}
