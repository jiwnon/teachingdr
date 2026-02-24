import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

function getApiKey(): string | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key || typeof key !== 'string' || key.trim() === '') return null;
  return key.trim();
}

export async function POST(request: NextRequest) {
  try {
    let body: { templateSentence?: string; activities?: unknown };
    try {
      body = (await request.json()) as { templateSentence?: string; activities?: unknown };
    } catch {
      return NextResponse.json(
        { error: '요청 본문이 올바른 JSON이 아닙니다.' },
        { status: 400 }
      );
    }
    const templateSentence =
      typeof body.templateSentence === 'string' ? body.templateSentence : '';
    const activities = Array.isArray(body.activities)
      ? body.activities.filter((a: unknown): a is string => typeof a === 'string')
      : [];

    if (!activities.length) {
      return NextResponse.json({ sentence: templateSentence });
    }

    const apiKey = getApiKey();
    if (!apiKey) {
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

    const res = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errMsg =
        (data?.error as { message?: string })?.message ??
        (typeof data?.error === 'string' ? data.error : null) ??
        res.statusText;
      const raw = String(errMsg);
      const message =
        raw.includes('API key') || raw.includes('Incorrect API key') || raw.includes('invalid_api_key')
          ? 'OpenAI API 키가 잘못되었거나 만료되었습니다. .env.local의 OPENAI_API_KEY를 확인해 주세요.'
          : raw.includes('quota') || raw.includes('billing')
            ? 'OpenAI 사용 한도가 초과되었습니다. OpenAI 대시보드에서 요금제·결제 정보를 확인해 주세요.'
            : raw.includes('rate limit') || raw.includes('rate_limit')
              ? 'OpenAI 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.'
              : /Internal Server Error|500|timeout|ETIMEDOUT/i.test(raw)
                ? 'OpenAI 서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해 주세요. (status.openai.com 확인)'
                : /country|region|territory|not supported/i.test(raw)
                  ? 'OpenAI API가 이 지역에서 제한됩니다. (Worker placement 또는 Cloudflare Regional Services 설정을 확인해 주세요.)'
                  : raw;
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const sentence =
      data?.choices?.[0]?.message?.content?.trim() ?? templateSentence;

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
            : /Internal Server Error|500|timeout|ETIMEDOUT/i.test(raw)
              ? 'OpenAI 서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해 주세요. (status.openai.com 확인)'
              : /country|region|territory|not supported/i.test(raw)
                ? 'OpenAI API가 이 지역에서 제한됩니다. (Worker가 OpenAI 지원 지역에서 실행되도록 placement 설정됨. 재배포 후에도 발생하면 Cloudflare 대시보드에서 Regional Services를 US/EU로 설정해 보세요.)'
                : raw;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
