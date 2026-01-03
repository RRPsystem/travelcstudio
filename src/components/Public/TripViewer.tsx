import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TripViewerProps {
  shareToken: string;
}

function generateTripHTML(travelTrip: any): string {
  const itinerary = travelTrip.metadata?.itinerary || [];
  const tripName = travelTrip.name || 'Jouw Reis';

  let html = `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${tripName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 60px 40px;
      text-align: center;
    }
    .header h1 {
      font-size: 3em;
      font-weight: 700;
      margin-bottom: 10px;
      text-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }
    .header p {
      font-size: 1.2em;
      opacity: 0.95;
    }
    .content {
      padding: 40px;
    }
    .day-card {
      background: #f9fafb;
      border-radius: 15px;
      padding: 30px;
      margin-bottom: 30px;
      border-left: 5px solid #667eea;
      transition: transform 0.3s, box-shadow 0.3s;
    }
    .day-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    .day-header {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
    }
    .day-number {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5em;
      font-weight: bold;
      margin-right: 20px;
      flex-shrink: 0;
    }
    .day-info h2 {
      font-size: 1.8em;
      color: #1f2937;
      margin-bottom: 5px;
    }
    .day-date {
      color: #6b7280;
      font-size: 1.1em;
    }
    .hotel-info {
      background: white;
      border-radius: 10px;
      padding: 20px;
      margin: 20px 0;
    }
    .hotel-name {
      font-size: 1.3em;
      font-weight: 600;
      color: #111827;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
    }
    .hotel-name::before {
      content: "🏨";
      margin-right: 10px;
      font-size: 1.2em;
    }
    .amenities {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 10px;
    }
    .amenity {
      background: #e0e7ff;
      color: #4f46e5;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.9em;
      font-weight: 500;
    }
    .activities {
      margin-top: 20px;
    }
    .activities h3 {
      font-size: 1.2em;
      color: #374151;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
    }
    .activities h3::before {
      content: "🎯";
      margin-right: 10px;
    }
    .activity-list {
      display: grid;
      gap: 10px;
    }
    .activity-item {
      background: #f3f4f6;
      padding: 12px 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
    }
    .activity-item::before {
      content: "✓";
      color: #10b981;
      font-weight: bold;
      margin-right: 10px;
      font-size: 1.2em;
    }
    .footer {
      background: #f9fafb;
      padding: 30px;
      text-align: center;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    @media (max-width: 768px) {
      body { padding: 10px; }
      .header { padding: 40px 20px; }
      .header h1 { font-size: 2em; }
      .content { padding: 20px; }
      .day-card { padding: 20px; }
      .day-number { width: 50px; height: 50px; font-size: 1.2em; }
      .day-info h2 { font-size: 1.4em; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${tripName}</h1>
      <p>${itinerary.length} dagen vol avontuur</p>
    </div>
    <div class="content">
`;

  itinerary.forEach((day: any) => {
    html += `
      <div class="day-card">
        <div class="day-header">
          <div class="day-number">${day.day}</div>
          <div class="day-info">
            <h2>${day.location}</h2>
            <div class="day-date">${day.date}</div>
          </div>
        </div>

        ${day.hotel?.name ? `
        <div class="hotel-info">
          <div class="hotel-name">${day.hotel.name}</div>
          ${day.hotel.amenities && day.hotel.amenities.length > 0 ? `
          <div class="amenities">
            ${day.hotel.amenities.map((a: string) => `<span class="amenity">${a}</span>`).join('')}
          </div>
          ` : ''}
        </div>
        ` : ''}

        ${day.activities && day.activities.length > 0 ? `
        <div class="activities">
          <h3>Activiteiten</h3>
          <div class="activity-list">
            ${day.activities.map((activity: string) => `
            <div class="activity-item">${activity}</div>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>
    `;
  });

  html += `
    </div>
    <div class="footer">
      <p>Geniet van je reis! 🌍✈️</p>
    </div>
  </div>
</body>
</html>
  `;

  return html;
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
          .select('body_html')
          .eq('id', trip.page_id)
          .maybeSingle();

        if (!pageError && page?.body_html) {
          html = page.body_html;
        }
      }

      // Third try: Check if this is a TravelBRO trip (travel_trips table)
      if (!html) {
        const { data: travelTrip, error: travelTripError } = await supabase
          .from('travel_trips')
          .select('id, name, metadata, parsed_data')
          .eq('share_token', shareToken)
          .maybeSingle();

        if (!travelTripError && travelTrip?.metadata?.itinerary) {
          html = generateTripHTML(travelTrip);
        }
      }

      // If still no HTML content, show error
      if (!html) {
        setError('Deze reis is aangemaakt maar heeft nog geen inhoud. De reisorganisatie moet de reis eerst afmaken via de builder.');
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
