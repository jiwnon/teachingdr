import * as XLSX from 'xlsx';

export interface ReviewExportRow {
  과목: string;
  단원: string;
  이름: string;
  평어: string;
}

export function downloadReviewXlsx(
  rows: ReviewExportRow[],
  filename: string = '평어.xlsx'
) {
  const header = ['과목', '단원', '이름', '평어'];
  const data = [header, ...rows.map((r) => [r.과목, r.단원, r.이름, r.평어])];

  const ws = XLSX.utils.aoa_to_sheet(data);

  ws['!cols'] = [
    { wch: 8 },
    { wch: 30 },
    { wch: 10 },
    { wch: 80 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '평어');
  XLSX.writeFile(wb, filename);
}
