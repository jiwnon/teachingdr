'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import type { Classroom } from '@/lib/types';
import type { Student } from '@/lib/types';

type StudentRow = { id?: string; number: number; name: string };

export default function ClassStudentsPage() {
  const params = useParams();
  const id = params.id as string;
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setError('NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY를 .env.local에 설정하세요.');
      setLoading(false);
      return;
    }
    setError(null);
    const supabase = createClient();
    const run = async () => {
      try {
        const [c, s] = await Promise.all([
          supabase.from('classrooms').select('id, grade, class_number, name').eq('id', id).single(),
          supabase.from('students').select('id, number, name').eq('classroom_id', id).order('number'),
        ]);
        if (c.error) setError(c.error.message);
        else setClassroom(c.data as Classroom);
        if (!c.error && s.error) setError(s.error.message);
        else if (!c.error) setRows((s.data ?? []).map((r: Student) => ({ id: r.id, number: r.number, name: r.name })));
      } catch (e) {
        setError((e as Error)?.message ?? '로드 실패');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [id]);

  const addRow = () => {
    const max = rows.length ? Math.max(...rows.map((r) => r.number), 0) : 0;
    setRows([...rows, { number: max + 1, name: '' }]);
  };

  const setRow = (index: number, patch: Partial<StudentRow>) => {
    setRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const handleSave = async () => {
    if (!hasSupabaseEnv() || !id) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    for (const row of rows) {
      if (row.id) {
        await supabase.from('students').update({ number: row.number, name: row.name }).eq('id', row.id);
      } else {
        const { data } = await supabase
          .from('students')
          .insert({ number: row.number, name: row.name, classroom_id: id })
          .select('id')
          .single();
        if (data) (row as { id?: string }).id = data.id;
      }
    }
    const { data, error: err } = await supabase
      .from('students')
      .select('id, number, name')
      .eq('classroom_id', id)
      .order('number');
    if (err) setError(err.message);
    else setRows((data ?? []).map((r: Student) => ({ id: r.id, number: r.number, name: r.name })));
    setSaving(false);
  };

  if (loading) return <div className="loading">로딩 중...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!classroom) return <div className="alert alert-error">학급을 찾을 수 없습니다.</div>;

  return (
    <div className="card">
      <h1>{classroom.name} 학생 명단</h1>
      <p className="sub">번호와 이름을 입력한 뒤 저장하세요.</p>
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
          학급으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
