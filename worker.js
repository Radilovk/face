const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function handleOptions(request) {
  if (
    request.headers.get('Origin') !== null &&
    request.headers.get('Access-Control-Request-Method') !== null &&
    request.headers.get('Access-Control-Request-Headers') !== null
  ) {
    return new Response(null, { headers: corsHeaders });
  }
  return new Response(null, { headers: { Allow: 'GET,POST,OPTIONS' } });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const id = url.searchParams.get('id');
      if (id && env.RESULTS_KV) {
        const stored = await env.RESULTS_KV.get(id);
        if (stored) {
          return new Response(stored, {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      }
      return new Response('Not Found', { status: 404, headers: corsHeaders });
    }
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }

    const { image, answers } = await request.json();

    const MAX_SIZE_MB = 5;
    const sizeInBytes = image?.length ? image.length * 0.75 : 0;
    if (sizeInBytes > MAX_SIZE_MB * 1024 * 1024) {
      return new Response(
        `Payload too large. Image must be smaller than ${MAX_SIZE_MB}MB after processing.`,
        { status: 413, headers: corsHeaders }
      );
    }
    if (!image || !answers) {
      return new Response('Missing image or answers in request body', { status: 400, headers: corsHeaders });
    }

    const prompt = `Анализирай изображението и отговорите. За всеки показател дай оценка от 1 до 10, като 10 е най-добър резултат. Върни JSON със структурата:\n{
      "summary": {"overall_skin_health_score": <number>, "perceived_age": <number>, "key_findings": ["..."]},
      "anti_aging": {"wrinkle_score": <number>, "volume_loss_score": <number>, "pigmentation_score": <number>},
      "health_indicators": {"hydration_level_score": <number>, "inflammation_score": <number>, "stress_impact_score": <number>},
      "findings_map": {"HIGH_WRINKLE_SCORE": <boolean>, "HIGH_PIGMENTATION_SCORE": <boolean>, "POOR_HYDRATION": <boolean>, "HIGH_INFLAMMATION": <boolean>, "HIGH_STRESS_IMPACT": <boolean>}
    }`;

    const aiPayload = {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Кожен специалист AI' },
        {
          role: 'user',
          content: [
            { type: 'text', text: `${prompt}\n${JSON.stringify(answers)}` },
            { type: 'image_url', image_url: { url: image, detail: 'auto' } }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 800
    };

    let resp;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`
        },
        body: JSON.stringify(aiPayload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (err) {
      console.error('Failed to call OpenAI:', err);
      return new Response('Вътрешна грешка при AI заявката.', { status: 500, headers: corsHeaders });
    }

    if (!resp.ok) {
      const errorText = await resp.text().catch(() => '');
      console.error('OpenAI API error:', resp.status, errorText);
      return new Response('Грешка при обработката на AI.', { status: 502, headers: corsHeaders });
    }

      let data;
      try {
        data = await resp.json();
      } catch (err) {
        console.error('Неуспешно парсване на JSON от OpenAI:', err);
        return new Response('Невалиден формат на отговора от AI.', { status: 502, headers: corsHeaders });
      }

      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        console.error('Неочакван отговор от OpenAI:', JSON.stringify(data));
        return new Response('Липсва съдържание от AI.', { status: 502, headers: corsHeaders });
      }

      let aiResponse;
      try {
        aiResponse = JSON.parse(content);
        console.log('AI Parsed response:', aiResponse);
      } catch (err) {
        console.error('Грешка при парсване на AI съдържанието:', err, content);
        return new Response('AI върна невалиден JSON.', { status: 502, headers: corsHeaders });
      }

      const analysis = {
        summary: {
          overall_skin_health_score: aiResponse?.summary?.overall_skin_health_score ?? 0,
          perceived_age: aiResponse?.summary?.perceived_age ?? 0,
          key_findings: aiResponse?.summary?.key_findings ?? []
        },
        anti_aging: aiResponse?.anti_aging ?? {},
        health_indicators: aiResponse?.health_indicators ?? {},
        findings_map: aiResponse?.findings_map ?? {},
        advice: {}
      };

      if (env.ADVICE_KV) {
        for (const [flag, active] of Object.entries(analysis.findings_map)) {
          if (active) {
            const tip = await env.ADVICE_KV.get(flag);
            if (tip) analysis.advice[flag] = tip;
          }
        }
      }

      const id = crypto.randomUUID();
      analysis.id = id;
      if (env.RESULTS_KV) {
        await env.RESULTS_KV.put(id, JSON.stringify(analysis), {
          expirationTtl: 60 * 60 * 24 * 30
        });
      }

      return Response.json(analysis, { headers: corsHeaders });
  }
};
