/**
 * 작업 페이지: 단원별 등급 테이블 → 평어 생성 → 결과 보기/다운로드
 * 뼈대만 구성. GradeTable, ResultViewer 등 연동 예정.
 */
type Props = { params: { id: string } };

export default function ProjectPage({ params }: Props) {
  const { id } = params;
  return (
    <main>
      <h1>프로젝트 {id}</h1>
      <p>단원별 등급 입력 후 평어를 생성하세요.</p>
    </main>
  );
}
