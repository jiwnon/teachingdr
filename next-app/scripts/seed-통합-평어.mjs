/**
 * 1학년 1학기 통합(바른생활·슬기로운생활·즐거운생활) areas + 평어 문장 DB 시드
 *
 * 순서:
 * 1) subject='통합'이고 semester=1인 areas 삭제 (CASCADE로 templates/ratings 함께 삭제)
 * 2) 통합-1학년1학기-areas.json INSERT, (name → id) 저장
 * 3) 통합-1학기-평어-문장.json areaName으로 area_id 매핑 후 templates INSERT
 *
 * 사용 (next-app 폴더에서):
 *   node scripts/seed-통합-평어.mjs
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

const dataDir = join(__dirname, 'seed-data', '1학년-1학기');

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
  // 1) 통합 1학년 1학기 areas 삭제 (DB FK on delete cascade → templates, ratings 함께 삭제)
  const { error: deleteErr } = await supabase
    .from('areas')
    .delete()
    .eq('subject', '통합')
    .eq('semester', 1)
    .eq('grade', 1);

  if (deleteErr) {
    console.error('areas 삭제 오류:', deleteErr.message);
    process.exit(1);
  }
  console.log('areas: 통합 semester=1 삭제 완료');

  // 2) 통합 areas INSERT, name → id 저장
  const areaRows = loadJson('통합-1학년1학기-areas.json');
  /** @type {Map<string, string>} key: name → area id */
  const nameToId = new Map();

  for (const row of areaRows) {
    const { data: inserted, error } = await supabase
      .from('areas')
      .insert({
        subject: row.subject,
        name: row.name,
        order_index: row.order_index,
        semester: row.semester ?? 1,
        grade: row.grade ?? 1,
      })
      .select('id')
      .single();
    if (error) {
      console.error('areas insert 오류:', row.name, error.message);
      continue;
    }
    nameToId.set(row.name, inserted.id);
  }
  console.log('areas: 통합', areaRows.length, '개 INSERT');

  // 3) 통합 평어 문장 → areaName으로 area_id 매핑 후 templates INSERT
  const templateArr = loadJson('통합-1학기-평어-문장.json');
  const toInsert = [];

  for (const t of templateArr) {
    if (!t.areaName || !['1', '2', '3', '4'].includes(t.level) || !t.sentence?.trim()) continue;
    const areaId = nameToId.get(t.areaName);
    if (!areaId) continue;
    toInsert.push({ area_id: areaId, level: t.level, sentence: t.sentence.trim(), grade: 1 });
  }
  console.log('평어 문장: 통합-1학기-평어-문장.json', templateArr.length, '건 로드');

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
