import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
      .select('*, travel_trips(whatsapp_number)')
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
        const scheduledDateTime = new Date(`${msg.scheduled_date}T${msg.scheduled_time}Z`);

        if (scheduledDateTime > now) {
          console.log(`Message ${msg.id} not yet due (scheduled for ${scheduledDateTime.toISOString()})`);
          continue;
        }

        const phoneNumber = msg.recipient_phone || msg.travel_trips?.whatsapp_number;

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

        const { data: recentSession } = await supabase
          .from('travel_whatsapp_sessions')
          .select('last_message_at')
          .eq('trip_id', msg.trip_id)
          .eq('phone_number', phoneNumber)
          .order('last_message_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        const hasRecentInteraction = recentSession?.last_message_at &&
          new Date(recentSession.last_message_at) > twentyFourHoursAgo;

        let templateSid = null;
        let templateVariables = null;
        let shouldUseTemplate = false;

        if (!hasRecentInteraction) {
          console.log(`Message ${msg.id}: No recent interaction, must use template`);
          shouldUseTemplate = true;
        }

        if (shouldUseTemplate || msg.template_name) {
          const templateName = msg.template_name || 'travelbro';

          const { data: template } = await supabase
            .from('whatsapp_templates')
            .select('template_sid, variables')
            .eq('name', templateName)
            .eq('is_active', true)
            .or(`brand_id.eq.${msg.brand_id},brand_id.is.null`)
            .maybeSingle();

          if (template) {
            templateSid = template.template_sid;

            const rawVars = msg.template_variables || {};
            templateVariables = {};

            for (const [key, value] of Object.entries(rawVars)) {
              if (value != null) {
                const stringValue = String(value);
                const sanitized = stringValue
                  .replace(/[\r\n\t]/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .substring(0, 500);

                if (sanitized) {
                  templateVariables[key] = sanitized;
                }
              }
            }

            console.log(`Using template "${templateName}" for message ${msg.id}`, {
              templateSid,
              variableCount: Object.keys(templateVariables).length,
              variables: templateVariables
            });
          } else {
            console.warn(`Template "${templateName}" not found for message ${msg.id}`);

            if (!hasRecentInteraction) {
              failCount++;
              results.push({
                id: msg.id,
                success: false,
                error: 'Template vereist maar niet gevonden (geen 24u window)'
              });
              continue;
            }
          }
        }

        const sendPayload: any = {
          to: phoneNumber,
          brandId: msg.brand_id,
          tripId: msg.trip_id
        };

        if (templateSid) {
          sendPayload.useTemplate = true;
          sendPayload.templateSid = templateSid;
          if (templateVariables && Object.keys(templateVariables).length > 0) {
            sendPayload.templateVariables = templateVariables;
          }
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
