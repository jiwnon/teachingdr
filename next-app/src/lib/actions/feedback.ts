'use server';

import { auth } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { Feedback } from '@/lib/types';

async function getSession() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session;
}

function checkAdmin(email: string | null | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || !email) return false;
  return email === adminEmail;
}

export async function isAdminAction(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  return checkAdmin(session.user.email);
}

export async function listFeedbackAction(): Promise<Feedback[] | null> {
  const session = await getSession();
  if (!session) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('feedback')
    .select('id, user_id, content, created_at')
    .order('created_at', { ascending: false });

  if (error) return null;

  const userId = session.user.id;
  return (data ?? []).map((row) => ({
    id: row.id,
    content: row.content,
    created_at: row.created_at,
    is_mine: row.user_id === userId,
  }));
}

export async function createFeedbackAction(content: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: '로그인이 필요합니다.' };

  const trimmed = content.trim();
  if (!trimmed) return { ok: false, error: '내용을 입력해 주세요.' };
  if (trimmed.length > 2000) return { ok: false, error: '2000자 이내로 작성해 주세요.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('feedback')
    .insert({ user_id: session.user.id, content: trimmed });

  if (error) return { ok: false, error: '등록에 실패했습니다.' };
  return { ok: true };
}

export async function deleteFeedbackAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: '로그인이 필요합니다.' };

  const supabase = await createClient();
  const isAdmin = checkAdmin(session.user.email);

  if (isAdmin) {
    const { error } = await supabase.from('feedback').delete().eq('id', id);
    if (error) return { ok: false, error: '삭제에 실패했습니다.' };
    return { ok: true };
  }

  const { error } = await supabase
    .from('feedback')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (error) return { ok: false, error: '삭제에 실패했습니다.' };
  return { ok: true };
}
