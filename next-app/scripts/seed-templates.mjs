/**
 * xlsx → templates seed (area | level | sentence)
 * 사용: SUBJECT=국어 node scripts/seed-templates.mjs path/to/file.xlsx
 */
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');

const subject = process.env.SUBJECT || '국어';
const filePath = process.argv[2];
if (!filePath) throw new Error('Usage: node scripts/seed-templates.mjs <file.xlsx>');

const supabase = createClient(url, key);

const wb = XLSX.read(readFileSync(filePath), { type: 'buffer' });
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet);

const seen = new Set();
const normalized = [];
for (const row of rows) {
  const area = String(row.area ?? '').trim();
  const level = String(row.level ?? '').trim();
  const sentence = String(row.sentence ?? '').trim();
  if (!area || !level || !sentence) continue;
  if (!['1', '2', '3', '4'].includes(level)) continue;
  const key = `${area}\t${level}\t${sentence}`;
  if (seen.has(key)) continue;
  seen.add(key);
  normalized.push({ area, level, sentence });
}

const { data: areas } = await supabase.from('areas').select('id, name').eq('subject', subject);
const nameToId = new Map(areas?.map((a) => [a.name, a.id]) ?? []);

const toInsert = [];
for (const { area, level, sentence } of normalized) {
  const area_id = nameToId.get(area);
  if (!area_id) continue;
  toInsert.push({ area_id, level, sentence });
}

if (toInsert.length === 0) {
  console.log('0 rows inserted (no matching areas or no data)');
  process.exit(0);
}

const { error } = await supabase.from('templates').insert(toInsert);
if (error) throw error;
console.log(toInsert.length, 'templates inserted');
