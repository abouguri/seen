"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { copy } from "@/lib/copy";

/**
 * Small clipboard island for a stats page's shareable URL — same
 * copy-then-flash-"Copied" behavior as SettingsContent's public-stats
 * link, factored out so this year page doesn't duplicate it inline.
 *
 * Takes a relative `path`, not a full URL: window.location.origin is
 * only ever read inside the click handler (never rendered), so there's
 * nothing here that can mismatch between server and client render —
 * unlike SettingsContent's displayed URL, which needed a post-mount
 * effect for exactly that reason.
 */
export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="secondary" onClick={handleCopy}>
      {copied ? copy.stats.linkCopied : copy.stats.copyLink}
    </Button>
  );
}
