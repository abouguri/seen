"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { useToast } from "@/components/ui/Toast";
import { copy } from "@/lib/copy";

type RemoveFromLibraryButtonProps = {
  mediaType: "movie" | "show";
  id: number;
  title: string;
  watchCount: number;
  /** Called only after a successful delete. Omit it (the page case) and
   *  the button navigates to /library itself, since there's no parent to
   *  hand control back to. The panel passes its own splice-and-close. */
  onRemoved?: () => void;
};

/**
 * "Remove from library," made visible (§ ROADMAP.md #3) — the feature
 * already worked via the library grid's right-click/long-press context
 * menu; this is a second, discoverable entry point mounted directly in
 * FilmDetailBody/ShowDetailBody. Same DELETE /api/library/[id] call and
 * ConfirmSheet the context-menu path already uses.
 */
export function RemoveFromLibraryButton({
  mediaType,
  id,
  title,
  watchCount,
  onRemoved,
}: RemoveFromLibraryButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const removeMutation = useMutation({
    mutationFn: async () => {
      const query = mediaType === "show" ? "?mediaType=show" : "";
      const res = await fetch(`/api/library/${id}${query}`, { method: "DELETE" });
      if (!res.ok) throw new Error(copy.errors.entrySaveFailed);
    },
    onSuccess: () => {
      if (onRemoved) onRemoved();
      else router.push("/library");
    },
    onError: () => showToast(copy.errors.entrySaveFailed),
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="text-footnote text-danger hover:text-danger-hi font-bold outline-offset-2"
      >
        {copy.library.contextMenu.remove}
      </button>

      <ConfirmSheet
        open={confirmOpen}
        title={copy.library.removeConfirmTitle(title, watchCount)}
        body={copy.library.removeConfirmBody}
        confirmLabel={copy.library.removeAction}
        onConfirm={() => removeMutation.mutate()}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
}
