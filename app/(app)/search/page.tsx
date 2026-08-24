import { copy } from "@/lib/copy";

export default function SearchPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <p className="text-body text-label-2 max-w-[32ch] text-center">
        {copy.placeholder.search}
      </p>
    </div>
  );
}
