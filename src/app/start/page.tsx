import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { CHANNELS } from '@/lib/utils';
import { SubmitButton } from '@/components/ActionForm';

export const runtime = 'edge';

export const metadata: Metadata = {
  title: '가입 마무리',
  robots: { index: false, follow: false },
};

const PHONE_RE = /^01[0-9]-?\d{3,4}-?\d{4}$/;
const URL_RE = /^https?:\/\/\S+\.\S+/;

// URL에 임의 문구가 노출되지 않도록 오류는 코드로 전달
const ERR: Record<string, string> = {
  name: '이름을 입력해 주세요.',
  role: '브랜드 또는 크리에이터 중 하나 이상 선택해 주세요.',
  company: '회사/브랜드명을 입력해 주세요.',
  phone: '알림톡 받을 휴대폰 번호를 정확히 입력해 주세요.',
  channel: '주 채널을 선택해 주세요.',
  url: '채널 주소는 https:// 로 시작해야 해요.',
  agree: '이용약관과 개인정보처리방침에 동의해 주세요.',
  save: '저장 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.',
};

const home = (p: { is_brand: boolean }) => (p.is_brand ? '/brand/campaigns' : '/creator/campaigns');

async function completeStart(fd: FormData) {
  'use server';
  const { supabase, user, profile } = await requireUser();
  if (profile.is_brand || profile.is_creator) redirect(home(profile)); // 이미 완료

  const s = (k: string) => String(fd.get(k) ?? '').trim();
  const fail = (code: string): never => redirect(`/start?error=${code}`);

  const name = s('name');
  const isBrand = fd.get('is_brand') === 'on';
  const isCreator = fd.get('is_creator') === 'on';
  const company = s('company');
  const phone = s('phone');
  const channelType = s('channel_type');
  const channelUrl = s('channel_url');

  if (!name) fail('name');
  if (!isBrand && !isCreator) fail('role');
  if (isBrand && !company) fail('company');
  if (isBrand && !PHONE_RE.test(phone)) fail('phone');
  if (isCreator && !CHANNELS.includes(channelType)) fail('channel');
  if (isCreator && !URL_RE.test(channelUrl)) fail('url');
  if (fd.get('agree') !== 'on') fail('agree');

  const { error } = await supabase
    .from('profiles')
    .update({
      name,
      is_brand: isBrand,
      is_creator: isCreator,
      company: isBrand ? company : null,
      phone: isBrand ? phone.replace(/-/g, '') : null,
      channel_type: isCreator ? channelType : null,
      channel_url: isCreator ? channelUrl : null,
    })
    .eq('id', user.id);
  if (error) fail('save');

  revalidatePath('/', 'layout'); // 헤더 메뉴 갱신
  redirect(isBrand ? '/brand/campaigns' : '/creator/campaigns');
}

export default async function StartPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const { profile } = await requireUser();
  if (profile.is_brand || profile.is_creator) redirect(home(profile));

  const errorMsg = searchParams.error ? ERR[searchParams.error] : null;

  return (
    <div className="auth-wrap">
      <section className="card auth-card">
        <h1 className="auth-title">거의 다 됐어요! 👋</h1>
        <p className="muted" style={{ marginBottom: 20 }}>
          이용할 유형과 추가 정보를 입력해 주세요. 나중에 마이페이지에서 바꿀 수 있어요.
        </p>

        <form action={completeStart} className="start-form" noValidate>
          {errorMsg && <p className="form-msg err" role="alert">{errorMsg}</p>}

          <div className="row2">
            <div className="field">
              <label htmlFor="name">이름</label>
              <input className="input" id="name" name="name" maxLength={30} defaultValue={profile.name} />
            </div>
            <div className="field">
              <label htmlFor="email">이메일</label>
              <input className="input" id="email" value={profile.email ?? ''} readOnly />
            </div>
          </div>

          <div className="lbl">가입 유형 <span className="muted">(둘 다 선택 가능)</span></div>
          <div className="role-grid">
            <label className="role-opt">
              <input type="checkbox" name="is_brand" />
              <span><b>브랜드</b><small>제품 광고를 요청하는 회사·개인</small></span>
            </label>
            <label className="role-opt">
              <input type="checkbox" name="is_creator" />
              <span><b>크리에이터</b><small>블로거·인플루언서·유튜버</small></span>
            </label>
          </div>

          <div className="row2 brand-extra">
            <div className="field">
              <label htmlFor="company">회사/브랜드명 <span className="muted">(브랜드)</span></label>
              <input className="input" id="company" name="company" maxLength={60} defaultValue={profile.company ?? ''} />
            </div>
            <div className="field">
              <label htmlFor="phone">알림톡 수신 휴대폰 <span className="muted">(브랜드)</span></label>
              <input className="input" id="phone" name="phone" inputMode="tel" placeholder="010-0000-0000"
                defaultValue={profile.phone ?? ''} />
              <span className="hint">크리에이터 채팅 알림을 카카오톡으로 받아요</span>
            </div>
          </div>

          <div className="row2 creator-extra">
            <div className="field">
              <label htmlFor="channel_type">주 채널 <span className="muted">(크리에이터)</span></label>
              <select className="input" id="channel_type" name="channel_type" defaultValue={profile.channel_type ?? CHANNELS[0]}>
                {CHANNELS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="channel_url">채널 주소 <span className="muted">(크리에이터)</span></label>
              <input className="input" id="channel_url" name="channel_url" placeholder="https://"
                defaultValue={profile.channel_url ?? ''} />
            </div>
          </div>

          <label className="agree">
            <input type="checkbox" name="agree" />
            <span>
              <Link href="/terms" target="_blank">이용약관</Link>과{' '}
              <Link href="/privacy" target="_blank">개인정보처리방침</Link>에 동의합니다 (필수)
            </span>
          </label>

          <SubmitButton className="btn btn-primary btn-block" pendingText="저장 중…">시작하기</SubmitButton>
        </form>
      </section>
    </div>
  );
}
