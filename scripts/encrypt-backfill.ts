import postgres from "postgres";
import * as dotenv from "dotenv";
import {
  encryptField,
  computeBlindIndex,
  isEncrypted,
} from "../src/lib/crypto/field-encryption";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const DATABASE_URL =
  process.env.DATABASE_SERVICE_URL ||
  "postgres://vivona_service:ChangeMe_Service#2026@127.0.0.1:5432/vivona";

async function backfillEncryption() {
  console.log("🔒 Starting Field Encryption Backfill with AES-256-GCM...");

  const sql = postgres(DATABASE_URL);

  // 1. profiles: phone
  const profiles = await sql`SELECT id, phone, phone_bidx FROM public.profiles`;
  let profCount = 0;
  for (const p of profiles) {
    let updateNeeded = false;
    let encPhone = p.phone;
    let bidxPhone = p.phone_bidx;

    if (p.phone && !isEncrypted(p.phone)) {
      encPhone = encryptField("profiles", "phone", p.phone);
      bidxPhone = computeBlindIndex(p.phone);
      updateNeeded = true;
    } else if (p.phone && !p.phone_bidx) {
      // Recompute blind index if missing
      bidxPhone = computeBlindIndex(p.phone);
      updateNeeded = true;
    }

    if (updateNeeded) {
      await sql`
        UPDATE public.profiles
        SET phone = ${encPhone}, phone_bidx = ${bidxPhone}
        WHERE id = ${p.id}
      `;
      profCount++;
    }
  }
  console.log(`✓ Backfilled ${profCount} profiles.`);

  // 2. enquiries: contact_phone, contact_email, notes
  const enquiries = await sql`
    SELECT id, contact_phone, contact_email, notes, contact_phone_bidx, contact_email_bidx
    FROM public.enquiries
  `;
  let enqCount = 0;
  for (const e of enquiries) {
    let updateNeeded = false;
    let encPhone = e.contact_phone;
    let encEmail = e.contact_email;
    let encNotes = e.notes;
    let bidxPhone = e.contact_phone_bidx;
    let bidxEmail = e.contact_email_bidx;

    if (e.contact_phone && !isEncrypted(e.contact_phone)) {
      encPhone = encryptField("enquiries", "contact_phone", e.contact_phone);
      bidxPhone = computeBlindIndex(e.contact_phone);
      updateNeeded = true;
    }
    if (e.contact_email && !isEncrypted(e.contact_email)) {
      encEmail = encryptField("enquiries", "contact_email", e.contact_email);
      bidxEmail = computeBlindIndex(e.contact_email);
      updateNeeded = true;
    }
    if (e.notes && !isEncrypted(e.notes)) {
      encNotes = encryptField("enquiries", "notes", e.notes);
      updateNeeded = true;
    }

    if (updateNeeded) {
      await sql`
        UPDATE public.enquiries
        SET contact_phone = ${encPhone},
            contact_email = ${encEmail},
            notes = ${encNotes},
            contact_phone_bidx = ${bidxPhone},
            contact_email_bidx = ${bidxEmail}
        WHERE id = ${e.id}
      `;
      enqCount++;
    }
  }
  console.log(`✓ Backfilled ${enqCount} enquiries.`);

  // 3. vendors: phone, email
  const vendors = await sql`
    SELECT id, phone, email, phone_bidx, email_bidx
    FROM public.vendors
  `;
  let venCount = 0;
  for (const v of vendors) {
    let updateNeeded = false;
    let encPhone = v.phone;
    let encEmail = v.email;
    let bidxPhone = v.phone_bidx;
    let bidxEmail = v.email_bidx;

    if (v.phone && !isEncrypted(v.phone)) {
      encPhone = encryptField("vendors", "phone", v.phone);
      bidxPhone = computeBlindIndex(v.phone);
      updateNeeded = true;
    }
    if (v.email && !isEncrypted(v.email)) {
      encEmail = encryptField("vendors", "email", v.email);
      bidxEmail = computeBlindIndex(v.email);
      updateNeeded = true;
    }

    if (updateNeeded) {
      await sql`
        UPDATE public.vendors
        SET phone = ${encPhone},
            email = ${encEmail},
            phone_bidx = ${bidxPhone},
            email_bidx = ${bidxEmail}
        WHERE id = ${v.id}
      `;
      venCount++;
    }
  }
  console.log(`✓ Backfilled ${venCount} vendors.`);

  // 4. agreements: signer_meta (ip, user_agent)
  const agreements = await sql`SELECT id, signer_meta FROM public.agreements`;
  let agrCount = 0;
  for (const a of agreements) {
    if (a.signer_meta && typeof a.signer_meta === "object") {
      let updateNeeded = false;
      const meta = { ...(a.signer_meta as Record<string, any>) };
      if (meta.ip && !isEncrypted(meta.ip)) {
        meta.ip = encryptField("agreements", "signer_ip", meta.ip);
        updateNeeded = true;
      }
      if (meta.user_agent && !isEncrypted(meta.user_agent)) {
        meta.user_agent = encryptField("agreements", "signer_user_agent", meta.user_agent);
        updateNeeded = true;
      }
      if (updateNeeded) {
        await sql`
          UPDATE public.agreements
          SET signer_meta = ${sql.json(meta)}
          WHERE id = ${a.id}
        `;
        agrCount++;
      }
    }
  }
  console.log(`✓ Backfilled ${agrCount} agreements.`);

  // 5. client_receipts: reference
  const receipts = await sql`SELECT id, reference FROM public.client_receipts`;
  let recCount = 0;
  for (const r of receipts) {
    if (r.reference && !isEncrypted(r.reference)) {
      const encRef = encryptField("client_receipts", "reference", r.reference);
      await sql`
        UPDATE public.client_receipts
        SET reference = ${encRef}
        WHERE id = ${r.id}
      `;
      recCount++;
    }
  }
  console.log(`✓ Backfilled ${recCount} client receipts.`);

  // 6. vendor_payments: reference
  const vPayments = await sql`SELECT id, reference FROM public.vendor_payments`;
  let vpCount = 0;
  for (const vp of vPayments) {
    if (vp.reference && !isEncrypted(vp.reference)) {
      const encRef = encryptField("vendor_payments", "reference", vp.reference);
      await sql`
        UPDATE public.vendor_payments
        SET reference = ${encRef}
        WHERE id = ${vp.id}
      `;
      vpCount++;
    }
  }
  console.log(`✓ Backfilled ${vpCount} vendor payments.`);

  // 7. messages: body
  const messages = await sql`SELECT id, body FROM public.messages`;
  let msgCount = 0;
  for (const m of messages) {
    if (m.body && !isEncrypted(m.body)) {
      const encBody = encryptField("messages", "body", m.body);
      await sql`
        UPDATE public.messages
        SET body = ${encBody}
        WHERE id = ${m.id}
      `;
      msgCount++;
    }
  }
  console.log(`✓ Backfilled ${msgCount} messages.`);

  await sql.end();
  console.log("✅ Field Encryption Backfill Completed Successfully!");
}

backfillEncryption().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
