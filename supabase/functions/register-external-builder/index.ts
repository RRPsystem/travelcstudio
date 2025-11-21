import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BuilderCategory {
  category: string;
  display_name: string;
  description?: string;
  total_pages: number;
  preview_url?: string;
  tags?: string[];
  features?: string[];
  recommended_pages?: string[];
}

interface BuilderRegistration {
  builder_name: string;
  builder_url: string;
  api_endpoint: string;
  editor_url?: string;
  version?: string;
  categories: BuilderCategory[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === "POST") {
      const { registration_url, auth_token } = await req.json();

      if (!registration_url) {
        throw new Error("registration_url is required");
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (auth_token) {
        headers["Authorization"] = `Bearer ${auth_token}`;
      }

      const response = await fetch(registration_url, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch registration data: ${response.statusText}`);
      }

      const registrationData: BuilderRegistration = await response.json();

      const { data: existingBuilder } = await supabase
        .from("external_builders")
        .select("id")
        .eq("api_endpoint", registrationData.api_endpoint)
        .maybeSingle();

      let builderId: string;

      if (existingBuilder) {
        const { data: updatedBuilder, error: updateError } = await supabase
          .from("external_builders")
          .update({
            name: registrationData.builder_name,
            builder_url: registrationData.builder_url,
            editor_url: registrationData.editor_url,
            auth_token: auth_token || null,
            version: registrationData.version || "1.0.0",
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingBuilder.id)
          .select("id")
          .single();

        if (updateError) throw updateError;
        builderId = updatedBuilder.id;
      } else {
        const { data: newBuilder, error: insertError } = await supabase
          .from("external_builders")
          .insert({
            name: registrationData.builder_name,
            builder_url: registrationData.builder_url,
            api_endpoint: registrationData.api_endpoint,
            editor_url: registrationData.editor_url,
            auth_token: auth_token || null,
            version: registrationData.version || "1.0.0",
            is_active: true,
          })
          .select("id")
          .single();

        if (insertError) throw insertError;
        builderId = newBuilder.id;
      }

      for (const category of registrationData.categories) {
        const { data: existingCategory } = await supabase
          .from("builder_categories")
          .select("id")
          .eq("builder_id", builderId)
          .eq("category_slug", category.category)
          .maybeSingle();

        if (existingCategory) {
          await supabase
            .from("builder_categories")
            .update({
              display_name: category.display_name,
              description: category.description,
              total_pages: category.total_pages,
              preview_url: category.preview_url,
              tags: category.tags || [],
              features: category.features || [],
              recommended_pages: category.recommended_pages || [],
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingCategory.id);
        } else {
          await supabase
            .from("builder_categories")
            .insert({
              builder_id: builderId,
              category_slug: category.category,
              display_name: category.display_name,
              description: category.description,
              total_pages: category.total_pages,
              preview_url: category.preview_url,
              tags: category.tags || [],
              features: category.features || [],
              recommended_pages: category.recommended_pages || [],
              is_active: true,
            });
        }
      }

      const { data: builder } = await supabase
        .from("external_builders")
        .select(`
          *,
          builder_categories (*)
        `)
        .eq("id", builderId)
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          message: "Builder registered successfully",
          builder,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (req.method === "GET") {
      const { data: builders, error } = await supabase
        .from("external_builders")
        .select(`
          *,
          builder_categories (*)
        `)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;

      return new Response(
        JSON.stringify({ builders }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
