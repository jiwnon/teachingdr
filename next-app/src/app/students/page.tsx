'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import { useStudentsStore } from '@/store/students-store';

export default function StudentsPage() {
  const { rows, setRows, addRow, setRow } = useStudentsStore();
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
    const run = async () => {
      try {
        const { data, error: err } = await createClient()
          .from('students')
          .select('id, number, name')
          .order('number');
        if (err) setError(err.message);
        else setRows((data ?? []).map((r) => ({ id: r.id, number: r.number, name: r.name })));
      } catch (e) {
        setError((e as Error)?.message ?? '로드 실패');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [setRows]);

  const handleSave = async () => {
    if (!hasSupabaseEnv()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    for (const row of rows) {
      if (row.id) {
        await supabase.from('students').update({ number: row.number, name: row.name }).eq('id', row.id);
      } else {
        const { data } = await supabase.from('students').insert({ number: row.number, name: row.name }).select('id').single();
        if (data) row.id = data.id;
      }
    }
    const { data, error: err } = await supabase.from('students').select('id, number, name').order('number');
    if (err) setError(err.message);
    else setRows((data ?? []).map((r) => ({ id: r.id, number: r.number, name: r.name })));
    setSaving(false);
  };

  if (loading) return <div className="loading">로딩 중...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="card">
      <h1>1단계: 학생 명단</h1>
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
        <Link href="/ratings" className="btn btn-ghost">2단계: 과목·등급 입력 →</Link>
      </div>
    </div>
  );
}
