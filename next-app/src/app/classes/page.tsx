'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client';
import type { Classroom } from '@/lib/types';

export default function ClassesPage() {
  const [list, setList] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
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
          .from('classrooms')
          .select('id, grade, class_number, name')
          .order('grade')
          .order('class_number');
        if (err) setError(err.message);
        else setList((data ?? []) as Classroom[]);
      } catch (e) {
        setError((e as Error)?.message ?? '로드 실패');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  if (loading) return <div className="loading">로딩 중...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="card">
      <h1>학급 목록</h1>
      <p className="sub">학급을 등록하고, 학기·과목을 선택한 뒤 등급을 입력하세요.</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>학급</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={2}>등록된 학급이 없습니다. 학급 등록을 눌러 추가하세요.</td>
              </tr>
            ) : (
              list.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/classes/${c.id}`} className="link">
                      {c.name}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/classes/${c.id}`} className="btn btn-ghost btn-sm">
                      선택
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 16 }}>
        <Link href="/classes/new" className="btn btn-primary">
          학급 등록
        </Link>
        <Link href="/" className="btn btn-ghost" style={{ marginLeft: 8 }}>
          홈
        </Link>
      </div>
    </div>
  );
}
