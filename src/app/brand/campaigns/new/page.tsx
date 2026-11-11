import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { getSettings } from '@/lib/queries';
import CampaignForm from '@/components/CampaignForm';

export const runtime = 'edge';
export const metadata: Metadata = { title: '새 캠페인 작성' };

export default async function NewCampaignPage() {
  const { supabase } = await requireRole('brand');
  const { fee } = await getSettings(supabase);

  return (
    <div className="container page-wrap">
      <Link href="/brand/campaigns" className="back">← 내 캠페인</Link>
      <div className="page-head">
        <div>
          <h1>새 캠페인 작성</h1>
          <p>크리에이터가 보게 될 모집 글이에요. 구체적으로 쓸수록 좋은 신청자가 모여요.</p>
        </div>
      </div>
      <CampaignForm fee={fee} />
    </div>
  );
}
