'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  listFeedbackAction,
  createFeedbackAction,
  deleteFeedbackAction,
  isAdminAction,
} from '@/lib/actions/feedback';
import type { Feedback } from '@/lib/types';

function formatDate(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${day} ${h}:${min}`;
}

export default function FeedbackPage() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<Feedback[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      setLoading(false);
      return;
    }
    Promise.all([listFeedbackAction(), isAdminAction()])
      .then(([list, admin]) => {
        setItems(list ?? []);
        setIsAdmin(admin);
      })
      .finally(() => setLoading(false));
  }, [session, status]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    const result = await createFeedbackAction(content);
    if (result.ok) {
      setContent('');
      const list = await listFeedbackAction();
      setItems(list ?? []);
    } else {
      setError(result.error ?? '등록에 실패했습니다.');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    const result = await deleteFeedbackAction(id);
    if (result.ok) {
      setItems((prev) => prev.filter((f) => f.id !== id));
    } else {
      alert(result.error ?? '삭제에 실패했습니다.');
    }
  };

  if (loading) return <div className="loading">로딩 중...</div>;

  return (
    <div className="card">
      <h1>피드백</h1>
      <p className="sub">
        익명으로 의견을 남겨주세요. 서비스 개선에 큰 도움이 됩니다.
      </p>

      {!session ? (
        <div className="alert" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
          로그인 후 피드백을 남길 수 있습니다.
        </div>
      ) : (
        <div className="feedback-form">
          <textarea
            placeholder="불편한 점, 개선 아이디어, 칭찬 등 자유롭게 남겨주세요."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            maxLength={2000}
            disabled={submitting}
          />
          <div className="feedback-form-footer">
            <span className="feedback-char-count">{content.length}/2000</span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting || !content.trim()}
            >
              {submitting ? '등록 중...' : '등록'}
            </button>
          </div>
          {error && (
            <div className="alert alert-error" style={{ marginTop: 8 }}>{error}</div>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <p className="sub" style={{ marginTop: 24, textAlign: 'center' }}>
          아직 피드백이 없습니다. 첫 번째 의견을 남겨보세요!
        </p>
      ) : (
        <div className="feedback-list">
          {items.map((fb) => (
            <div key={fb.id} className="feedback-item">
              <div className="feedback-item-header">
                <span className="feedback-date">{formatDate(fb.created_at)}</span>
                {(isAdmin || fb.is_mine) && (
                  <button
                    type="button"
                    className="btn btn-ghost feedback-delete-btn"
                    onClick={() => handleDelete(fb.id)}
                  >
                    삭제
                  </button>
                )}
              </div>
              <p className="feedback-content">{fb.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
