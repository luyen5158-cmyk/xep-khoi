/* submit-score — Nhận bản ghi ván đấu, tự chạy lại, tự tính điểm, rồi mới ghi.
 *
 * Nguyên tắc duy nhất của file này: KHÔNG TIN BẤT KỲ CON SỐ NÀO do trình duyệt
 * gửi lên. Điểm mà client nói là bao nhiêu cũng không được đọc tới — máy chủ
 * chạy lại nguyên ván bằng chính bộ luật trong _shared/engine rồi tự tính.
 */
import {
  preflight, json, fail, serviceClient, currentUser, readBody, withinLimit, MAX_MOVES,
} from "../_shared/api.ts";
import { simulate } from "../_shared/engine/sim.js";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return fail(req, "method", "Chỉ nhận POST", 405);

  const db = serviceClient();
  const user = await currentUser(req, db);
  if (!user) return fail(req, "unauthorized", "Cần đăng nhập", 401);

  if (!await withinLimit(db, user.id, "submit", 60, 3600))
    return fail(req, "rate_limited", "Gửi điểm quá nhanh, thử lại sau", 429);

  let body: any;
  try {
    body = await readBody(req);
  } catch (e) {
    const code = (e as Error).message;
    return fail(req, code, code === "body_too_large" ? "Gói dữ liệu quá lớn" : "Dữ liệu hỏng", 413);
  }

  const seedId: string = body?.seedId ?? "";
  const replay = body?.replay;
  const shapeError = checkShape(seedId, replay);
  if (shapeError) return fail(req, "bad_replay", shapeError);

  /* Chưa đặt biệt danh thì chưa lên bảng được — bảng xếp hạng nối scores với
     profiles, thiếu biệt danh là có điểm mà không ai thấy tên. Kiểm tra TRƯỚC
     khi nhận hạt giống để không đốt oan một hạt giống. */
  const { data: profile } = await db
    .from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (!profile)
    return fail(req, "no_nickname", "Hãy đặt biệt danh trước khi lên bảng xếp hạng", 409);

  /* Nhận hạt giống VÀ đánh dấu đã dùng trong đúng một câu lệnh. Làm hai bước
     riêng sẽ hở: hai lời gọi cùng lúc có thể cùng thấy "chưa dùng". Điều kiện
     used_at is null nằm ngay trong câu UPDATE nên chỉ một bên thắng. */
  const now = new Date().toISOString();
  const { data: claimed, error: claimErr } = await db
    .from("seeds")
    .update({ used_at: now })
    .eq("id", seedId)
    .eq("user_id", user.id)
    .is("used_at", null)
    .gt("expires_at", now)
    .select("seed")
    .maybeSingle();

  if (claimErr) {
    console.error("không nhận được hạt giống:", claimErr.message);
    return fail(req, "server", "Lỗi máy chủ", 500);
  }
  if (!claimed)
    return fail(req, "seed_invalid", "Hạt giống không hợp lệ, đã dùng hoặc đã hết hạn", 409);

  if (Number(claimed.seed) !== Number(replay.seed))
    return fail(req, "seed_mismatch", "Bản ghi không khớp hạt giống được cấp");

  /* Chạy lại nguyên ván. Từ đây trở xuống chỉ dùng con số do chính máy chủ tính. */
  const result = simulate({ seed: Number(claimed.seed), moves: replay.moves });
  if (!result.valid) return fail(req, "replay_invalid", "Bản ghi không hợp lệ: " + result.reason);
  if (!result.ended) return fail(req, "replay_unfinished", "Ván chưa thật sự hết nước đi");

  const score = result.score;

  const { data: prev } = await db
    .from("scores").select("score").eq("user_id", user.id).maybeSingle();

  const isNewBest = !prev || score > prev.score;

  if (isNewBest) {
    const { error: upErr } = await db.from("scores").upsert({
      user_id: user.id,
      score,
      level: result.level,
      moves: result.moves,
      achieved_at: now,
    });
    if (upErr) {
      console.error("không ghi được điểm:", upErr.message);
      return fail(req, "server", "Không ghi được điểm", 500);
    }
    // Chỉ giữ ván kỷ lục. Ván thường không lưu.
    await db.from("replays").upsert({
      user_id: user.id,
      seed: Number(claimed.seed),
      moves: replay.moves,
      score,
      created_at: now,
    });
  }

  const { data: rankRows } = await db.rpc("player_rank", { p_user: user.id });
  const rank = Array.isArray(rankRows) && rankRows.length ? rankRows[0] : null;

  return json(req, {
    score,
    isNewBest,
    best: isNewBest ? score : prev.score,
    rank: rank?.rank ?? null,
    total: rank?.total ?? null,
  });
});

/** Chặn dữ liệu quá khổ và sai hình dạng TRƯỚC khi chạy mô phỏng. Thiếu bước
 *  này thì một ván giả "một triệu nước" đủ khiến máy chủ ngồi chạy cả triệu nước. */
function checkShape(seedId: string, replay: any): string | null {
  if (typeof seedId !== "string" || seedId.length !== 36) return "Thiếu mã hạt giống";
  if (!replay || typeof replay !== "object") return "Thiếu bản ghi ván đấu";
  if (!Number.isInteger(replay.seed)) return "Hạt giống sai kiểu";
  if (!Array.isArray(replay.moves)) return "Danh sách nước đi sai kiểu";
  if (replay.moves.length > MAX_MOVES) return "Ván quá dài";
  for (const m of replay.moves) {
    if (!Array.isArray(m) || m.length !== 3) return "Nước đi sai định dạng";
    const [i, r, c] = m;
    if (!Number.isInteger(i) || i < 0 || i > 2)  return "Ô khay ngoài phạm vi";
    if (!Number.isInteger(r) || r < 0 || r > 7)  return "Hàng ngoài phạm vi";
    if (!Number.isInteger(c) || c < 0 || c > 7)  return "Cột ngoài phạm vi";
  }
  return null;
}
