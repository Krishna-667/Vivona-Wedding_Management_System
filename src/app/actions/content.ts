"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth/session";
import { withUser } from "@/lib/db/with-user";

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

  return withUser(session.profile.id, async (sql) => {
    await sql`
      UPDATE public.packages
      SET
        name = ${payload.name},
        tagline = ${payload.tagline || null},
        description = ${payload.description || null},
        starting_price_paise = ${payload.starting_price_paise},
        inclusions = ${sql.json(payload.inclusions)},
        is_active = ${payload.is_active},
        updated_at = NOW()
      WHERE id = ${packageId}
    `;

    revalidatePath("/");
    revalidatePath("/packages");
    revalidatePath("/book");

    return { ok: true, data: undefined };
  });
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

  return withUser(session.profile.id, async (sql) => {
    const [row] = await sql`
      INSERT INTO public.social_proof (
        platform, handle, author_name, post_url, thumbnail_url, caption, rating, featured
      ) VALUES (
        ${payload.platform}, ${payload.handle}, ${payload.author_name},
        ${payload.post_url}, ${payload.thumbnail_url || null}, ${payload.caption},
        ${payload.rating || 5}, ${payload.featured}
      )
      RETURNING id
    `;

    revalidatePath("/");
    revalidatePath("/social-proof");

    return { ok: true, data: { id: row.id } };
  });
}

export async function deleteSocialProofAction(id: string): Promise<ContentActionResult<void>> {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") {
    return { ok: false, error: "Unauthorized: Admin privileges required." };
  }

  return withUser(session.profile.id, async (sql) => {
    await sql`DELETE FROM public.social_proof WHERE id = ${id}`;

    revalidatePath("/");
    revalidatePath("/social-proof");

    return { ok: true, data: undefined };
  });
}
