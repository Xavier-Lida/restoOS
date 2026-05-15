import { redirect } from "next/navigation";

import { isAdminEmail } from "@/lib/admin/emails";
import { createClient } from "@/lib/supabase/server";

export async function assertAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  if (!isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  return { supabase, user };
}
