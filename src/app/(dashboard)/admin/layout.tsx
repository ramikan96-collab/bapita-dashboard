import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const ADMIN_EMAILS = ["ramikan96@gmail.com", "info.bapita@gmail.com"];
  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
    redirect("/calendar");
  }

  return <>{children}</>;
}
