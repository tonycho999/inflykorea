-- =====================================================
-- inflykorea 초기 스키마 (SQL Editor에 통째로 1회 실행)
-- =====================================================

-- 1) 회원 프로필 -------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  name         text not null default '',
  is_brand     boolean not null default false,
  is_creator   boolean not null default false,
  is_admin     boolean not null default false,
  company      text,
  phone        text,
  channel_type text,
  channel_url  text,
  balance      integer not null default 0 check (balance >= 0),
  status       text not null default 'active' check (status in ('active','suspended')),
  created_at   timestamptz not null default now()
);

-- 2) 운영 설정 (항상 1행) ------------------------------
create table public.settings (
  id              int primary key default 1 check (id = 1),
  fee_per_creator integer not null default 10000 check (fee_per_creator >= 0),
  bank_info       text not null default ''
);
insert into public.settings (id) values (1);

-- 3) 캠페인 ------------------------------------------
create table public.campaigns (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  product     text not null,
  reward      text not null,
  channels    text[] not null default '{}',
  slots       int not null check (slots between 1 and 500),
  deadline    date not null,
  description text not null,
  guide       text,
  status      text not null default 'open' check (status in ('open','closed','hidden')),
  created_at  timestamptz not null default now()
);
create index on public.campaigns (status, deadline);
create index on public.campaigns (brand_id);

-- 4) 신청 --------------------------------------------
create table public.applications (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  creator_id   uuid not null references public.profiles(id) on delete cascade,
  channel_type text not null,
  channel_url  text not null,
  message      text,
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  fee          integer,
  decided_at   timestamptz,
  created_at   timestamptz not null default now(),
  unique (campaign_id, creator_id)
);
create index on public.applications (creator_id);

-- 5) 채팅 메시지 (채팅방 = 선정된 신청 1건) -------------
create table public.messages (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  sender_id      uuid not null references public.profiles(id) on delete cascade,
  body           text not null check (char_length(body) between 1 and 1000),
  created_at     timestamptz not null default now()
);
create index on public.messages (application_id, created_at);

-- 6) 거래 (충전·선정과금·환불) --------------------------
create table public.transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  type           text not null check (type in ('charge','fee','refund')),
  amount         integer not null check (amount > 0),
  status         text not null default 'pending' check (status in ('pending','done','rejected')),
  memo           text,
  application_id uuid references public.applications(id) on delete set null,
  created_at     timestamptz not null default now(),
  processed_at   timestamptz
);
create index on public.transactions (user_id, created_at desc);
create index on public.transactions (status);

-- 7) 다른 회원에게 보여도 되는 정보만 담은 뷰 -----------
create view public.public_profiles as
  select id, name, company, channel_type, channel_url from public.profiles;

-- =====================================================
-- 헬퍼 함수
-- =====================================================
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

create or replace function public.is_brand_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and is_brand and status = 'active');
$$;

create or replace function public.is_creator_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and is_creator and status = 'active');
$$;

create or replace function public.can_chat(p_app uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from applications a join campaigns c on c.id = a.campaign_id
    where a.id = p_app and a.status = 'approved'
      and (a.creator_id = auth.uid() or c.brand_id = auth.uid()));
$$;

-- 가입 시 profiles 자동 생성 (가입 폼 metadata 사용)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into profiles (id, email, name, is_brand, is_creator, company, phone, channel_type, channel_url)
  values (
    new.id, new.email,
    coalesce(nullif(m->>'name',''), nullif(m->>'full_name',''), split_part(coalesce(new.email,''),'@',1)),
    coalesce((m->>'is_brand')::boolean, false),
    coalesce((m->>'is_creator')::boolean, false),
    nullif(m->>'company',''), nullif(m->>'phone',''),
    nullif(m->>'channel_type',''), nullif(m->>'channel_url',''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- =====================================================
-- RLS (행 단위 접근 제어)
-- =====================================================
alter table public.profiles     enable row level security;
alter table public.settings     enable row level security;
alter table public.campaigns    enable row level security;
alter table public.applications enable row level security;
alter table public.messages     enable row level security;
alter table public.transactions enable row level security;

-- profiles: 본인·관리자만 조회
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- settings
create policy settings_select on public.settings for select to authenticated using (true);
create policy settings_update on public.settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- campaigns
create policy campaigns_select on public.campaigns for select to authenticated
  using (status <> 'hidden' or brand_id = auth.uid() or public.is_admin());
create policy campaigns_insert on public.campaigns for insert to authenticated
  with check (brand_id = auth.uid() and status = 'open' and public.is_brand_user());
create policy campaigns_update_owner on public.campaigns for update to authenticated
  using (brand_id = auth.uid() and status <> 'hidden')
  with check (brand_id = auth.uid() and status in ('open','closed'));
create policy campaigns_update_admin on public.campaigns for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy campaigns_delete_admin on public.campaigns for delete to authenticated
  using (public.is_admin());

-- applications (선정·미선정은 RPC로만)
create policy applications_select on public.applications for select to authenticated
  using (creator_id = auth.uid()
      or exists (select 1 from public.campaigns c where c.id = campaign_id and c.brand_id = auth.uid())
      or public.is_admin());
create policy applications_insert on public.applications for insert to authenticated
  with check (
    creator_id = auth.uid() and status = 'pending' and fee is null and decided_at is null
    and public.is_creator_user()
    and exists (select 1 from public.campaigns c
                where c.id = campaign_id and c.status = 'open'
                  and c.deadline >= (now() at time zone 'Asia/Seoul')::date
                  and c.brand_id <> auth.uid()));

-- messages
create policy messages_select on public.messages for select to authenticated
  using (public.can_chat(application_id) or public.is_admin());
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.can_chat(application_id));

-- transactions (조회만, 변경은 RPC로만)
create policy tx_select on public.transactions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- =====================================================
-- 테이블 권한 (명시적으로 지정)
-- =====================================================
revoke all on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;
grant usage on schema public to authenticated;

grant select on public.profiles to authenticated;
revoke insert, update, delete on public.profiles from authenticated;
grant update (name, is_brand, is_creator, company, phone, channel_type, channel_url)
  on public.profiles to authenticated;            -- 잔액·관리자·상태는 수정 불가

grant select, update on public.settings to authenticated;
revoke insert, delete on public.settings from authenticated;

grant select, insert, update, delete on public.campaigns to authenticated;

grant select, insert on public.applications to authenticated;
revoke update, delete on public.applications from authenticated;

grant select, insert on public.messages to authenticated;
revoke update, delete on public.messages from authenticated;

grant select on public.transactions to authenticated;
revoke insert, update, delete on public.transactions from authenticated;

grant select on public.public_profiles to authenticated;

-- =====================================================
-- RPC (잔액이 바뀌는 처리는 전부 여기서 한 트랜잭션으로)
-- =====================================================
create or replace function public.approve_application(p_app uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_app applications; v_c campaigns; v_fee int; v_bal int; v_cnt int; v_name text;
begin
  select * into v_app from applications where id = p_app for update;
  if not found then raise exception '신청 정보를 찾을 수 없습니다.'; end if;
  select * into v_c from campaigns where id = v_app.campaign_id for update;
  if v_c.brand_id <> auth.uid() then raise exception '권한이 없습니다.'; end if;
  if v_c.status = 'hidden' then raise exception '관리자에 의해 숨김 처리된 캠페인입니다.'; end if;
  if v_app.status <> 'pending' then raise exception '이미 처리된 신청입니다.'; end if;
  select count(*) into v_cnt from applications where campaign_id = v_c.id and status = 'approved';
  if v_cnt >= v_c.slots then raise exception '모집 인원이 모두 찼습니다.'; end if;
  select fee_per_creator into v_fee from settings where id = 1;
  select balance into v_bal from profiles where id = auth.uid() and status = 'active' for update;
  if v_bal is null then raise exception '이용할 수 없는 계정입니다.'; end if;
  if v_bal < v_fee then raise exception '충전금이 부족합니다. (필요 %원 / 잔액 %원)', v_fee, v_bal; end if;
  select name into v_name from profiles where id = v_app.creator_id;

  update profiles set balance = balance - v_fee where id = auth.uid();
  update applications set status = 'approved', fee = v_fee, decided_at = now() where id = p_app;
  if v_fee > 0 then
    insert into transactions (user_id, type, amount, status, memo, application_id, processed_at)
    values (auth.uid(), 'fee', v_fee, 'done', v_c.title || ' · ' || coalesce(v_name,'') || ' 선정', p_app, now());
  end if;
end $$;

create or replace function public.reject_application(p_app uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update applications a set status = 'rejected', decided_at = now()
  from campaigns c
  where a.id = p_app and c.id = a.campaign_id and c.brand_id = auth.uid() and a.status = 'pending';
  if not found then raise exception '처리할 수 없는 신청입니다.'; end if;
end $$;

create or replace function public.request_charge(p_amount int, p_depositor text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_brand_user() then raise exception '브랜드 회원만 충전할 수 있습니다.'; end if;
  if p_amount < 10000 or p_amount > 10000000 then raise exception '충전 금액은 1만원~1천만원입니다.'; end if;
  if coalesce(trim(p_depositor),'') = '' then raise exception '입금자명을 입력해 주세요.'; end if;
  if (select count(*) from transactions where user_id = auth.uid() and type = 'charge' and status = 'pending') >= 3 then
    raise exception '처리 대기 중인 충전 신청이 3건 이상입니다.'; end if;
  insert into transactions (user_id, type, amount, status, memo)
  values (auth.uid(), 'charge', p_amount, 'pending', '무통장입금 · 입금자 ' || trim(p_depositor));
end $$;

create or replace function public.request_refund(p_amount int, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_bal int;
begin
  if not is_brand_user() then raise exception '브랜드 회원만 환불을 요청할 수 있습니다.'; end if;
  if p_amount < 1000 then raise exception '환불 금액은 1,000원 이상입니다.'; end if;
  select balance into v_bal from profiles where id = auth.uid() for update;
  if v_bal < p_amount then raise exception '환불 가능 금액(%원)을 초과했습니다.', v_bal; end if;
  update profiles set balance = balance - p_amount where id = auth.uid();
  insert into transactions (user_id, type, amount, status, memo)
  values (auth.uid(), 'refund', p_amount, 'pending', coalesce(nullif(trim(p_reason),''), '환불 요청'));
end $$;

create or replace function public.admin_process_tx(p_tx uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v transactions;
begin
  if not is_admin() then raise exception '관리자만 처리할 수 있습니다.'; end if;
  select * into v from transactions where id = p_tx for update;
  if not found or v.status <> 'pending' then raise exception '이미 처리된 요청입니다.'; end if;
  if v.type = 'charge' and p_approve then
    update profiles set balance = balance + v.amount where id = v.user_id;   -- 입금 확인 → 충전
  elsif v.type = 'refund' and not p_approve then
    update profiles set balance = balance + v.amount where id = v.user_id;   -- 환불 반려 → 복원
  end if;
  update transactions set status = case when p_approve then 'done' else 'rejected' end,
                          processed_at = now() where id = p_tx;
end $$;

create or replace function public.admin_set_user_status(p_user uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception '관리자만 처리할 수 있습니다.'; end if;
  if p_user = auth.uid() then raise exception '본인 계정은 정지할 수 없습니다.'; end if;
  if p_status not in ('active','suspended') then raise exception '잘못된 상태값입니다.'; end if;
  update profiles set status = p_status where id = p_user;
end $$;

do $$ declare f text; begin
  foreach f in array array[
    'approve_application(uuid)','reject_application(uuid)',
    'request_charge(integer,text)','request_refund(integer,text)',
    'admin_process_tx(uuid,boolean)','admin_set_user_status(uuid,text)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- 채팅 실시간 수신
alter publication supabase_realtime add table public.messages;
