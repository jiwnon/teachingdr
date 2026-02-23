'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { getClassroomsAction } from '@/lib/actions/classrooms';
import { useGuestStore } from '@/store/guest-store';
import type { Classroom } from '@/lib/types';

export default function ClassesPage() {
  const { data: session, status } = useSession();
  const [list, setList] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const guestClassrooms = useGuestStore((s) => s.classrooms);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      setList(guestClassrooms);
      setLoading(false);
      return;
    }

    setError(null);
    getClassroomsAction()
      .then(setList)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [session, status, guestClassrooms]);

  if (status === 'loading' || loading) return <div className="loading">로딩 중...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  const displayList = session ? list : guestClassrooms;

  return (
    <div className="card">
      <h1>학급 목록</h1>
      <p className="sub">
        학급을 등록하고, 학기·과목을 선택한 뒤 등급을 입력하세요.
        {!session && (
          <span style={{ display: 'block', marginTop: 4, color: 'var(--color-text-muted)' }}>
            (체험 모드: 저장되지 않습니다. 로그인하면 저장됩니다.)
          </span>
        )}
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>학급</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {displayList.length === 0 ? (
              <tr>
                <td colSpan={2}>등록된 학급이 없습니다. 학급 등록을 눌러 추가하세요.</td>
              </tr>
            ) : (
              displayList.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/classes/${c.id}`} className="link">
                      {c.school_year ? `${c.school_year}년 ${c.name}` : c.name}
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
