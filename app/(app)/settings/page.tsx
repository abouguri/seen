import { createClient } from "@/lib/supabase/server";
import { SettingsContent } from "@/components/settings/SettingsContent";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: settings } = user
    ? await supabase.from("user_settings").select("public_stats").eq("user_id", user.id).maybeSingle()
    : { data: null };

  return (
    <SettingsContent
      email={user?.email ?? ""}
      userId={user?.id ?? ""}
      initialPublicStats={settings?.public_stats ?? false}
    />
  );
}
