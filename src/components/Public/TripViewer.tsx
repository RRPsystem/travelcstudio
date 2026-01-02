import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TripViewerProps {
  shareToken: string;
}

export function TripViewer({ shareToken }: TripViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);

  useEffect(() => {
    loadTrip();
  }, [shareToken]);

  const loadTrip = async (enteredPassword?: string) => {
    setLoading(true);
    setError(null);
    setPasswordError(false);

    try {
      let trip = null;
      let fetchError = null;

      // Check if shareToken is a UUID (trips.id) or a share_token
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shareToken);

      if (isUUID) {
        // Try to find by trips.id first
        const result = await supabase
          .from('trips')
          .select('id, title, content, share_settings, page_id')
          .eq('id', shareToken)
          .maybeSingle();

        trip = result.data;
        fetchError = result.error;
      }

      // If not found by ID, or not a UUID, try by share_token
      if (!trip && !fetchError) {
        const result = await supabase
          .from('trips')
          .select('id, title, content, share_settings, page_id')
          .eq('share_token', shareToken)
          .maybeSingle();

        trip = result.data;
        fetchError = result.error;
      }

      if (fetchError) throw fetchError;
      if (!trip) {
        setError('Deze reis is niet (meer) beschikbaar');
        setLoading(false);
        return;
      }

      // Check password protection
      if (trip.share_settings?.password_protected) {
        if (!enteredPassword) {
          setPasswordRequired(true);
          setLoading(false);
          return;
        }
        if (trip.share_settings.password !== enteredPassword) {
          setPasswordError(true);
          setLoading(false);
          return;
        }
      }

      let html: string | null = null;

      // First try: Check if we have HTML content from direct upload/edit
      if (trip.content?.html) {
        html = trip.content.html;
      }
      // Second try: If trip has a page_id, fetch the page HTML (from external builder)
      else if (trip.page_id) {
        const { data: page, error: pageError } = await supabase
          .from('pages')
          .select('html')
          .eq('id', trip.page_id)
          .maybeSingle();

        if (!pageError && page?.html) {
          html = page.html;
        }
      }

      // If still no HTML content, show error
      if (!html) {
        setError('Deze reis heeft nog geen inhoud');
        setLoading(false);
        return;
      }

      // Update view count (fire and forget - no await needed)
      supabase.rpc('increment_trip_views', { trip_token: shareToken });

      // Set HTML content to be rendered in iframe
      setHtmlContent(html);
      setLoading(false);

    } catch (err: any) {
      console.error('Error loading trip:', err);
      setError(err.message || 'Fout bij laden van reis');
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTrip(password);
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        margin: 0,
        padding: 0
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            border: '4px solid #ea580c',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ color: '#4b5563' }}>Reis laden...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        margin: 0,
        padding: 0
      }}>
        <div style={{ textAlign: 'center', maxWidth: '28rem', padding: '24px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#fee2e2',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <span style={{ fontSize: '32px' }}>❌</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
            Niet gevonden
          </h1>
          <p style={{ color: '#4b5563' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (passwordRequired) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        margin: 0,
        padding: 0
      }}>
        <div style={{ maxWidth: '28rem', width: '100%', padding: '24px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '32px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#fed7aa',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Lock style={{ width: '32px', height: '32px', color: '#ea580c' }} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '8px', textAlign: 'center' }}>
              Beveiligde Reis
            </h1>
            <p style={{ color: '#4b5563', textAlign: 'center', marginBottom: '24px' }}>
              Deze reis is beveiligd met een wachtwoord
            </p>

            <form onSubmit={handlePasswordSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Wachtwoord
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: passwordError ? '1px solid #fca5a5' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                  placeholder="Voer wachtwoord in"
                  autoFocus
                />
                {passwordError && (
                  <p style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px' }}>
                    Onjuist wachtwoord
                  </p>
                )}
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  backgroundColor: '#ea580c',
                  color: 'white',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Openen
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Render trip in fullscreen iframe using srcdoc (no document.write!)
  if (htmlContent) {
    return (
      <iframe
        title="Trip Viewer"
        srcDoc={htmlContent}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          margin: 0,
          padding: 0
        }}
      />
    );
  }

  return null;
}
