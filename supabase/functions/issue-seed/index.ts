/* issue-seed — Cấp hạt giống cho một ván xếp hạng.
 *
 * Hạt giống do máy chủ cấp là lớp phòng thủ chặn ba chiêu mà việc "chạy lại
 * ván để tính điểm" không chặn nổi:
 *   1. lấy ván của người khác gửi như của mình  → hạt giống không phải của bạn
 *   2. gửi cùng một ván nhiều lần                → hạt giống dùng một lần rồi huỷ
 *   3. tính sẵn một ván hoàn hảo rồi mới gửi     → chưa biết hạt giống thì tính sao
 */
import {
  preflight, json, fail, serviceClient, currentUser, withinLimit, SEED_TTL_MINUTES,
} from "../_shared/api.ts";

/** Đủ rộng cho một ván đang chơi + một ván đã lấy trước. Không cho tích trữ
 *  hàng chục hạt giống rồi chọn cái nào dễ ăn điểm nhất. */
const MAX_LIVE_SEEDS = 2;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return fail(req, "method", "Chỉ nhận POST", 405);

  const db = serviceClient();
  const user = await currentUser(req, db);
  if (!user) return fail(req, "unauthorized", "Cần đăng nhập", 401);

  // 60 hạt giống mỗi giờ. Chơi thật nhanh cũng không tới, nhưng đủ chặn kịch bản
  // ai đó viết chương trình xin hạt giống liên tục để đốt hết gói miễn phí.
  if (!await withinLimit(db, user.id, "seed", 60, 3600))
    return fail(req, "rate_limited", "Xin hạt giống quá nhanh, thử lại sau", 429);

  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  const expiresAt = new Date(Date.now() + SEED_TTL_MINUTES * 60_000).toISOString();

  const { data: row, error } = await db
    .from("seeds")
    .insert({ user_id: user.id, seed, expires_at: expiresAt })
    .select("id, seed, expires_at")
    .single();

  if (error) {
    console.error("không cấp được hạt giống:", error.message);
    return fail(req, "server", "Không cấp được hạt giống", 500);
  }

  await expireExtraSeeds(db, user.id, row.id);

  return json(req, { seedId: row.id, seed: Number(row.seed), expiresAt: row.expires_at });
});

/** Cho hết hạn những hạt giống chưa dùng cũ hơn, chỉ chừa lại MAX_LIVE_SEEDS cái mới nhất. */
async function expireExtraSeeds(db: ReturnType<typeof serviceClient>, userId: string, keepId: string) {
  const { data } = await db
    .from("seeds")
    .select("id")
    .eq("user_id", userId)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (!data || data.length <= MAX_LIVE_SEEDS) return;
  const stale = data.slice(MAX_LIVE_SEEDS).map((r) => r.id).filter((id) => id !== keepId);
  if (stale.length === 0) return;
  await db.from("seeds").update({ expires_at: new Date().toISOString() }).in("id", stale);
}
