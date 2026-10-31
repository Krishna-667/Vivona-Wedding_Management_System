import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/database";

export interface SessionProfileResult {
  user: {
    id: string;
    email?: string;
  };
  profile: Profile;
}

export async function getSessionProfile(): Promise<SessionProfileResult | null> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
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
      ...(profile as Profile),
      role: resolvedRole,
    },
  };
}

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
