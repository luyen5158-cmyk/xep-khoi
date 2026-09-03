-- schema.sql — Toàn bộ cấu trúc cơ sở dữ liệu của bảng xếp hạng Xếp Khối.
--
-- Cách dùng: Supabase → SQL Editor → dán hết file này → Run.
-- Chạy lại được nhiều lần (idempotent), không mất dữ liệu đang có.
--
-- NGUYÊN TẮC KHÔNG ĐƯỢC PHÁ (xem INFRA.md mục 15):
--   Mọi bảng đều bật RLS. Người chơi CHỈ ĐƯỢC ĐỌC, KHÔNG BAO GIỜ ĐƯỢC GHI.
--   Mọi thao tác ghi đều đi qua Edge Function bằng service_role key.
--   Quên bật RLS = anon key công khai trở thành chìa vạn năng, ai cũng xoá sạch được.

-- ===========================================================================
-- 1. profiles — biệt danh người chơi tự đặt. Công khai đọc.
--    Ở đây KHÔNG có email, không có tên thật. Chỉ id và biệt danh.
-- ===========================================================================
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nickname   text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nickname_length check (char_length(nickname) between 2 and 16)
);

-- Không cho hai người trùng biệt danh (không phân biệt hoa thường).
-- Lý do: trên bảng xếp hạng, trùng tên là cách mạo danh dễ nhất.
create unique index if not exists profiles_nickname_key
  on public.profiles (lower(nickname));

-- ===========================================================================
-- 2. scores — MỘT dòng mỗi người, chỉ giữ điểm cao nhất. Công khai đọc.
-- ===========================================================================
create table if not exists public.scores (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  score       int         not null check (score >= 0),
  level       int         not null default 1,
  moves       int         not null default 0,
  achieved_at timestamptz not null default now()
);

-- Bằng điểm thì ai đạt trước xếp trên.
create index if not exists scores_rank_idx
  on public.scores (score desc, achieved_at asc);

-- ===========================================================================
-- 3. replays — ván kỷ lục của mỗi người. KHÔNG CÔNG KHAI.
--    Công khai = ai cũng tải ván của cao thủ về rồi gửi như của mình.
-- ===========================================================================
create table if not exists public.replays (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  seed       bigint      not null,
  moves      jsonb       not null,
  score      int         not null,
  created_at timestamptz not null default now()
);

-- ===========================================================================
-- 4. seeds — hạt giống do máy chủ cấp: gắn với người nhận, dùng một lần, có hạn.
--    KHÔNG CÔNG KHAI.
-- ===========================================================================
create table if not exists public.seeds (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  seed       bigint      not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at    timestamptz
);

create index if not exists seeds_user_idx   on public.seeds (user_id);
create index if not exists seeds_expiry_idx on public.seeds (expires_at) where used_at is null;

-- ===========================================================================
-- 5. rate_limits — đếm số lần gọi. PHẢI nằm trong cơ sở dữ liệu.
--    Đếm trong bộ nhớ Edge Function hoàn toàn vô dụng: mỗi lần gọi là một môi
--    trường mới, đếm xong là mất. Đây là cái bẫy kinh điển của serverless.
-- ===========================================================================
create table if not exists public.rate_limits (
  user_id      uuid        not null references auth.users(id) on delete cascade,
  bucket       text        not null,
  window_start timestamptz not null,
  count        int         not null default 0,
  primary key (user_id, bucket, window_start)
);

create index if not exists rate_limits_window_idx on public.rate_limits (window_start);

-- ===========================================================================
-- KHOÁ QUYỀN (RLS) — phần quan trọng nhất của cả file này.
-- ===========================================================================
alter table public.profiles    enable row level security;
alter table public.scores      enable row level security;
alter table public.replays     enable row level security;
alter table public.seeds       enable row level security;
alter table public.rate_limits enable row level security;

-- Chỉ hai bảng này được đọc công khai, và CHỈ ĐỌC.
drop policy if exists "ai cũng đọc được biệt danh" on public.profiles;
create policy "ai cũng đọc được biệt danh"
  on public.profiles for select using (true);

drop policy if exists "ai cũng đọc được bảng xếp hạng" on public.scores;
create policy "ai cũng đọc được bảng xếp hạng"
  on public.scores for select using (true);

-- replays / seeds / rate_limits: bật RLS mà KHÔNG tạo policy nào
-- = không ai đọc được, không ai ghi được. Chỉ service_role (Edge Function) đi qua.
-- Không có policy INSERT/UPDATE/DELETE trên bất kỳ bảng nào — đó là chủ ý.

-- ===========================================================================
-- HÀM ĐỌC — người chơi gọi được
-- ===========================================================================

-- Top N (tối đa 50) — kèm số hạng tính sẵn.
create or replace function public.leaderboard_top(p_limit int default 50)
returns table (rank int, nickname text, score int, achieved_at timestamptz)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (rank() over (order by s.score desc))::int as rank,
    p.nickname,
    s.score,
    s.achieved_at
  from public.scores s
  join public.profiles p on p.id = s.user_id
  order by s.score desc, s.achieved_at asc
  limit least(greatest(coalesce(p_limit, 50), 1), 50);
$$;

-- Hạng của một người bất kỳ. Xếp ngoài top 50 vẫn thấy mình đứng thứ mấy —
-- đây chính là thứ khiến người ta muốn chơi thêm ván nữa.
create or replace function public.player_rank(p_user uuid)
returns table (rank int, score int, total int)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (select count(*) + 1 from public.scores b where b.score > a.score)::int as rank,
    a.score,
    (select count(*) from public.scores)::int as total
  from public.scores a
  where a.user_id = p_user;
$$;

-- ===========================================================================
-- HÀM GHI — CHỈ service_role được gọi
-- ===========================================================================

-- Đếm số lần gọi trong một khung thời gian. Trả về true nếu còn lượt.
-- Toàn bộ phép đếm nằm trong một câu lệnh nguyên tử, hai lời gọi cùng lúc
-- không thể lách qua.
create or replace function public.bump_rate_limit(
  p_user    uuid,
  p_bucket  text,
  p_limit   int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz;
  v_count  int;
begin
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limits (user_id, bucket, window_start, count)
  values (p_user, p_bucket, v_window, 1)
  on conflict (user_id, bucket, window_start)
    do update set count = rate_limits.count + 1
  returning rate_limits.count into v_count;

  return v_count <= p_limit;
end;
$$;

-- Dọn hạt giống hết hạn và bản đếm cũ. Gọi định kỳ bằng GitHub Actions —
-- lời gọi đó cũng chính là cú "đánh thức" chống ngủ đông của Supabase.
create or replace function public.cleanup_expired_seeds()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  delete from public.seeds
   where expires_at < now() - interval '1 day';
  get diagnostics v_deleted = row_count;

  delete from public.rate_limits
   where window_start < now() - interval '2 days';

  return v_deleted;
end;
$$;

-- ===========================================================================
-- PHÂN QUYỀN GỌI HÀM
-- Postgres mặc định cho PUBLIC gọi mọi hàm mới → phải thu hồi bằng tay.
-- ===========================================================================
-- Hai hàm này chạy với quyền của người tạo (security definer) nên phải khoá kỹ.
-- Supabase còn đặt sẵn "quyền mặc định" cấp EXECUTE cho anon/authenticated,
-- nên thu hồi từ public thôi là chưa đủ — phải gọi tên hai vai trò đó ra.
revoke all on function public.bump_rate_limit(uuid, text, int, int) from public, anon, authenticated;
revoke all on function public.cleanup_expired_seeds()               from public, anon, authenticated;
grant execute on function public.bump_rate_limit(uuid, text, int, int) to service_role;
grant execute on function public.cleanup_expired_seeds()               to service_role;

grant execute on function public.leaderboard_top(int) to anon, authenticated;
grant execute on function public.player_rank(uuid)    to anon, authenticated;
