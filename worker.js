export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const { image, answers } = await request.json();

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
        { role: 'user', content: prompt }
      ],
      max_tokens: 800
    };

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify(aiPayload)
    });

    const { choices } = await resp.json();
    const analysis = JSON.parse(choices[0].message.content);

    return Response.json(analysis);
  }
};
