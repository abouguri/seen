"use client";

import { useState } from "react";
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

export function SettingsContent({ email }: { email: string }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    <div className="flex flex-1 flex-col overflow-y-auto px-4 pt-8 pb-16 md:px-8">
      <h1 className="text-large-title mb-8">{copy.settings.title}</h1>

      <Section title={copy.settings.accountSection}>
        <p className="text-body text-label-2">
          {copy.settings.signedInAs} <span className="text-label">{email}</span>
        </p>
        <button type="button" onClick={handleSignOut} className="text-body text-accent mt-3 text-left">
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
