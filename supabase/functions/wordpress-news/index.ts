import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NewsItem {
  id: string;
  title: string;
  slug: string;
  content: any;
  excerpt: string | null;
  featured_image: string | null;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author_type: string | null;
  author_id: string | null;
  tags: string[] | null;
  is_mandatory: boolean;
  source: 'own' | 'assigned';
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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const brandId = url.searchParams.get("brand_id");
    const newsId = url.searchParams.get("id");
    const slug = url.searchParams.get("slug");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    if (!brandId) {
      return new Response(
        JSON.stringify({ error: "brand_id parameter is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (newsId) {
      const newsItem = await getNewsItemById(supabase, brandId, newsId);

      if (!newsItem) {
        return new Response(
          JSON.stringify({ error: "News item not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(JSON.stringify(newsItem), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (slug) {
      const newsItem = await getNewsItemBySlug(supabase, brandId, slug);

      if (!newsItem) {
        return new Response(
          JSON.stringify({ error: "News item not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(JSON.stringify(newsItem), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allNews = await getAllNewsForBrand(supabase, brandId, limit, offset);

    return new Response(
      JSON.stringify({
        news: allNews,
        total: allNews.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in wordpress-news function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function getAllNewsForBrand(
  supabase: any,
  brandId: string,
  limit: number,
  offset: number
): Promise<NewsItem[]> {
  const ownNewsQuery = supabase
    .from("news_items")
    .select("*")
    .eq("brand_id", brandId)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const { data: ownNews, error: ownError } = await ownNewsQuery;

  if (ownError) {
    console.error("Error fetching own news:", ownError);
    throw new Error(`Failed to fetch own news: ${ownError.message}`);
  }

  const assignmentsQuery = supabase
    .from("news_brand_assignments")
    .select(`
      news_id,
      is_published,
      news_items!inner (
        id,
        title,
        slug,
        content,
        excerpt,
        featured_image,
        status,
        published_at,
        created_at,
        updated_at,
        author_type,
        author_id,
        tags,
        is_mandatory
      )
    `)
    .eq("brand_id", brandId)
    .eq("is_published", true)
    .eq("news_items.status", "published");

  const { data: assignments, error: assignmentError } = await assignmentsQuery;

  if (assignmentError) {
    console.error("Error fetching assigned news:", assignmentError);
    throw new Error(`Failed to fetch assigned news: ${assignmentError.message}`);
  }

  const ownNewsWithSource: NewsItem[] = (ownNews || []).map((item: any) => ({
    ...item,
    source: 'own' as const,
  }));

  const assignedNewsWithSource: NewsItem[] = (assignments || []).map((assignment: any) => ({
    ...assignment.news_items,
    source: 'assigned' as const,
  }));

  const allNews = [...ownNewsWithSource, ...assignedNewsWithSource];

  allNews.sort((a, b) => {
    const dateA = new Date(a.published_at || a.created_at).getTime();
    const dateB = new Date(b.published_at || b.created_at).getTime();
    return dateB - dateA;
  });

  return allNews.slice(offset, offset + limit);
}

async function getNewsItemById(
  supabase: any,
  brandId: string,
  newsId: string
): Promise<NewsItem | null> {
  const { data: ownNews, error: ownError } = await supabase
    .from("news_items")
    .select("*")
    .eq("id", newsId)
    .eq("brand_id", brandId)
    .eq("status", "published")
    .maybeSingle();

  if (ownError) {
    console.error("Error fetching own news by id:", ownError);
    throw new Error(`Failed to fetch news by id: ${ownError.message}`);
  }

  if (ownNews) {
    return { ...ownNews, source: 'own' };
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("news_brand_assignments")
    .select(`
      news_items!inner (
        id,
        title,
        slug,
        content,
        excerpt,
        featured_image,
        status,
        published_at,
        created_at,
        updated_at,
        author_type,
        author_id,
        tags,
        is_mandatory
      )
    `)
    .eq("news_id", newsId)
    .eq("brand_id", brandId)
    .eq("is_published", true)
    .eq("news_items.status", "published")
    .maybeSingle();

  if (assignmentError) {
    console.error("Error fetching assigned news by id:", assignmentError);
    throw new Error(`Failed to fetch assigned news by id: ${assignmentError.message}`);
  }

  if (assignment && assignment.news_items) {
    return { ...assignment.news_items, source: 'assigned' };
  }

  return null;
}

async function getNewsItemBySlug(
  supabase: any,
  brandId: string,
  slug: string
): Promise<NewsItem | null> {
  const { data: ownNews, error: ownError } = await supabase
    .from("news_items")
    .select("*")
    .eq("slug", slug)
    .eq("brand_id", brandId)
    .eq("status", "published")
    .maybeSingle();

  if (ownError) {
    console.error("Error fetching own news by slug:", ownError);
    throw new Error(`Failed to fetch news by slug: ${ownError.message}`);
  }

  if (ownNews) {
    return { ...ownNews, source: 'own' };
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("news_brand_assignments")
    .select(`
      news_items!inner (
        id,
        title,
        slug,
        content,
        excerpt,
        featured_image,
        status,
        published_at,
        created_at,
        updated_at,
        author_type,
        author_id,
        tags,
        is_mandatory
      )
    `)
    .eq("brand_id", brandId)
    .eq("is_published", true)
    .eq("news_items.slug", slug)
    .eq("news_items.status", "published")
    .maybeSingle();

  if (assignmentError) {
    console.error("Error fetching assigned news by slug:", assignmentError);
    throw new Error(`Failed to fetch assigned news by slug: ${assignmentError.message}`);
  }

  if (assignment && assignment.news_items) {
    return { ...assignment.news_items, source: 'assigned' };
  }

  return null;
}
