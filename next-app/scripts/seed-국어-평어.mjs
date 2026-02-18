/**
 * 1학년 1학기 국어 평어 DB 시드
 * - areas: 국어 단원(한글놀이, 글자를 만들어요, ...) + 국어 종합, 성취기준 영역
 * - templates: PDF 예시 파일에서 추출한 평어 문장 (area별, level 1=상/2=중/3=하)
 *
 * 사용 (next-app 폴더에서):
 *   node scripts/seed-국어-평어.mjs
 * .env.local 있으면 자동 로드 시도. 없으면 환경 변수로 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 필요.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// next-app/.env.local 로드 시도
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
  const areasData = loadJson('국어-1학년1학기-areas.json');

  // 기존 국어 areas 조회
  const { data: existingAreas } = await supabase
    .from('areas')
    .select('id, subject, name')
    .eq('subject', '국어');
  const nameToId = new Map((existingAreas ?? []).map((a) => [a.name, a.id]));

  for (const row of areasData) {
    if (nameToId.has(row.name)) continue;
    const { data: inserted, error } = await supabase
      .from('areas')
      .insert({ subject: row.subject, name: row.name, order_index: row.order_index })
      .select('id')
      .single();
    if (error) {
      console.error('areas insert 오류:', row.name, error.message);
      continue;
    }
    nameToId.set(row.name, inserted.id);
  }
  console.log('areas: 국어', nameToId.size, '개 영역 반영됨');

  const templateFiles = [
    '국어-평어-문장-pdf1.json',
    '국어-평어-문장-pdf2.json',
    '국어-평어-문장-pdf3.json',
  ];
  const allTemplates = [];
  for (const file of templateFiles) {
    try {
      const arr = loadJson(file);
      for (const t of arr) {
        if (!t.areaName || !['1', '2', '3', '4'].includes(t.level) || !t.sentence?.trim()) continue;
        allTemplates.push({ areaName: t.areaName, level: t.level, sentence: t.sentence.trim() });
      }
    } catch (e) {
      console.warn(file, '로드 실패:', e.message);
    }
  }

  const toInsert = [];
  for (const t of allTemplates) {
    const areaId = nameToId.get(t.areaName);
    if (!areaId) continue;
    toInsert.push({ area_id: areaId, level: t.level, sentence: t.sentence });
  }

  if (toInsert.length === 0) {
    console.log('삽입할 templates가 없습니다. areas 이름이 일치하는지 확인하세요.');
    process.exit(0);
  }

  const { error } = await supabase.from('templates').insert(toInsert);
  if (error) {
    console.error('templates insert 오류:', error.message);
    process.exit(1);
  }
  console.log('templates:', toInsert.length, '개 삽입 완료');
}

main();
