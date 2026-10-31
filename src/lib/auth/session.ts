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

  if (!profile) {
    return null;
  }

  let resolvedRole = (profile?.role as UserRole) || "client";
  if (user.email === "admin@vivona.demo") {
    resolvedRole = "admin";
  } else if (user.email?.startsWith("planner") || user.email?.includes("planner")) {
    resolvedRole = "employee";
  }

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    profile: {
      ...profile,
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
