import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const templateSentence =
      typeof body?.templateSentence === 'string' ? body.templateSentence : '';
    const activities = Array.isArray(body?.activities)
      ? body.activities.filter((a: unknown): a is string => typeof a === 'string')
      : [];

    if (!activities.length) {
      return NextResponse.json({ sentence: templateSentence });
    }

    if (!openai) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const activitiesText = activities.join('\n');
    const prompt = `다음은 초등 1학년 평어 초안입니다: ${templateSentence}. 이번 학기 학습 활동: ${activitiesText}. 활동을 자연스럽게 녹여 평어를 한 문장으로 다시 써줘. 학생을 주어로 쓰지 말고, 존댓말 없이, 60자 이내로.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
    });

    const sentence =
      completion.choices[0]?.message?.content?.trim() ?? templateSentence;

    return NextResponse.json({ sentence });
  } catch (err) {
    const message = err instanceof Error ? err.message : '평어 생성 실패';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
