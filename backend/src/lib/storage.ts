/**
 * Storage abstraction. Defaults to local disk (fine for a hackathon demo —
 * files are served from /uploads via express.static, see src/index.ts).
 *
 * For a real deployment, set STORAGE_DRIVER=s3 or STORAGE_DRIVER=supabase in
 * .env and implement uploadBuffer()/getSignedUrl() below using the AWS SDK or
 * @supabase/supabase-js — the interface is intentionally minimal so either
 * swaps in without touching route code.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";

const driver = process.env.STORAGE_DRIVER || "local";
const localDir = process.env.LOCAL_UPLOAD_DIR || "./uploads";

export function sha256Hex(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function uploadBuffer(
  buffer: Buffer,
  relativePath: string
): Promise<{ filePath: string; url: string }> {
  if (driver === "local") {
    const fullPath = path.join(localDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, buffer);
    return { filePath: relativePath, url: `/uploads/${relativePath}` };
  }
  throw new Error(
    `STORAGE_DRIVER="${driver}" is not implemented yet — add an S3 or Supabase ` +
      `client here. Files must go to a PRIVATE bucket; never expose inspection ` +
      `photos publicly. Use signed URLs (getSignedUrl below) at read time.`
  );
}

export async function getSignedUrl(filePath: string): Promise<string> {
  if (driver === "local") return `/uploads/${filePath}`;
  throw new Error(`STORAGE_DRIVER="${driver}" signed URL generation not implemented yet.`);
}
