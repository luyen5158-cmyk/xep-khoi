/* api.ts — Những thứ cả ba Edge Function đều cần: CORS, xác định người gọi,
 * giới hạn số lần, và các con số chặn dữ liệu quá khổ.
 */

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

/* ---------- Các con số chặn (INFRA.md mục 15c) ---------- */

/** Gói dữ liệu lớn hơn mức này là bị từ chối trước khi đọc tới nội dung. */
export const MAX_BODY_BYTES = 96 * 1024;

/** Một ván dài nhất mà con người chơi nổi còn xa mới tới đây. Không có mức
 *  chặn này, ai đó gửi ván "một triệu nước" là máy chủ ngồi chạy cả triệu nước. */
export const MAX_MOVES = 4000;

/** Hạt giống sống 2 tiếng. Đủ cho một ván dài, ngắn đủ để không tích trữ được. */
export const SEED_TTL_MINUTES = 120;

/* ---------- CORS ----------
 * Trình duyệt gửi trước một yêu cầu OPTIONS để hỏi "cho phép không?".
 * Edge Function KHÔNG tự trả lời câu hỏi đó — phải viết tay. Quên là điểm
 * không bao giờ gửi lên được, mà thông báo lỗi lại chẳng liên quan gì.
 */
const ALLOWED_ORIGINS = [
  "https://luyen5158-cmyk.github.io",
  "http://localhost:8777",
  "http://127.0.0.1:8777",
];

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

/** Trả về Response cho yêu cầu thăm dò OPTIONS, hoặc null nếu không phải. */
export function preflight(req: Request): Response | null {
  return req.method === "OPTIONS" ? new Response("ok", { headers: corsHeaders(req) }) : null;
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

export function fail(req: Request, code: string, message: string, status = 400): Response {
  return json(req, { error: code, message }, status);
}

/* ---------- Kết nối bằng service_role ----------
 * Khoá này bỏ qua mọi khoá quyền. Nó CHỈ được sống ở đây, không bao giờ
 * xuất hiện trong thư mục game/.
 */
export function serviceClient(): SupabaseClient {
  /* Supabase có hai đời khoá bí mật: `service_role` (JWT đời cũ) và
     `sb_secret_...` (đời mới). Dự án mở gần đây dùng đời mới. Thử lần lượt cả
     ba tên biến để khỏi phụ thuộc vào việc dự án thuộc đời nào.
     Nếu cả ba đều trống, đặt tay một lần bằng:
       supabase secrets set SB_SECRET_KEY=sb_secret_... */
  const key =
    Deno.env.get("SB_SECRET_KEY") ??
    Deno.env.get("SUPABASE_SECRET_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!key) throw new Error("thiếu khoá bí mật: đặt SB_SECRET_KEY cho project");

  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    key,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** Lấy người dùng từ header Authorization. Trả về null nếu không hợp lệ. */
export async function currentUser(req: Request, db: SupabaseClient) {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

/** Đọc body JSON nhưng chặn trước nếu quá khổ. */
export async function readBody(req: Request): Promise<unknown> {
  const declared = Number(req.headers.get("Content-Length") ?? "0");
  if (declared > MAX_BODY_BYTES) throw new Error("body_too_large");
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new Error("body_too_large");
  try {
    return JSON.parse(text || "{}");
  } catch {
    throw new Error("bad_json");
  }
}

/* ---------- Giới hạn số lần ----------
 * Phép đếm nằm trong cơ sở dữ liệu, KHÔNG nằm trong bộ nhớ. Mỗi lần Edge
 * Function chạy là một môi trường mới hoàn toàn — biến đếm trong bộ nhớ về 0
 * ngay lập tức, đếm bao nhiêu cũng vô nghĩa.
 */
export async function withinLimit(
  db: SupabaseClient,
  userId: string,
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await db.rpc("bump_rate_limit", {
    p_user: userId,
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("bump_rate_limit lỗi:", error.message);
    return false;   // đếm hỏng thì từ chối, an toàn hơn là cho qua
  }
  return data === true;
}
