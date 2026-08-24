import { ImportFlow } from "@/components/import/ImportFlow";
import { copy } from "@/lib/copy";

export default function ImportPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <h1 className="text-large-title px-4 pt-8 pb-4 md:px-8">{copy.import.title}</h1>
      <ImportFlow />
    </div>
  );
}
