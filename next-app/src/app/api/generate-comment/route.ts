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
    const prompt = `다음은 초등 평어 초안 문장이다: "${templateSentence}"

이번 학기 실제로 한 학습 활동 목록:
${activitiesText}

위 학습 활동 목록에 나온 구체적인 내용(활동 이름, 주제, 수업 내용 등)을 반드시 평어 문장 안에 녹여서, 같은 뜻을 유지하면서 한 문장으로 다시 써줘. 학생을 주어로 쓰지 말고, 존댓말 없이, 60자 이내로. 활동을 전혀 반영하지 않으면 안 된다.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
    });

    const sentence =
      completion.choices[0]?.message?.content?.trim() ?? templateSentence;

    return NextResponse.json({ sentence });
  } catch (err) {
    const raw = err instanceof Error ? err.message : '평어 생성 실패';
    const message =
      raw.includes('API key') || raw.includes('Incorrect API key') || raw.includes('invalid_api_key')
        ? 'OpenAI API 키가 잘못되었거나 만료되었습니다. .env.local의 OPENAI_API_KEY를 확인해 주세요.'
        : raw.includes('quota') || raw.includes('billing')
          ? 'OpenAI 사용 한도가 초과되었습니다. OpenAI 대시보드에서 요금제·결제 정보를 확인해 주세요.'
          : raw.includes('rate limit') || raw.includes('rate_limit')
            ? 'OpenAI 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.'
            : raw;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
