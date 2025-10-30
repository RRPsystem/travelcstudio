import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function uploadFileToOpenAI(pdfBuffer: ArrayBuffer, openaiApiKey: string, filename: string) {
  const formData = new FormData();
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  formData.append('file', blob, filename);
  formData.append('purpose', 'assistants');

  const response = await fetch('https://api.openai.com/v1/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`File upload failed: ${error}`);
  }

  return await response.json();
}

async function createThread(openaiApiKey: string, fileId: string, instructions: string) {
  const response = await fetch('https://api.openai.com/v1/threads', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: instructions,
          attachments: [
            {
              file_id: fileId,
              tools: [{ type: 'file_search' }]
            }
          ]
        }
      ]
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Thread creation failed: ${error}`);
  }

  return await response.json();
}

async function createAssistant(openaiApiKey: string) {
  const response = await fetch('https://api.openai.com/v1/assistants', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
    },
    body: JSON.stringify({
      name: 'Travel Document Parser',
      instructions: `Je bent een expert reisdocument parser. Extraheer en structureer ALLE reis informatie uit het PDF document.\n\nVERPLICHTE VELDEN (STRICT):\n- trip_name: Naam van de reis\n- reservation_id: Hoofdreserveringsnummer\n- departure_date: Vertrekdatum (ISO 8601: YYYY-MM-DD)\n- arrival_date: Aankomstdatum (ISO 8601: YYYY-MM-DD)\n- destination: { city, country, region }\n- segments: Array van reissegmenten (flights, hotels, transfers)\n- booking_refs: { flight, hotel, transfer, other }\n- emergency_contacts: Array met { name, phone, type }\n\nElk segment MOET bevatten:\n- kind: "flight" | "hotel" | "transfer" | "activity"\n- segment_ref: Unieke referentie (boeknummer)\n- start_datetime: ISO 8601 datetime\n- end_datetime: ISO 8601 datetime (optioneel, gebruik null indien niet bekend)\n- location: { name, address, city, country }\n- details: Object met specifieke info (bijv. flight_number, room_type, etc)\n\nBELANGRIJK:\n- Extraheer ALLE reserveringsnummers (PNR, boekingscodes, referenties)\n- Alle datums MOETEN ISO 8601 format zijn (YYYY-MM-DD of YYYY-MM-DDTHH:MM:SS)\n- Alle adressen compleet en gestructureerd\n- ALLE noodnummers en contactgegevens\n- Als info ontbreekt: gebruik null (niet weglaten)\n\nReturn ONLY valid JSON matching the schema.`,
      model: 'gpt-4o',
      tools: [{ type: 'file_search' }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "travel_document_schema",
          strict: false,
          schema: {
            type: "object",
            properties: {
              trip_name: { type: "string" },
              reservation_id: { type: "string" },
              departure_date: { type: "string" },
              arrival_date: { type: "string" },
              destination: {
                type: "object",
                properties: {
                  city: { type: "string" },
                  country: { type: "string" },
                  region: { type: ["string", "null"] }
                },
                required: ["city", "country"],
                additionalProperties: false
              },
              segments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    kind: { type: "string", enum: ["flight", "hotel", "transfer", "activity"] },
                    segment_ref: { type: "string" },
                    start_datetime: { type: "string" },
                    end_datetime: { type: ["string", "null"] },
                    location: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        address: { type: "string" },
                        city: { type: ["string", "null"] },
                        country: { type: ["string", "null"] }
                      },
                      required: ["name", "address"],
                      additionalProperties: false
                    },
                    details: { type: "object", additionalProperties: true }
                  },
                  required: ["kind", "segment_ref", "start_datetime", "location"],
                  additionalProperties: false
                }
              },
              booking_refs: {
                type: "object",
                properties: {
                  flight: { type: ["string", "null"] },
                  hotel: { type: ["string", "null"] },
                  transfer: { type: ["string", "null"] },
                  other: { type: "array", items: { type: "string" } }
                },
                required: [],
                additionalProperties: false
              },
              emergency_contacts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    phone: { type: "string" },
                    type: { type: "string" }
                  },
                  required: ["name", "phone", "type"],
                  additionalProperties: false
                }
              },
              important_notes: { type: "array", items: { type: "string" } },
              included_services: { type: "array", items: { type: "string" } }
            },
            required: ["trip_name", "reservation_id", "departure_date", "arrival_date", "destination", "segments"],
            additionalProperties: false
          }
        }
      }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Assistant creation failed: ${error}`);
  }

  return await response.json();
}

async function runAssistant(openaiApiKey: string, assistantId: string, threadId: string) {
  const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
    },
    body: JSON.stringify({
      assistant_id: assistantId,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Run creation failed: ${error}`);
  }

  return await response.json();
}

async function waitForCompletion(openaiApiKey: string, threadId: string, runId: string, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'OpenAI-Beta': 'assistants=v2',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to check run status');
    }

    const run = await response.json();

    if (run.status === 'completed') {
      return run;
    } else if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
      throw new Error(`Run ${run.status}: ${run.last_error?.message || 'Unknown error'}`);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error('Timeout waiting for completion');
}

async function getMessages(openaiApiKey: string, threadId: string) {
  const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'OpenAI-Beta': 'assistants=v2',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get messages');
  }

  return await response.json();
}

async function deleteFile(openaiApiKey: string, fileId: string) {
  try {
    await fetch(`https://api.openai.com/v1/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
    });
  } catch (error) {
    console.warn('Failed to delete file:', error);
  }
}

async function deleteAssistant(openaiApiKey: string, assistantId: string) {
  try {
    await fetch(`https://api.openai.com/v1/assistants/${assistantId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'OpenAI-Beta': 'assistants=v2',
      },
    });
  } catch (error) {
    console.warn('Failed to delete assistant:', error);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  let fileId: string | null = null;
  let assistantId: string | null = null;

  try {
    const { pdfUrl } = await req.json();

    if (!pdfUrl) {
      return new Response(
        JSON.stringify({ error: "PDF URL is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    const { data: apiSettings, error: apiError } = await supabase
      .from("api_settings")
      .select("api_key")
      .eq("provider", "OpenAI")
      .eq("service_name", "OpenAI API")
      .maybeSingle();

    if (apiError || !apiSettings?.api_key) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured in database" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiApiKey = apiSettings.api_key;

    console.log('Downloading PDF from:', pdfUrl);
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error("Failed to download PDF");
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const filename = pdfUrl.split('/').pop() || 'document.pdf';

    console.log('Uploading file to OpenAI...');
    const fileUpload = await uploadFileToOpenAI(pdfBuffer, openaiApiKey, filename);
    fileId = fileUpload.id;
    console.log('File uploaded:', fileId);

    console.log('Creating assistant...');
    const assistant = await createAssistant(openaiApiKey);
    assistantId = assistant.id;
    console.log('Assistant created:', assistantId);

    console.log('Creating thread with file...');
    const thread = await createThread(
      openaiApiKey,
      fileId,
      'Analyseer dit reisdocument PDF en extraheer ALLE informatie volgens het schema. Wees zeer grondig met reserveringsnummers, datums en contactgegevens. Return ONLY the JSON object, no additional text.'
    );
    console.log('Thread created:', thread.id);

    console.log('Running assistant...');
    const run = await runAssistant(openaiApiKey, assistantId, thread.id);
    console.log('Run started:', run.id);

    console.log('Waiting for completion...');
    await waitForCompletion(openaiApiKey, thread.id, run.id);
    console.log('Run completed');

    console.log('Getting messages...');
    const messages = await getMessages(openaiApiKey, thread.id);

    const assistantMessage = messages.data.find((msg: any) => msg.role === 'assistant');
    if (!assistantMessage || !assistantMessage.content || assistantMessage.content.length === 0) {
      throw new Error('No response from assistant');
    }

    const content = assistantMessage.content[0];
    const jsonText = content.type === 'text' ? content.text.value : '';

    console.log('Parsing JSON response...');
    const parsedData = JSON.parse(jsonText);

    console.log('Cleaning up resources...');
    if (fileId) await deleteFile(openaiApiKey, fileId);
    if (assistantId) await deleteAssistant(openaiApiKey, assistantId);

    return new Response(
      JSON.stringify(parsedData),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error parsing PDF:", error);

    if (fileId) {
      try {
        const { data: apiSettings } = await createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        )
          .from("api_settings")
          .select("api_key")
          .eq("provider", "OpenAI")
          .eq("service_name", "OpenAI API")
          .maybeSingle();

        if (apiSettings?.api_key) {
          await deleteFile(apiSettings.api_key, fileId);
          if (assistantId) await deleteAssistant(apiSettings.api_key, assistantId);
        }
      } catch (cleanupError) {
        console.warn('Cleanup failed:', cleanupError);
      }
    }

    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});