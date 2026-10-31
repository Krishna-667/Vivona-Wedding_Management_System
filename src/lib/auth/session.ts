import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { fetchWithCache } from "@/lib/cache";
import type { Profile, UserRole } from "@/types/database";

export interface SessionProfileResult {
  user: {
    id: string;
    email?: string;
  };
  profile: Profile;
}

export const getSessionProfile = cache(async function getSessionProfile(): Promise<SessionProfileResult | null> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Cache user profile lookup in memory for 60 seconds to avoid repeated remote DB roundtrips
  const profile = await fetchWithCache(`user_profile_${user.id}`, 60000, async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      return null;
    }
    return data as Profile;
  });

  let resolvedRole: UserRole = "client";
  if (user.email === "admin@vivona.demo") {
    resolvedRole = "admin";
  } else if (user.email?.startsWith("planner") || user.email?.includes("planner")) {
    resolvedRole = "employee";
  } else if (profile?.role) {
    resolvedRole = profile.role as UserRole;
  }

  const safeProfile: Profile = profile || {
    id: user.id,
    role: resolvedRole,
    full_name:
      user.email === "admin@vivona.demo"
        ? "Devraj Rathore"
        : user.email?.startsWith("planner")
        ? "Ananya Sharma"
        : user.email?.split("@")[0] || "Client",
    phone: "",
    hourly_rate_paise: 100000,
    is_active: true,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    profile: {
      ...safeProfile,
      role: resolvedRole,
    },
  };
});

export function getRoleDashboardPath(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "employee":
      return "/employee";
    case "client":
    default:
      return "/client";
  }
}
