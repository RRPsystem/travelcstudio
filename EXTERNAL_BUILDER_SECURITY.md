# External Builder Security - One-Time Token System

## 🔒 Security Overview

The external builder integration uses a **one-time token system** to prevent URL sharing and unauthorized access.

### How It Works

1. **Initial URL Token** - Can only be used ONCE to establish a session
2. **Session Token** - Used for all subsequent API calls during the editing session
3. **Session Expiry** - Sessions expire after 2 hours of inactivity

## 🔄 Token Flow

```
User clicks "Edit Page"
    ↓
System generates initial JWT with session_id
    ↓
URL contains one-time token
    ↓
Builder loads → Exchange endpoint called
    ↓
Initial token consumed → New session token returned
    ↓
All API calls use session token
    ↓
Session expires after 2 hours
```

## 📡 API Integration

### 1. Exchange Initial Token

When the external builder receives a URL with a token, it must immediately exchange it for a session token:

**Endpoint:** `POST /functions/v1/exchange-builder-token`

**Headers:**
```json
{
  "Authorization": "Bearer <initial_token_from_url>",
  "Content-Type": "application/json",
  "Apikey": "<supabase_anon_key>"
}
```

**Response (Success):**
```json
{
  "success": true,
  "brand_id": "uuid",
  "user_id": "uuid",
  "session_id": "uuid",
  "session_token": "new_jwt_token_here",
  "message": "Initial token consumed. Use session_token for subsequent requests."
}
```

**Response (Already Used):**
```json
{
  "error": "🔒 This URL has already been used and is no longer valid. Please request a new editor link.",
  "code": "Initial token already used. URL can only be used once."
}
```

**Status Codes:**
- `200` - Success, token exchanged
- `403` - Token already used (URL was shared/reused)
- `401` - Session expired
- `404` - Session not found
- `400` - Invalid request

### 2. Use Session Token for API Calls

After exchanging the initial token, use the `session_token` for all subsequent API calls:

**Example (Pages API):**
```javascript
fetch('https://your-project.supabase.co/functions/v1/pages-api', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sessionToken}`,  // Use session token!
    'Content-Type': 'application/json',
    'Apikey': apiKey
  },
  body: JSON.stringify({
    action: 'save',
    page_id: 'uuid',
    html: '<html>...</html>'
  })
});
```

## 🛠️ Implementation Example

```javascript
class BuilderClient {
  constructor() {
    this.sessionToken = null;
    this.initialized = false;
  }

  async initialize(urlParams) {
    if (this.initialized) return;

    const initialToken = urlParams.get('token');
    const apiUrl = urlParams.get('api');
    const apiKey = urlParams.get('apikey');

    try {
      // Exchange one-time token for session token
      const response = await fetch(`${apiUrl}/exchange-builder-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${initialToken}`,
          'Content-Type': 'application/json',
          'Apikey': apiKey
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Token exchange failed');
      }

      const data = await response.json();
      this.sessionToken = data.session_token;
      this.brandId = data.brand_id;
      this.sessionId = data.session_id;
      this.initialized = true;

      console.log('✅ Session established:', this.sessionId);

      // Store session token in memory or sessionStorage
      // DO NOT store in localStorage (survives browser close)
      sessionStorage.setItem('builder_session_token', this.sessionToken);

    } catch (error) {
      console.error('❌ Token exchange failed:', error);

      // Show user-friendly error
      if (error.message.includes('already been used')) {
        alert('🔒 This editor link has already been used. Please request a new link from your dashboard.');
      } else if (error.message.includes('expired')) {
        alert('⏱️ This editor link has expired. Please request a new link from your dashboard.');
      } else {
        alert('❌ Failed to initialize editor. Please try again or request a new link.');
      }

      // Redirect back or close window
      window.close();
    }
  }

  async savePage(pageId, html) {
    if (!this.sessionToken) {
      throw new Error('Not initialized');
    }

    const response = await fetch(`${this.apiUrl}/pages-api`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.sessionToken}`,
        'Content-Type': 'application/json',
        'Apikey': this.apiKey
      },
      body: JSON.stringify({
        action: 'save',
        page_id: pageId,
        html: html
      })
    });

    return response.json();
  }
}

// Usage
const builder = new BuilderClient();
const urlParams = new URLSearchParams(window.location.search);
await builder.initialize(urlParams);
```

## 🔐 Security Benefits

1. **URL Sharing Prevention** - URLs can only be used once
2. **Session Tracking** - All sessions are tracked in database
3. **Expiry Management** - Sessions automatically expire
4. **Activity Monitoring** - Last activity tracked per session
5. **Revocation Support** - Sessions can be invalidated server-side

## 📊 Session Management

### Database Table: `builder_sessions`

Track all active builder sessions:

```sql
SELECT
  id,
  brand_id,
  user_id,
  page_id,
  initial_token_used,
  expires_at,
  last_activity_at
FROM builder_sessions
WHERE expires_at > now()
ORDER BY last_activity_at DESC;
```

### Clean Up Expired Sessions

```sql
SELECT cleanup_expired_builder_sessions();
```

## ⚠️ Important Notes

1. **One-Time Use** - Initial URL token can only be used once
2. **Session Storage** - Store session token in `sessionStorage`, not `localStorage`
3. **Error Handling** - Show user-friendly messages for token errors
4. **Token Expiry** - Sessions expire after 2 hours
5. **No Caching** - Don't cache initial tokens
6. **HTTPS Only** - Always use HTTPS for token transmission

## 🚨 Error Handling

```javascript
async function handleTokenError(error) {
  const errorMessages = {
    'already used': '🔒 This link has been used. Request a new editor link.',
    'expired': '⏱️ Session expired. Request a new editor link.',
    'not found': '❌ Session invalid. Request a new editor link.',
    'unauthorized': '🔑 Authentication failed. Please log in again.'
  };

  for (const [key, message] of Object.entries(errorMessages)) {
    if (error.message.toLowerCase().includes(key)) {
      alert(message);
      return;
    }
  }

  alert('❌ An error occurred. Please try again or request a new editor link.');
}
```

## 📝 Testing

### Test One-Time Token

1. Open editor URL in browser
2. Copy URL and try to open in another tab
3. Second tab should show "already used" error
4. Verify first tab continues working with session token

### Test Session Expiry

1. Wait 2 hours after opening editor
2. Try to save changes
3. Should get expiry error
4. Request new editor link

## 🔄 Migration from Old System

If you're updating from the old unlimited-use tokens:

1. Update builder to call `exchange-builder-token` on load
2. Store returned `session_token` in sessionStorage
3. Use `session_token` for all API calls
4. Remove any localStorage token caching
5. Test token exchange and error handling

## 📞 Support

For implementation questions or issues:
- Check logs in Supabase Edge Functions
- Verify JWT_SECRET is configured
- Ensure CORS headers are correct
- Test with Postman/curl first
