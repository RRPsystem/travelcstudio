import { createClient } from 'npm:@supabase/supabase-js@2';
import { deductCredits } from '../_shared/credits.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { episode_id, topic } = await req.json();

    if (!episode_id || !topic) {
      return new Response(JSON.stringify({ error: 'Missing episode_id or topic' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: apiSettings } = await supabase
      .from('api_settings')
      .select('openai_api_key')
      .limit(1)
      .maybeSingle();

    const openaiKey = apiSettings?.openai_api_key || Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const topics = topic.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0);
    const topicsText = topics.length > 1
      ? `de volgende onderwerpen: ${topics.join(', ')}`
      : `het onderwerp: "${topics[0]}"`;

    const prompt = `Genereer 10 interessante, diepgaande vragen voor een reispodcast over ${topicsText}.

${topics.length > 1 ? 'Verdeel de vragen gelijkmatig over alle genoemde onderwerpen.' : ''}

De vragen moeten:
- Open en inspirerend zijn
- Praktische waarde hebben voor luisteraars
- Variëren van algemeen naar specifiek
- Aanmoedigen tot storytelling
- Bij elkaar passen qua thema

Geef alleen de vragen, genummerd 1-10.`;

    const creditResult = await deductCredits(
      supabase,
      user.id,
      'ai_podcast_questions',
      'Podcast vragen genereren',
      { episode_id, topic }
    );

    if (!creditResult.success) {
      return new Response(JSON.stringify({ error: creditResult.error || 'Insufficient credits' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);
      return new Response(JSON.stringify({ error: 'Failed to generate questions', details: errorData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const result = await openaiResponse.json();
    const generatedText = result.choices[0].message.content;

    const questionLines = generatedText
      .split('\n')
      .filter((line: string) => line.match(/^\d+\./))
      .map((line: string) => line.replace(/^\d+\.\s*/, '').trim());

    const { data: existingQuestions } = await supabase
      .from('podcast_questions')
      .select('order_index')
      .eq('episode_planning_id', episode_id)
      .order('order_index', { ascending: false })
      .limit(1);

    const startIndex = existingQuestions?.[0]?.order_index ?? -1;

    const questionsToInsert = questionLines.map((question: string, index: number) => ({
      episode_planning_id: episode_id,
      question,
      source_type: 'ai',
      status: 'suggested',
      order_index: startIndex + index + 1
    }));

    const { error: insertError } = await supabase
      .from('podcast_questions')
      .insert(questionsToInsert);

    if (insertError) {
      console.error('Error inserting questions:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to save questions', details: insertError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${questionLines.length} vragen succesvol gegenereerd`,
        questions: questionLines
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});