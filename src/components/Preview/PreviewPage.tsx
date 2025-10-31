import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface PageData {
  title: string;
  content_json: any;
  body_html?: string;
  status: string;
}

interface PreviewPageProps {
  pageId?: string;
}

export function PreviewPage({ pageId: propPageId }: PreviewPageProps = {}) {
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadPage = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const brandId = params.get('brand_id');
        const slug = params.get('slug');
        const pageId = propPageId || params.get('page_id');

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
  }, [propPageId]);

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

    let cleanHtml = htmlContent
      .replace(/\sclass="component-toolbar"[^>]*>[\s\S]*?<\/div>/g, '')
      .replace(/\sclass="wb-type-badge"[^>]*>[\s\S]*?<\/div>/g, '')
      .replace(/\sdraggable="true"/g, '')
      .replace(/\scontenteditable="true"/g, '')
      .replace(/\sdata-action="[^"]*"/g, '')
      .replace(/\sdata-component-id="[^"]*"/g, '')
      .replace(/\sdata-wb-[^=]*="[^"]*"/g, '')
      .replace(/<button[^>]*class="[^"]*toolbar-btn[^"]*"[^>]*>[\s\S]*?<\/button>/g, '')
      .replace(/<button[^>]*data-tag-del[^>]*>[\s\S]*?<\/button>/g, '');

    if (!cleanHtml.includes('<html') && !cleanHtml.includes('<!DOCTYPE')) {
      cleanHtml = cleanHtml;
    } else {
      const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*)<\/body>/);
      if (bodyMatch) {
        cleanHtml = bodyMatch[1];
      }
    }

    return (
      <iframe
        srcDoc={`
          <!DOCTYPE html>
          <html lang="nl">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${pageData.title || 'Preview'}</title>
              <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
              <link rel="preconnect" href="https://fonts.googleapis.com">
              <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
              <link rel="stylesheet" href="${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/assets/styles/main.css">
              <link rel="stylesheet" href="${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/assets/styles/components.css">
              <style>
                *, *::before, *::after {
                  box-sizing: border-box;
                  margin: 0;
                  padding: 0;
                }

                /* Override: Ensure proper stacking of top-level elements */
                body > * {
                  position: relative !important;
                  display: block !important;
                  width: 100% !important;
                }

                /* Hero sections can use their own positioning */
                body > .wb-hero-page,
                body > .wb-component.wb-hero-page {
                  position: relative !important;
                  display: flex !important;
                }

                /* Headers and navs should be on top */
                body > header,
                body > nav,
                body > .wb-header,
                body > .wb-nav {
                  position: relative !important;
                  z-index: 1000 !important;
                }

                html {
                  scroll-behavior: smooth;
                  -webkit-font-smoothing: antialiased;
                  -moz-osx-font-smoothing: grayscale;
                }

                body {
                  margin: 0;
                  padding: 0;
                  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  line-height: 1.6;
                  color: #1f2937;
                  background: #ffffff;
                  min-height: 100vh;
                  overflow-x: hidden;
                  display: flex;
                  flex-direction: column;
                }

                /* Container and layout */
                .wb-container,
                body > .wb-component:not(.wb-hero-page):not(.wb-media-row):not([class*="full-width"]) {
                  max-width: 1200px;
                  margin-left: auto;
                  margin-right: auto;
                  padding-left: 1rem;
                  padding-right: 1rem;
                }

                /* Hero sections should be full width */
                body > .wb-hero-page,
                body > .wb-component.wb-hero-page,
                .wb-hero-page.edge-to-edge {
                  max-width: 100%;
                  width: 100%;
                  margin-left: 0;
                  margin-right: 0;
                }

                .wb-component {
                  position: relative;
                  display: block;
                  clear: both;
                }

                /* Ensure components stack vertically - but not hero children */
                body > *:not(.wb-hero-page) {
                  position: relative;
                  display: block;
                  width: 100%;
                }

                /* Hero Page Styles */
                .wb-hero-page {
                  position: relative;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  overflow: hidden;
                  min-height: 500px;
                  width: 100%;
                }

                /* Allow absolute positioning inside hero */
                .wb-hero-page > * {
                  position: absolute;
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

                .hp-content,
                .hp-word {
                  position: absolute;
                  z-index: 3;
                  font-weight: 900;
                  text-transform: uppercase;
                  pointer-events: none;
                  user-select: none;
                  letter-spacing: -0.02em;
                  color: white;
                  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                }

                /* Hero forms and interactive elements */
                .wb-hero-page form,
                .wb-hero-page .hp-form,
                .wb-hero-page [class*="form"],
                .wb-hero-page [class*="search"] {
                  position: absolute;
                  z-index: 10;
                  pointer-events: auto;
                }

                .wb-hero-page input,
                .wb-hero-page button,
                .wb-hero-page select {
                  pointer-events: auto;
                }

                /* Media Row Styles */
                .wb-media-row {
                  padding: 40px 0;
                }

                .mr-track {
                  display: grid;
                  grid-auto-flow: column;
                  gap: 1rem;
                  overflow-x: auto;
                  scroll-behavior: smooth;
                  -webkit-overflow-scrolling: touch;
                  scrollbar-width: thin;
                  scrollbar-color: rgba(0,0,0,0.2) transparent;
                  padding: 0 1rem;
                }

                .mr-track::-webkit-scrollbar {
                  height: 8px;
                }

                .mr-track::-webkit-scrollbar-track {
                  background: transparent;
                }

                .mr-track::-webkit-scrollbar-thumb {
                  background-color: rgba(0,0,0,0.2);
                  border-radius: 4px;
                }

                .mr-track.shadow-on .mr-item {
                  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
                }

                .mr-item {
                  position: relative;
                  overflow: hidden;
                  border-radius: var(--mr-item-radius, 12px);
                  height: var(--mr-item-height, 250px);
                  scroll-snap-align: start;
                  transition: transform 0.2s ease;
                }

                .mr-item:hover {
                  transform: scale(1.02);
                }

                .mr-item img {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                }

                /* Typography */
                h1, h2, h3, h4, h5, h6 {
                  font-weight: 700;
                  line-height: 1.2;
                  margin-bottom: 1rem;
                  color: #111827;
                }

                h1 { font-size: 2.5rem; }
                h2 { font-size: 2rem; }
                h3 { font-size: 1.75rem; }
                h4 { font-size: 1.5rem; }
                h5 { font-size: 1.25rem; }
                h6 { font-size: 1rem; }

                p {
                  margin-bottom: 1rem;
                  color: #4b5563;
                }

                /* Images */
                img {
                  max-width: 100%;
                  height: auto;
                  display: block;
                }

                /* Links */
                a {
                  color: #2563eb;
                  text-decoration: none;
                  transition: color 0.2s ease;
                }

                a:hover {
                  color: #1d4ed8;
                  text-decoration: underline;
                }

                /* Buttons */
                button, .btn {
                  padding: 0.75rem 1.5rem;
                  font-size: 1rem;
                  font-weight: 600;
                  border-radius: 0.5rem;
                  border: none;
                  cursor: pointer;
                  transition: all 0.2s ease;
                  display: inline-block;
                }

                button:hover, .btn:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }

                /* Sections spacing */
                section, .section {
                  padding: 3rem 0;
                }

                /* Responsive */
                @media (max-width: 768px) {
                  h1 { font-size: 2rem; }
                  h2 { font-size: 1.75rem; }
                  h3 { font-size: 1.5rem; }

                  .wb-container {
                    padding-left: 1rem;
                    padding-right: 1rem;
                  }

                  .mr-item {
                    height: 200px;
                  }
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
