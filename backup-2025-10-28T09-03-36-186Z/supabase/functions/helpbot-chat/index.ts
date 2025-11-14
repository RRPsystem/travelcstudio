import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const { messages }: RequestBody = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: messages array required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: apiSettings, error: settingsError } = await supabase
      .from('api_settings')
      .select('api_key, is_active')
      .eq('provider', 'OpenAI')
      .eq('service_name', 'OpenAI API')
      .maybeSingle();

    if (settingsError || !apiSettings?.is_active || !apiSettings?.api_key) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured or inactive' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: chatbotSettings } = await supabase
      .from('chatbot_settings')
      .select('system_prompt')
      .limit(1)
      .maybeSingle();

    const systemPrompt = chatbotSettings?.system_prompt || messages.find(m => m.role === 'system')?.content || '';

    const messagesWithSystemPrompt = messages.filter(m => m.role !== 'system');
    if (systemPrompt) {
      messagesWithSystemPrompt.unshift({ role: 'system', content: systemPrompt });
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiSettings.api_key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messagesWithSystemPrompt,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'OpenAI API error', details: errorData }),
        {
          status: openaiResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await openaiResponse.json();

    const userQuestion = messages.find(m => m.role === 'user')?.content || '';
    const botResponse = data.choices[0]?.message?.content || '';

    const { data: conversation, error: insertError } = await supabase
      .from('helpbot_conversations')
      .insert({
        user_id: user.id,
        user_role: userData?.role || 'unknown',
        user_question: userQuestion,
        bot_response: botResponse,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error inserting conversation:', insertError);
    }

    return new Response(
      JSON.stringify({
        ...data,
        conversation_id: conversation?.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in helpbot-chat:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});