/**
 * 1학년 2학기 국어·수학·통합 areas + 평어 문장 DB 시드
 *
 * 순서:
 * 1) subject가 '국어', '수학', '통합'이고 semester=2인 areas 삭제 (CASCADE로 templates/ratings 함께 삭제)
 * 2) areas 파일 3개 읽어서 INSERT, 생성된 id 저장
 * 3) 평어 문장 파일 3개 읽어서 areaName으로 area_id 매핑 후 templates INSERT
 *
 * 사용 (next-app 폴더에서):
 *   node scripts/seed-2학기-평어.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const envPath = join(__dirname, '..', '.env.local');
if (existsSync(envPath)) {
  const env = readFileSync(envPath, 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
}

const dataDir = join(__dirname, 'seed-data');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY를 설정하세요. (.env.local 등)');
  process.exit(1);
}

const supabase = createClient(url, key);

function loadJson(name) {
  const path = join(dataDir, name);
  return JSON.parse(readFileSync(path, 'utf8'));
}

async function main() {
  // 0) templates/ratings level 제약을 4단계('1','2','3','4')로 보장
  const fixConstraintSQL = `
    DO $$ DECLARE _con text; BEGIN
      SELECT conname INTO _con FROM pg_constraint
      WHERE conrelid = 'public.templates'::regclass AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%level%';
      IF _con IS NOT NULL THEN EXECUTE 'ALTER TABLE public.templates DROP CONSTRAINT ' || quote_ident(_con); END IF;
    END $$;
    ALTER TABLE public.templates ADD CONSTRAINT templates_level_check CHECK (level IN ('1','2','3','4'));
    DO $$ DECLARE _con text; BEGIN
      SELECT conname INTO _con FROM pg_constraint
      WHERE conrelid = 'public.ratings'::regclass AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%level%';
      IF _con IS NOT NULL THEN EXECUTE 'ALTER TABLE public.ratings DROP CONSTRAINT ' || quote_ident(_con); END IF;
    END $$;
    ALTER TABLE public.ratings ADD CONSTRAINT ratings_level_check CHECK (level IN ('1','2','3','4'));
  `;
  const { error: rpcErr } = await supabase.rpc('exec_sql', { sql: fixConstraintSQL }).maybeSingle();
  if (rpcErr) {
    console.warn('level 제약 자동 수정 실패 (수동 SQL 필요할 수 있음):', rpcErr.message);
  } else {
    console.log('level 제약: 4단계 보장 완료');
  }

  // 1) 국어·수학·통합 2학기 areas 삭제 (DB FK on delete cascade → templates, ratings 함께 삭제)
  const { error: deleteErr } = await supabase
    .from('areas')
    .delete()
    .in('subject', ['국어', '수학', '통합'])
    .eq('semester', 2);

  if (deleteErr) {
    console.error('areas 삭제 오류:', deleteErr.message);
    process.exit(1);
  }
  console.log('areas: 국어·수학·통합 semester=2 삭제 완료');

  // 2) areas 파일 3개 INSERT, (subject, name) → id 저장
  const areaFiles = [
    { file: '국어-1학년2학기-areas.json', subject: '국어' },
    { file: '수학-1학년2학기-areas.json', subject: '수학' },
    { file: '통합-1학년2학기-areas.json', subject: '통합' },
  ];
  /** @type {Map<string, string>} key: `${subject}:${name}` → area id */
  const nameToId = new Map();

  for (const { file, subject } of areaFiles) {
    const rows = loadJson(file);
    for (const row of rows) {
      const { data: inserted, error } = await supabase
        .from('areas')
        .insert({
          subject: row.subject,
          name: row.name,
          order_index: row.order_index,
          semester: row.semester ?? 2,
        })
        .select('id')
        .single();
      if (error) {
        console.error('areas insert 오류:', row.name, error.message);
        continue;
      }
      nameToId.set(`${subject}:${row.name}`, inserted.id);
    }
    console.log('areas:', subject, rows.length, '개 INSERT');
  }

  // 3) 평어 문장 파일 3개 → areaName으로 area_id 매핑 후 templates INSERT
  const templateFiles = [
    { file: '국어-2학기-평어-문장.json', subject: '국어' },
    { file: '수학-2학기-평어-문장.json', subject: '수학' },
    { file: '통합-2학기-평어-문장.json', subject: '통합' },
  ];
  const toInsert = [];

  for (const { file, subject } of templateFiles) {
    const arr = loadJson(file);
    for (const t of arr) {
      const level = String(t.level ?? '');
      if (!t.areaName || !['1', '2', '3', '4'].includes(level) || !t.sentence?.trim()) continue;
      const areaId = nameToId.get(`${subject}:${t.areaName}`);
      if (!areaId) continue;
      toInsert.push({ area_id: areaId, level, sentence: t.sentence.trim() });
    }
    console.log('평어 문장:', file, arr.length, '건 로드');
  }

  if (toInsert.length === 0) {
    console.log('삽입할 templates가 없습니다. areas 이름이 일치하는지 확인하세요.');
    process.exit(0);
  }

  const { error: insertErr } = await supabase.from('templates').insert(toInsert);
  if (insertErr) {
    console.error('templates insert 오류:', insertErr.message);
    process.exit(1);
  }
  console.log('templates:', toInsert.length, '개 INSERT 완료');
}

main();
