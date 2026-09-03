/* config.js — Hai giá trị duy nhất cần điền tay để bật bảng xếp hạng.
 *
 * Lấy ở đâu: Supabase → Project Settings → API
 *   Project URL  →  SUPABASE_URL
 *   anon public  →  SUPABASE_ANON_KEY
 *
 * VIẾT THẲNG KHOÁ anon VÀO ĐÂY LÀ ĐÚNG, KHÔNG PHẢI SƠ SUẤT.
 * Nó không phải mật khẩu, chỉ là địa chỉ "gõ cửa cơ sở dữ liệu nào". Ai xem mã
 * nguồn cũng thấy, và điều đó không sao: thứ thật sự bảo vệ dữ liệu là khoá
 * quyền (RLS) trong supabase/schema.sql — có khoá anon cũng chỉ đọc được bảng
 * xếp hạng, không ghi được gì.
 *
 * Bí mật thật sự chỉ có service_role key. Nó KHÔNG BAO GIỜ được xuất hiện
 * trong thư mục game/. Chỗ duy nhất của nó là Edge Function.
 *
 * Để trống hai dòng dưới thì game vẫn chạy bình thường, mọi ván tự thành ván
 * luyện tập. Đó là trạng thái mặc định trước khi bạn mở dự án Supabase.
 */
"use strict";

export const SUPABASE_URL      = "";
export const SUPABASE_ANON_KEY = "";

/** Thời gian chờ tối đa cho mỗi lời gọi mạng. Bảng xếp hạng chậm thì thà báo
 *  "tạm thời không dùng được" còn hơn để người chơi ngồi nhìn màn hình đứng. */
export const NET_TIMEOUT_MS = 8000;

export function isConfigured() {
  return SUPABASE_URL !== "" && SUPABASE_ANON_KEY !== "";
}
