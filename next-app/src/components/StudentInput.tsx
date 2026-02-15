/**
 * 학생 명단 입력 (수동 입력 또는 엑셀 붙여넣기)
 * 뼈대만 구성. 텍스트 영역/파일 업로드 연동 예정.
 */
'use client';

type Props = {
  value?: string;
  onChange?: (text: string) => void;
  placeholder?: string;
};

export default function StudentInput({
  value = '',
  onChange,
  placeholder = '한 줄에 한 명씩 입력하거나 엑셀에서 붙여넣기',
}: Props) {
  return (
    <div>
      <label>학생 명단</label>
      <textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        rows={8}
      />
    </div>
  );
}
