/**
 * 단원별 등급 입력 테이블 (행=학생, 열=단원, 셀=매우잘함/잘함/보통/노력요함)
 * 뼈대만 구성. 단원 목록·학생 목록·저장 로직 연동 예정.
 */
'use client';

import type { Level } from '@/lib/types';

type StudentRow = { id: number; name: string };
type UnitCol = string;

type Props = {
  students: StudentRow[];
  units: UnitCol[];
  grades: Record<string, Level>; // key: `${studentId}-${unit}`
  onGradeChange?: (studentId: number, unit: string, level: Level) => void;
};

export default function GradeTable({
  students,
  units,
  grades,
  onGradeChange,
}: Props) {
  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>학생</th>
            {units.map((u) => (
              <th key={u}>{u}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              {units.map((unit) => (
                <td key={unit}>
                  <select
                    value={grades[`${s.id}-${unit}`] ?? ''}
                    onChange={(e) =>
                      onGradeChange?.(s.id, unit, e.target.value as Level)
                    }
                  >
                    <option value="">-</option>
                    <option value="1">매우잘함</option>
                    <option value="2">잘함</option>
                    <option value="3">보통</option>
                    <option value="4">노력요함</option>
                  </select>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
