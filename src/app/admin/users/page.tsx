import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { adminSetUserStatus } from '@/app/actions';
import ConfirmButton from '@/components/ConfirmButton';
import Empty from '@/components/Empty';
import { fmtDate, won } from '@/lib/utils';

export const runtime = 'edge';
export const metadata: Metadata = { title: '회원 관리' };

const PER = 50;
const FILTERS = [
  { key: '', label: '전체' },
  { key: 'brand', label: '브랜드' },
  { key: 'creator', label: '크리에이터' },
  { key: 'suspended', label: '정지' },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; f?: string; page?: string };
}) {
  const { supabase, user } = await requireRole('admin');
  // 검색어에서 PostgREST 필터 문법 문자 제거
  const q = (searchParams.q ?? '').replace(/[,%()*\\:]/g, '').trim().slice(0, 50);
  const f = searchParams.f ?? '';
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);

  let query = supabase
    .from('profiles')
    .select('id, name, email, company, is_brand, is_creator, is_admin, channel_type, balance, status, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PER, page * PER - 1);
  if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,company.ilike.%${q}%`);
  if (f === 'brand') query = query.eq('is_brand', true);
  if (f === 'creator') query = query.eq('is_creator', true);
  if (f === 'suspended') query = query.eq('status', 'suspended');

  const { data, count } = await query;
  const list = data ?? [];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PER));
  const href = (p: number, ff = f) =>
    `/admin/users?${new URLSearchParams({ ...(q && { q }), ...(ff && { f: ff }), ...(p > 1 && { page: String(p) }) })}`;

  return (
    <div className="container page-wrap">
      <div className="page-head">
        <div>
          <h1>회원 관리</h1>
          <p>총 {(count ?? 0).toLocaleString()}명 · 이름, 이메일, 회사명으로 검색할 수 있어요.</p>
        </div>
      </div>

      <div className="toolbar">
        <form method="get" action="/admin/users" className="toolbar" style={{ margin: 0 }}>
          {f && <input type="hidden" name="f" value={f} />}
          <input className="input" name="q" defaultValue={q} placeholder="이름, 이메일, 회사명" aria-label="회원 검색" />
          <button type="submit" className="btn btn-secondary">검색</button>
        </form>
        <nav className="filters" aria-label="회원 필터">
          {FILTERS.map((x) => (
            <Link key={x.key} href={href(1, x.key)} className={f === x.key ? 'on' : ''}>{x.label}</Link>
          ))}
        </nav>
      </div>

      <div className="card p0">
        {list.length === 0 ? (
          <Empty icon="👥" title={q ? '검색 결과가 없어요' : '회원이 없어요'} />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>이름</th><th>이메일</th><th>유형</th><th>회사 / 채널</th><th className="num">잔액</th><th>가입일</th><th>상태</th><th className="num"></th></tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id}>
                    <td><b>{u.name || '—'}</b>{u.is_admin && <> <span className="badge">관리자</span></>}</td>
                    <td>{u.email}</td>
                    <td>
                      {u.is_brand && <span className="badge">브랜드</span>}{' '}
                      {u.is_creator && <span className="badge badge-accent">크리에이터</span>}
                    </td>
                    <td className="small">{[u.company, u.channel_type].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="num">{u.is_brand ? won(u.balance) : '—'}</td>
                    <td>{fmtDate(u.created_at)}</td>
                    <td>
                      <span className={`badge ${u.status === 'active' ? 'b-ok' : 'b-bad'}`}>
                        {u.status === 'active' ? '정상' : '정지'}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        {u.id !== user.id && (u.status === 'active' ? (
                          <ConfirmButton action={adminSetUserStatus} fields={{ user_id: u.id, status: 'suspended' }}
                            label="정지" className="btn btn-danger btn-sm"
                            confirmText={`${u.name || u.email} 님의 이용을 정지할까요? 로그인할 수 없게 돼요.`} />
                        ) : (
                          <ConfirmButton action={adminSetUserStatus} fields={{ user_id: u.id, status: 'active' }}
                            label="해제" className="btn btn-secondary btn-sm" />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="pager">
          {page > 1 && <Link href={href(page - 1)} className="btn btn-secondary btn-sm">← 이전</Link>}
          <span className="small muted" style={{ alignSelf: 'center' }}>{page} / {pages}</span>
          {page < pages && <Link href={href(page + 1)} className="btn btn-secondary btn-sm">다음 →</Link>}
        </div>
      )}
    </div>
  );
}
