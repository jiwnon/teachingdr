/**
 * 과목 선택 (국어-가 / 국어-나 / 수학 / 통합)
 * MVP: 1학년 2학기 한정
 */
'use client';

import type { SubjectCode } from '@/lib/types';
import { SUBJECTS } from '@/lib/types';

type Props = {
  value?: SubjectCode | null;
  onChange?: (subject: SubjectCode) => void;
};

export default function SubjectSelector({ value, onChange }: Props) {
  return (
    <div>
      <label>과목</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value as SubjectCode)}
      >
        <option value="">선택</option>
        {SUBJECTS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
