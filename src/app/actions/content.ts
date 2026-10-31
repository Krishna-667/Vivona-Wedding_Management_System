"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export interface ContentActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export async function updatePackageAction(
  packageId: string,
  payload: {
    name: string;
    tagline?: string;
    description?: string;
    starting_price_paise: number | bigint;
    inclusions: string[];
    is_active: boolean;
  }
): Promise<ContentActionResult<void>> {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") {
    return { ok: false, error: "Unauthorized: Admin privileges required." };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("packages")
    .update({
      name: payload.name,
      tagline: payload.tagline || null,
      description: payload.description || null,
      starting_price_paise: payload.starting_price_paise,
      inclusions: payload.inclusions,
      is_active: payload.is_active,
    })
    .eq("id", packageId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/packages");
  revalidatePath("/book");

  return { ok: true, data: undefined };
}

export async function createSocialProofAction(payload: {
  platform: string;
  handle: string;
  author_name: string;
  post_url: string;
  thumbnail_url?: string;
  caption: string;
  rating?: number;
  featured: boolean;
}): Promise<ContentActionResult<{ id: string }>> {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") {
    return { ok: false, error: "Unauthorized: Admin privileges required." };
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("social_proof")
    .insert({
      platform: payload.platform,
      handle: payload.handle,
      author_name: payload.author_name,
      post_url: payload.post_url,
      thumbnail_url: payload.thumbnail_url || null,
      caption: payload.caption,
      rating: payload.rating || 5,
      featured: payload.featured,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message || "Failed to create social proof citation." };
  }

  revalidatePath("/");
  revalidatePath("/social-proof");

  return { ok: true, data: { id: data.id } };
}

export async function deleteSocialProofAction(id: string): Promise<ContentActionResult<void>> {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") {
    return { ok: false, error: "Unauthorized: Admin privileges required." };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("social_proof").delete().eq("id", id);
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/social-proof");

  return { ok: true, data: undefined };
}
