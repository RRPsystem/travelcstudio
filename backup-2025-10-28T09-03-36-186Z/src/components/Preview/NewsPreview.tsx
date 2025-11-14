import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, User } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  slug: string;
  content: any;
  excerpt: string;
  featured_image: string;
  status: string;
  published_at: string;
  author_type: string;
  created_at: string;
}

export function NewsPreview() {
  const [newsItem, setNewsItem] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadNews = async () => {
      try {
        const pathMatch = window.location.pathname.match(/^\/preview\/news\/(.+)$/);

        if (!pathMatch) {
          setError('Ongeldige preview URL');
          setLoading(false);
          return;
        }

        const slug = pathMatch[1];

        const { data, error: fetchError } = await supabase
          .from('news_items')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!data) {
          setError('Nieuwsartikel niet gevonden');
          setLoading(false);
          return;
        }

        setNewsItem(data);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Fout bij laden van nieuwsartikel');
        setLoading(false);
      }
    };

    loadNews();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
          <p className="text-gray-600">Nieuwsartikel laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Sluit Preview
          </button>
        </div>
      </div>
    );
  }

  if (!newsItem) {
    return null;
  }

  const renderContent = () => {
    if (!newsItem.content) {
      return (
        <div className="text-gray-500 italic">
          Geen content beschikbaar. Dit artikel moet nog bewerkt worden.
        </div>
      );
    }

    let htmlContent = '';

    if (typeof newsItem.content === 'string') {
      htmlContent = newsItem.content;
    } else if (newsItem.content.html && newsItem.content.html.trim()) {
      htmlContent = newsItem.content.html;
    } else if (newsItem.content.body_html) {
      htmlContent = newsItem.content.body_html;
    } else if (newsItem.content.json?.pages?.[0]?.html) {
      htmlContent = newsItem.content.json.pages[0].html;
    } else {
      return (
        <div className="text-gray-500 italic">
          Content kan niet weergegeven worden. Open de builder om het te bewerken.
        </div>
      );
    }

    const cleanHtml = htmlContent
      .replace(/\sclass="component-toolbar"[^>]*>[\s\S]*?<\/div>/g, '')
      .replace(/\sclass="wb-type-badge"[^>]*>[\s\S]*?<\/div>/g, '')
      .replace(/\sdraggable="true"/g, '')
      .replace(/\scontenteditable="true"/g, '')
      .replace(/\sdata-action="[^"]*"/g, '')
      .replace(/<button[^>]*class="[^"]*toolbar-btn[^"]*"[^>]*>[\s\S]*?<\/button>/g, '')
      .replace(/<button[^>]*data-tag-del[^>]*>[\s\S]*?<\/button>/g, '');

    return (
      <iframe
        srcDoc={`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
              <style>
                * {
                  box-sizing: border-box;
                }
                body {
                  margin: 0;
                  padding: 0;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  line-height: 1.6;
                  color: #1f2937;
                  background: #ffffff;
                }
                body > * {
                  max-width: 1200px;
                  margin-left: auto;
                  margin-right: auto;
                }
                body > .wb-hero-page,
                body > .wb-component.wb-hero-page {
                  max-width: 100%;
                  width: 100%;
                  margin-left: 0;
                  margin-right: 0;
                }
                .wb-component {
                  position: relative;
                }
                .wb-hero-page {
                  position: relative;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  overflow: hidden;
                }
                .wb-hero-page.edge-to-edge {
                  width: 100vw;
                  margin-left: calc(-50vw + 50%);
                }
                .hp-bg {
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  z-index: 1;
                }
                .hp-bg img {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                }
                .hp-overlay {
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  background: rgba(0, 0, 0, var(--overlay-opacity, 0.4));
                  z-index: 2;
                }
                .hp-word {
                  position: absolute;
                  z-index: 3;
                  font-weight: 900;
                  text-transform: uppercase;
                  pointer-events: none;
                  user-select: none;
                  letter-spacing: -0.02em;
                }
                .wb-news-article {
                  padding: 40px 20px;
                }
                .na-wrap {
                  background: white;
                }
                .na-header {
                  margin-bottom: 2rem;
                }
                .na-title {
                  font-size: 2.5rem;
                  font-weight: 700;
                  line-height: 1.2;
                  margin: 0 0 1rem 0;
                  color: #111827;
                }
                .na-meta {
                  display: flex;
                  gap: 12px;
                  align-items: center;
                  color: #6b7280;
                  font-size: 14px;
                  margin-bottom: 1rem;
                }
                .na-tags {
                  display: flex;
                  gap: 6px;
                  flex-wrap: wrap;
                  margin: 0;
                  padding: 0;
                  list-style: none;
                }
                .na-tag {
                  display: flex;
                  gap: 6px;
                  align-items: center;
                  padding: 4px 10px;
                  font-size: 12px;
                  border-radius: 6px;
                }
                .na-body {
                  font-size: 1.125rem;
                  line-height: 1.75;
                  color: #374151;
                }
                .na-body h1, .na-body h2, .na-body h3, .na-body h4, .na-body h5, .na-body h6 {
                  margin-top: 2rem;
                  margin-bottom: 1rem;
                  font-weight: 600;
                  color: #111827;
                }
                .na-body p {
                  margin-bottom: 1.25rem;
                }
                .na-body em {
                  font-style: italic;
                }
                .na-body strong {
                  font-weight: 600;
                }
                .na-body blockquote {
                  border-left: 4px solid #e5e7eb;
                  padding-left: 1.5rem;
                  margin: 1.5rem 0;
                  color: #6b7280;
                  font-style: italic;
                }
                .na-body hr {
                  border: none;
                  border-top: 1px solid #e5e7eb;
                  margin: 2rem 0;
                }
                .wb-media-row {
                  padding: 40px 20px;
                }
                .mr-track {
                  display: grid;
                  grid-auto-flow: column;
                  overflow-x: auto;
                  scroll-behavior: smooth;
                  -webkit-overflow-scrolling: touch;
                  scrollbar-width: thin;
                }
                .mr-track.shadow-on .mr-item {
                  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                }
                .mr-item {
                  position: relative;
                  overflow: hidden;
                  border-radius: var(--mr-item-radius, 8px);
                  height: var(--mr-item-height, 200px);
                  scroll-snap-align: start;
                }
                .mr-item img {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                }
                img {
                  max-width: 100%;
                  height: auto;
                }
                a {
                  color: #2563eb;
                  text-decoration: none;
                }
                a:hover {
                  text-decoration: underline;
                }
              </style>
            </head>
            <body>
              ${cleanHtml}
            </body>
          </html>
        `}
        className="w-full border-0"
        style={{ height: '100vh', minHeight: '600px' }}
        title="Content Preview"
      />
    );
  };

  return renderContent();
}

export default NewsPreview;
