import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { getSettings } from '@/lib/queries';
import CampaignForm from '@/components/CampaignForm';

export const runtime = 'edge';
export const metadata: Metadata = { title: '캠페인 수정' };

export default async function EditCampaignPage({ params }: { params: { id: string } }) {
  const { supabase, user } = await requireRole('brand');

  const { data: c } = await supabase
    .from('campaigns')
    .select('id, title, product, reward, channels, slots, deadline, description, guide, status')
    .eq('id', params.id)
    .eq('brand_id', user.id)
    .maybeSingle();
  if (!c) notFound();

  const { fee } = await getSettings(supabase);

  return (
    <div className="container page-wrap">
      <Link href="/brand/campaigns" className="back">← 내 캠페인</Link>
      <div className="page-head">
        <div>
          <h1>캠페인 수정</h1>
          <p>이미 선정한 인원보다 모집 인원을 적게 줄일 수는 없어요.</p>
        </div>
      </div>

      {c.status === 'hidden' ? (
        <p className="form-msg err" role="alert">
          관리자가 숨김 처리한 캠페인이라 수정할 수 없어요. 고객센터(help@inflykorea.com)로 문의해 주세요.
        </p>
      ) : (
        <CampaignForm campaign={c} fee={fee} />
      )}
    </div>
  );
}
