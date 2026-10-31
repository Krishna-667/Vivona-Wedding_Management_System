import { type NextRequest, NextResponse } from "next/server";
import * as fs from "node:fs";
import * as path from "node:path";
import { getSessionProfile } from "@/lib/auth/session";
import { withUser, withAnon } from "@/lib/db/with-user";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const fileId = params.id;
  const session = await getSessionProfile();

  // 1. Fetch file metadata
  const fileMeta = await (session
    ? withUser(session.profile.id, async (sql) => {
        const [row] = await sql`
          SELECT id, bucket, owner_id, wedding_id, original_name, mime_type, size_bytes, is_public, storage_path
          FROM public.files
          WHERE id = ${fileId}
        `;
        return row;
      })
    : withAnon(async (sql) => {
        const [row] = await sql`
          SELECT id, bucket, owner_id, wedding_id, original_name, mime_type, size_bytes, is_public, storage_path
          FROM public.files
          WHERE id = ${fileId} AND is_public = true
        `;
        return row;
      }));

  if (!fileMeta) {
    return new NextResponse("File not found or unauthorized", { status: 404 });
  }

  // 2. Resolve local file path
  const fullPath = path.resolve(process.cwd(), fileMeta.storage_path);
  if (!fs.existsSync(fullPath)) {
    return new NextResponse("File not found on storage", { status: 404 });
  }

  // 3. Stream file contents
  const fileBuffer = fs.readFileSync(fullPath);

  const headers = new Headers();
  headers.set("Content-Type", fileMeta.mime_type || "application/octet-stream");
  headers.set("Content-Length", fileBuffer.length.toString());
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set(
    "Content-Disposition",
    `inline; filename="${encodeURIComponent(fileMeta.original_name)}"`
  );

  return new NextResponse(fileBuffer, {
    status: 200,
    headers,
  });
}
