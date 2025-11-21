import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PageTemplate {
  template_name: string;
  page_slug: string;
  description?: string;
  preview_image_url: string;
  html_content: string;
  order_index: number;
}

interface TemplateCategory {
  category: string;
  description?: string;
  category_preview_url: string;
  pages: PageTemplate[];
}

interface RegisterTemplatesRequest {
  builder_name: string;
  templates: TemplateCategory[];
}

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const body: RegisterTemplatesRequest = await req.json();

    if (!body.builder_name || !body.templates || !Array.isArray(body.templates)) {
      throw new Error('Invalid request body. Required: builder_name, templates[]');
    }

    const results = {
      success: true,
      builder_name: body.builder_name,
      categories_processed: 0,
      templates_created: 0,
      template_ids: [] as string[],
      errors: [] as string[]
    };

    for (const category of body.templates) {
      if (!category.category || !category.category_preview_url || !Array.isArray(category.pages)) {
        results.errors.push(`Invalid category data: missing required fields`);
        continue;
      }

      results.categories_processed++;

      for (const page of category.pages) {
        try {
          if (!page.template_name || !page.page_slug || !page.preview_image_url || !page.html_content) {
            results.errors.push(`Invalid page data in category ${category.category}: missing required fields`);
            continue;
          }

          const { data: existingTemplate } = await supabase
            .from('website_page_templates')
            .select('id')
            .eq('template_type', 'external_builder')
            .eq('category', category.category)
            .eq('template_slug', page.page_slug)
            .maybeSingle();

          const templateData = {
            template_name: page.template_name,
            template_slug: page.page_slug,
            template_type: 'external_builder',
            category: category.category,
            description: page.description || null,
            preview_image_url: page.preview_image_url,
            category_preview_url: category.category_preview_url,
            html_content: page.html_content,
            order_index: page.order_index,
            is_active: false,
            metadata: {
              builder_name: body.builder_name,
              registered_at: new Date().toISOString(),
              category_description: category.description
            }
          };

          if (existingTemplate) {
            const { data, error } = await supabase
              .from('website_page_templates')
              .update(templateData)
              .eq('id', existingTemplate.id)
              .select('id')
              .single();

            if (error) throw error;

            results.template_ids.push(data.id);
            results.templates_created++;
          } else {
            const { data, error } = await supabase
              .from('website_page_templates')
              .insert(templateData)
              .select('id')
              .single();

            if (error) throw error;

            results.template_ids.push(data.id);
            results.templates_created++;
          }
        } catch (pageError: any) {
          results.errors.push(`Error processing page ${page.template_name} in ${category.category}: ${pageError.message}`);
        }
      }
    }

    const message = results.errors.length > 0
      ? `${results.templates_created} templates processed with ${results.errors.length} errors`
      : `${results.templates_created} templates successfully registered`;

    return new Response(
      JSON.stringify({
        ...results,
        message
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error registering templates:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      }
    );
  }
});