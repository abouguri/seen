import { createClient } from "@/lib/supabase/server";
import { SettingsContent } from "@/components/settings/SettingsContent";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <SettingsContent email={user?.email ?? ""} />;
}
