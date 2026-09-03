/* profile — Đặt biệt danh và xoá tài khoản.
 *
 * Vì sao hai việc này cũng phải qua Edge Function: luật của dự án là KHÔNG AI
 * ghi thẳng vào bảng nào. Đổi lại, mọi kiểm tra (độ dài, trùng tên) đều nằm ở
 * chỗ người chơi không sửa được.
 */
import {
  preflight, json, fail, serviceClient, currentUser, readBody, withinLimit,
} from "../_shared/api.ts";

const NICK_MIN = 2;
const NICK_MAX = 16;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return fail(req, "method", "Chỉ nhận POST", 405);

  const db = serviceClient();
  const user = await currentUser(req, db);
  if (!user) return fail(req, "unauthorized", "Cần đăng nhập", 401);

  let body: any;
  try {
    body = await readBody(req);
  } catch {
    return fail(req, "bad_json", "Dữ liệu hỏng");
  }

  if (body?.action === "set-nickname")   return setNickname(req, db, user.id, body.nickname);
  if (body?.action === "delete-account") return deleteAccount(req, db, user.id);
  return fail(req, "bad_action", "Không hiểu yêu cầu");
});

async function setNickname(req: Request, db: any, userId: string, raw: unknown) {
  if (!await withinLimit(db, userId, "nickname", 10, 86400))
    return fail(req, "rate_limited", "Đổi biệt danh quá nhiều lần hôm nay", 429);

  const nickname = clean(String(raw ?? ""));
  const len = [...nickname].length;
  if (len < NICK_MIN || len > NICK_MAX)
    return fail(req, "bad_nickname", "Biệt danh phải dài " + NICK_MIN + "-" + NICK_MAX + " ký tự");

  const { error } = await db.from("profiles").upsert(
    { id: userId, nickname, updated_at: new Date().toISOString() },
    { onConflict: "id" },
  );

  if (error) {
    if (error.code === "23505") return fail(req, "nickname_taken", "Biệt danh này có người dùng rồi", 409);
    console.error("không lưu được biệt danh:", error.message);
    return fail(req, "server", "Không lưu được biệt danh", 500);
  }
  return json(req, { nickname });
}

/* Xoá tài khoản là xoá thật. Mọi bảng đều khai
   `references auth.users(id) on delete cascade`, nên xoá người dùng là điểm,
   bản ghi ván, hạt giống biến mất theo trong cùng một nhịp. */
async function deleteAccount(req: Request, db: any, userId: string) {
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) {
    console.error("không xoá được tài khoản:", error.message);
    return fail(req, "server", "Không xoá được tài khoản", 500);
  }
  return json(req, { deleted: true });
}

/* Bỏ ký tự điều khiển và ký tự đảo chiều chữ (loại có thể làm cả bảng xếp hạng
   hiển thị loạn xạ), rồi gộp mọi khoảng trắng thành một dấu cách.
   Đây KHÔNG phải bộ lọc từ bậy: dự án đã quyết định không lọc nội dung tên. */
function clean(s: string): string {
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0) as number;
    const invisible =
      cp < 0x20 || cp === 0x7f ||               // ký tự điều khiển
      (cp >= 0x200b && cp <= 0x200f) ||         // khoảng trắng rộng 0 + đánh dấu hướng
      (cp >= 0x202a && cp <= 0x202e) ||         // ép hướng chữ
      (cp >= 0x2066 && cp <= 0x2069) ||         // cô lập hướng chữ
      cp === 0xfeff;                            // dấu thứ tự byte
    if (!invisible) out += ch;
  }
  return out.replace(/\s+/g, " ").trim();
}
