'use client';

import Link from 'next/link';
import ActionForm, { SubmitButton } from './ActionForm';
import { saveCampaign } from '@/app/actions';
import { CHANNELS, todayKST, won } from '@/lib/utils';

export type CampaignInput = {
  id: string;
  title: string;
  product: string;
  reward: string;
  channels: string[];
  slots: number;
  deadline: string;
  description: string;
  guide: string | null;
};

export default function CampaignForm({ campaign, fee }: { campaign?: CampaignInput | null; fee: number }) {
  const c = campaign ?? null;

  return (
    <ActionForm action={saveCampaign} className="card form-card">
      {c && <input type="hidden" name="id" value={c.id} />}

      <div className="field">
        <label htmlFor="title">캠페인 제목</label>
        <input className="input" id="title" name="title" maxLength={80} defaultValue={c?.title}
          placeholder="예) 신제품 비건 선크림 체험 리뷰어 모집" />
      </div>

      <div className="row2">
        <div className="field">
          <label htmlFor="product">제품/서비스명</label>
          <input className="input" id="product" name="product" maxLength={60} defaultValue={c?.product} />
        </div>
        <div className="field">
          <label htmlFor="reward">제공 내역</label>
          <input className="input" id="reward" name="reward" maxLength={80} defaultValue={c?.reward}
            placeholder="예) 제품 무상 제공 + 원고료 5만원" />
        </div>
      </div>

      <fieldset className="field" style={{ border: 0, padding: 0, margin: '0 0 16px' }}>
        <legend className="lbl">모집 채널</legend>
        <div className="chips">
          {CHANNELS.map((ch) => (
            <label key={ch} className="chip-check">
              <input type="checkbox" name="channels" value={ch} defaultChecked={c?.channels.includes(ch)} />
              <span>{ch}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="row2">
        <div className="field">
          <label htmlFor="slots">모집 인원</label>
          <input className="input" id="slots" name="slots" type="number" min={1} max={500} defaultValue={c?.slots} />
          <span className="hint">크리에이터 1명 선정 시 {won(fee)} 차감</span>
        </div>
        <div className="field">
          <label htmlFor="deadline">모집 마감일</label>
          <input className="input" id="deadline" name="deadline" type="date"
            min={c ? undefined : todayKST()} defaultValue={c?.deadline} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="description">캠페인 상세 내용</label>
        <textarea className="input" id="description" name="description" maxLength={3000} rows={8}
          defaultValue={c?.description} placeholder="제품 소개, 진행 방식, 일정 등을 적어 주세요." />
      </div>

      <div className="field">
        <label htmlFor="guide">콘텐츠 가이드 / 필수 조건 <span className="muted">(선택)</span></label>
        <textarea className="input" id="guide" name="guide" maxLength={2000} rows={4}
          defaultValue={c?.guide ?? ''} placeholder="필수 키워드, 해시태그, 게시 유지 기간 등" />
      </div>

      <div className="form-actions">
        <Link href="/brand/campaigns" className="btn btn-secondary">취소</Link>
        <SubmitButton pendingText="저장 중…">{c ? '저장' : '캠페인 등록'}</SubmitButton>
      </div>
    </ActionForm>
  );
}
