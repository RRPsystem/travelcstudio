import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MenuSetupRequest {
  brand_id: string;
  website_id?: string;
}

const MENU_PAGES = [
  { slug: 'home', order: 1, label: 'Home' },
  { slug: 'index', order: 1, label: 'Home' },
  { slug: 'about', order: 2, label: 'About' },
  { slug: 'tours', order: 3, label: 'Tours' },
  { slug: 'destinations', order: 4, label: 'Destinations' },
  { slug: 'contact', order: 5, label: 'Contact' },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: MenuSetupRequest = await req.json();
    const { brand_id, website_id } = body;

    if (!brand_id && !website_id) {
      return new Response(
        JSON.stringify({ error: "brand_id or website_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[SETUP-MENU] Setting up menu for:", { brand_id, website_id });

    let query = supabase
      .from("pages")
      .select("id, slug, title");

    if (website_id) {
      query = query.eq("website_id", website_id);
    } else {
      query = query.eq("brand_id", brand_id);
    }

    const { data: pages, error: pagesError } = await query;

    if (pagesError) {
      console.error("[SETUP-MENU] Error fetching pages:", pagesError);
      return new Response(
        JSON.stringify({ error: pagesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pages || pages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No pages found for this brand/website" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[SETUP-MENU] Found ${pages.length} pages`);

    const updates = [];

    for (const menuPage of MENU_PAGES) {
      const page = pages.find(p => p.slug === menuPage.slug || p.slug === `/${menuPage.slug}`);

      if (page) {
        console.log(`[SETUP-MENU] Updating page: ${page.slug} (${page.title})`);

        const { error: updateError } = await supabase
          .from("pages")
          .update({
            show_in_menu: true,
            menu_order: menuPage.order,
            menu_label: menuPage.label,
            status: 'published'
          })
          .eq("id", page.id);

        if (updateError) {
          console.error(`[SETUP-MENU] Error updating page ${page.id}:`, updateError);
        } else {
          updates.push({
            id: page.id,
            slug: page.slug,
            title: page.title,
            menu_order: menuPage.order,
            menu_label: menuPage.label
          });
        }
      }
    }

    console.log(`[SETUP-MENU] Successfully updated ${updates.length} pages`);

    return new Response(
      JSON.stringify({
        success: true,
        updated_pages: updates.length,
        pages: updates
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("[SETUP-MENU] Error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
