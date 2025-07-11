// src/worker.js

export default {
  async fetch(request, env) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    try {
      const { image, answers } = await request.json();

      // --- Check base64 image size to avoid excessive API costs ---
      const MAX_SIZE_MB = 5;
      const sizeInBytes = image.length * 0.75; // rough original size from base64
      const maxSizeBytes = MAX_SIZE_MB * 1024 * 1024;
      if (sizeInBytes > maxSizeBytes) {
        return new Response(
          `Payload too large. Image must be smaller than ${MAX_SIZE_MB}MB after processing.`,
          { status: 413, headers: { ...corsHeaders } }
        );
      }

      if (!image || !answers) {
        return new Response('Missing image or answers in request body', { status: 400 });
      }

      // 1. Get Analysis from OpenAI
      const aiAnalysis = await getOpenAIAnalysis(image, answers, env.OPENAI_API_KEY);
      
      // Check if OpenAI returned a valid JSON
      if (!aiAnalysis || typeof aiAnalysis !== 'object') {
        console.error("Invalid response from OpenAI:", aiAnalysis);
        return new Response('Failed to get a valid analysis from AI model.', { status: 500 });
      }

      // 2. Augment with advice from KV (RAG)
      const finalResult = await augmentWithAdvice(aiAnalysis, env.FACE_ADVICE_KV);

      // 3. Return the final, augmented result
      return new Response(JSON.stringify(finalResult), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });

    } catch (error) {
      console.error('Error in worker:', error);
      return new Response(`Internal Server Error: ${error.message}`, {
        status: 500,
        headers: { ...corsHeaders },
      });
    }
  },
};

// --- CORS Headers ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // В реална продукция заменете '*' с вашия GitHub Pages домейн
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function handleOptions(request) {
  if (
    request.headers.get('Origin') !== null &&
    request.headers.get('Access-Control-Request-Method') !== null &&
    request.headers.get('Access-Control-Request-Headers') !== null
  ) {
    // Handle CORS preflight requests.
    return new Response(null, { headers: corsHeaders });
  } else {
    // Handle standard OPTIONS request.
    return new Response(null, {
      headers: {
        Allow: 'POST, OPTIONS',
      },
    });
  }
}


// --- OpenAI Interaction ---
async function getOpenAIAnalysis(base64Image, answers, apiKey) {
  const prompt = `
    Analyze the user's face from the provided image and their questionnaire answers.
    User's Answers: ${JSON.stringify(answers)}
    
    Based on both the visual information and the user's answers, provide a detailed analysis.
    Your response MUST be a valid JSON object ONLY, with no other text before or after it.
    Use the following structure. Scores are from 1 (very good) to 10 (very poor).

    {
      "summary": {
        "perceived_age": "e.g., 35-40",
        "overall_skin_health_score": 0,
        "key_findings": ["A brief summary of the top 2-3 findings."]
      },
      "anti_aging": {
        "wrinkle_score": 0,
        "volume_loss_score": 0,
        "pigmentation_score": 0,
        "texture_score": 0
      },
      "health_indicators": {
        "hydration_level_score": 0,
        "inflammation_score": 0,
        "potential_glycation_signs_score": 0,
        "stress_impact_score": 0
      },
      "findings_map": {
        "HIGH_WRINKLE_SCORE": false,
        "HIGH_PIGMENTATION_SCORE": false,
        "POOR_HYDRATION": false,
        "HIGH_INFLAMMATION": false,
        "HIGH_STRESS_IMPACT": false
      }
    }

    Instructions for populating 'findings_map':
    - Set HIGH_WRINKLE_SCORE to true if wrinkle_score is 7 or higher.
    - Set HIGH_PIGMENTATION_SCORE to true if pigmentation_score is 7 or higher.
    - Set POOR_HYDRATION to true if hydration_level_score is 6 or higher.
    - Set HIGH_INFLAMMATION to true if inflammation_score is 6 or higher.
    - Set HIGH_STRESS_IMPACT to true if stress_impact_score is 7 or higher.
  `;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: base64Image,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API Error: ${response.status} ${response.statusText} - ${errorBody}`);
  }
  
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}


// --- KV Interaction (RAG) ---
async function augmentWithAdvice(analysis, kv) {
    analysis.advice = {}; // Create a new object to store advice
    const findings = analysis.findings_map || {};

    for (const key in findings) {
        if (findings[key] === true) {
            // The key in findings_map (e.g., "HIGH_WRINKLE_SCORE") is the key for KV
            const adviceText = await kv.get(key);
            if (adviceText) {
                analysis.advice[key] = adviceText;
            }
        }
    }
    return analysis;
}
