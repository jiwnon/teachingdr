'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { getStudentsForClassroomAction, upsertStudentsForClassroomAction } from '@/lib/actions/classrooms';
import { useGuestStore, isGuestId } from '@/store/guest-store';
import type { Classroom } from '@/lib/types';
import type { Student } from '@/lib/types';

type StudentRow = { id?: string; number: number; name: string };

export default function ClassStudentsPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: session, status } = useSession();
  const getGuestClassroom = useGuestStore((s) => s.getClassroom);
  const getGuestStudents = useGuestStore((s) => s.getStudents);
  const setGuestStudents = useGuestStore((s) => s.setStudents);

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;

    if (isGuestId(id)) {
      const c = getGuestClassroom(id);
      if (c) {
        setClassroom(c);
        setRows(getGuestStudents(id).map((s) => ({ id: s.id, number: s.number, name: s.name })));
      }
      setLoading(false);
      return;
    }

    if (!session) {
      setError('권한이 없습니다. 로그인하세요.');
      setLoading(false);
      return;
    }

    setError(null);
    getStudentsForClassroomAction(id)
      .then((res) => {
        if (res) {
          setClassroom(res.classroom);
          setRows(res.students.map((s) => ({ id: s.id, number: s.number, name: s.name })));
        } else setError('학급을 찾을 수 없거나 권한이 없습니다.');
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id, session, status, getGuestClassroom, getGuestStudents]);

  const addRow = () => {
    const max = rows.length ? Math.max(...rows.map((r) => r.number), 0) : 0;
    setRows([...rows, { number: max + 1, name: '' }]);
  };

  const setRow = (index: number, patch: Partial<StudentRow>) => {
    setRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    if (isGuestId(id)) {
      const guestStudents = rows.map((r, i) => ({
        id: `guest-s-${id}-${i}`,
        number: r.number,
        name: r.name,
        classroom_id: id,
      }));
      setGuestStudents(id, guestStudents);
      setSaving(false);
      return;
    }

    const result = await upsertStudentsForClassroomAction(id, rows);
    if ('error' in result) {
      setError(result.error);
      setSaving(false);
      return;
    }
    setRows(result.students.map((s) => ({ id: s.id, number: s.number, name: s.name })));
    setSaving(false);
  };

  if (loading) return <div className="loading">로딩 중...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!classroom) return <div className="alert alert-error">학급을 찾을 수 없습니다.</div>;

  const classroomDisplayName = classroom.school_year ? `${classroom.school_year}년 ${classroom.name}` : classroom.name;

  return (
    <div className="card">
      <h1>{classroomDisplayName} 학생 명단</h1>
      <p className="sub">
        번호와 이름을 입력한 뒤 저장하세요.
        {isGuestId(id) && <span style={{ color: 'var(--color-text-muted)' }}> (체험: 저장되지 않음)</span>}
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>번호</th>
              <th>이름</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id ?? i}>
                <td>
                  <input
                    type="number"
                    className="input"
                    value={r.number || ''}
                    onChange={(e) => setRow(i, { number: Number(e.target.value) || 0 })}
                  />
                </td>
                <td>
                  <input
                    className="input"
                    value={r.name}
                    onChange={(e) => setRow(i, { name: e.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <button type="button" className="btn btn-secondary" onClick={addRow}>
          행 추가
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </button>
        <Link href={`/classes/${id}`} className="btn btn-ghost">
          과목·단원 선택하기
        </Link>
      </div>
    </div>
  );
}
