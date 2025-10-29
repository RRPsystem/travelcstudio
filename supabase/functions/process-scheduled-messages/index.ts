import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();

    const { data: messages, error: fetchError } = await supabase
      .from('scheduled_whatsapp_messages')
      .select('*, travel_trips(phone_number)')
      .eq('is_sent', false)
      .lte('scheduled_date', now.toISOString().split('T')[0])
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error('Error fetching scheduled messages:', fetchError);
      throw fetchError;
    }

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: 'Geen berichten om te verwerken'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Found ${messages.length} scheduled messages to process`);

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const msg of messages) {
      try {
        const scheduledDateTime = new Date(`${msg.scheduled_date}T${msg.scheduled_time}`);

        const timezoneOffsetMinutes = getTimezoneOffset(msg.timezone);
        const localScheduledTime = new Date(scheduledDateTime.getTime() + (timezoneOffsetMinutes * 60000));

        if (localScheduledTime > now) {
          console.log(`Message ${msg.id} not yet due (scheduled for ${localScheduledTime.toISOString()})`);
          continue;
        }

        const phoneNumber = msg.recipient_phone || msg.travel_trips?.phone_number;

        if (!phoneNumber) {
          console.error(`Message ${msg.id} has no phone number`);
          await supabase
            .from('scheduled_whatsapp_messages')
            .update({
              is_sent: true,
              sent_at: now.toISOString(),
            })
            .eq('id', msg.id);

          failCount++;
          results.push({
            id: msg.id,
            success: false,
            error: 'Geen telefoonnummer beschikbaar'
          });
          continue;
        }

        let templateSid = null;
        let templateVariables = null;

        if (msg.template_name) {
          const { data: template } = await supabase
            .from('whatsapp_templates')
            .select('template_sid, variables')
            .eq('name', msg.template_name)
            .eq('is_active', true)
            .or(`brand_id.eq.${msg.brand_id},brand_id.is.null`)
            .maybeSingle();

          if (template) {
            templateSid = template.template_sid;
            templateVariables = msg.template_variables || {};
          } else {
            console.warn(`Template "${msg.template_name}" not found for message ${msg.id}`);
          }
        }

        const sendPayload: any = {
          to: phoneNumber,
          brandId: msg.brand_id
        };

        if (templateSid) {
          sendPayload.useTemplate = true;
          sendPayload.templateSid = templateSid;
          sendPayload.templateVariables = templateVariables;
        } else {
          sendPayload.message = msg.message_content;
        }

        const sendResponse = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sendPayload),
        });

        const sendResult = await sendResponse.json();

        if (sendResult.success) {
          await supabase
            .from('scheduled_whatsapp_messages')
            .update({
              is_sent: true,
              sent_at: now.toISOString(),
            })
            .eq('id', msg.id);

          successCount++;
          results.push({
            id: msg.id,
            success: true,
            messageSid: sendResult.messageSid
          });

          console.log(`✅ Message ${msg.id} sent successfully`);
        } else {
          failCount++;
          results.push({
            id: msg.id,
            success: false,
            error: sendResult.error
          });

          console.error(`❌ Failed to send message ${msg.id}:`, sendResult.error);
        }

      } catch (error) {
        failCount++;
        results.push({
          id: msg.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        console.error(`Error processing message ${msg.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: successCount + failCount,
        successful: successCount,
        failed: failCount,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in process-scheduled-messages:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function getTimezoneOffset(timezone: string): number {
  const offsets: Record<string, number> = {
    'Europe/Amsterdam': 60,
    'Europe/Brussels': 60,
    'Europe/Paris': 60,
    'Europe/Berlin': 60,
    'Europe/London': 0,
    'America/New_York': -300,
    'America/Los_Angeles': -480,
    'Asia/Bangkok': 420,
    'Asia/Tokyo': 540,
    'Australia/Sydney': 660,
  };

  return offsets[timezone] || 60;
}