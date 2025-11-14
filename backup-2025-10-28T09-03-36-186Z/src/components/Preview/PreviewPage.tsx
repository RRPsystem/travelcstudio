import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface PageData {
  title: string;
  content_json: any;
  body_html?: string;
  status: string;
}

export function PreviewPage() {
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadPage = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const brandId = params.get('brand_id');
        const slug = params.get('slug');
        const pageId = params.get('page_id');

        if (!brandId && !pageId) {
          setError('Geen brand_id of page_id opgegeven');
          setLoading(false);
          return;
        }

        let data, error;

        if (brandId && slug) {
          const result = await supabase
            .from('pages')
            .select('title, content_json, body_html, status')
            .eq('brand_id', brandId)
            .eq('slug', slug)
            .maybeSingle();

          data = result.data;
          error = result.error;
        } else if (pageId) {
          const result = await supabase
            .from('pages')
            .select('title, content_json, body_html, status')
            .eq('id', pageId)
            .maybeSingle();

          data = result.data;
          error = result.error;
        }

        if (error) throw error;

        if (!data) {
          setError('Pagina niet gevonden');
          setLoading(false);
          return;
        }

        if (!data.content_json && !data.body_html) {
          setError('Deze pagina heeft nog geen inhoud');
          setLoading(false);
          return;
        }

        setPageData(data);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Fout bij laden van pagina');
        setLoading(false);
      }
    };

    loadPage();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Pagina laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  if (!pageData) {
    return null;
  }

  const renderContent = () => {
    if (!pageData.content_json && !pageData.body_html) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <p className="text-gray-600 text-lg">Geen content beschikbaar</p>
          </div>
        </div>
      );
    }

    let htmlContent = '';

    if (pageData.body_html) {
      htmlContent = pageData.body_html;
    } else if (pageData.content_json) {
      if (typeof pageData.content_json === 'string') {
        htmlContent = pageData.content_json;
      } else if (pageData.content_json.htmlSnapshot) {
        htmlContent = pageData.content_json.htmlSnapshot;
      } else if (pageData.content_json.layout?.html) {
        htmlContent = pageData.content_json.layout.html;
      } else if (pageData.content_json.html) {
        htmlContent = pageData.content_json.html;
      } else if (pageData.content_json.pages?.[0]?.html) {
        htmlContent = pageData.content_json.pages[0].html;
      }
    }

    if (!htmlContent) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <p className="text-gray-600 text-lg">Content kan niet weergegeven worden</p>
          </div>
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
        className="w-full h-screen border-0"
        style={{ display: 'block', width: '100vw', height: '100vh' }}
        title="Page Preview"
      />
    );
  };

  return renderContent();
}

export default PreviewPage;
