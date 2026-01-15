import type { VercelRequest, VercelResponse } from '@vercel/node';

interface RequestBody {
  domain: string;
  websiteId: string;
  type: 'preview' | 'live';
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { domain, websiteId, type } = req.body as RequestBody;

    if (!domain || !websiteId || !type) {
      return res.status(400).json({
        error: 'Missing required fields: domain, websiteId, type'
      });
    }

    const vercelToken = process.env.VERCEL_TOKEN;
    const vercelProjectId = process.env.VERCEL_PROJECT_ID || 'website-builder';

    if (!vercelToken) {
      return res.status(500).json({
        error: 'VERCEL_TOKEN not configured'
      });
    }

    const vercelApiUrl = `https://api.vercel.com/v9/projects/${vercelProjectId}/domains`;

    const response = await fetch(vercelApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: domain,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Vercel API error:', errorData);

      if (response.status === 409) {
        return res.json({
          success: true,
          domain,
          type,
          message: 'Domain already configured',
          alreadyExists: true
        });
      }

      return res.status(response.status).json({
        error: 'Failed to add domain to Vercel',
        details: errorData
      });
    }

    const data = await response.json();

    return res.json({
      success: true,
      domain,
      type,
      message: 'Domain successfully configured',
      vercelData: data
    });

  } catch (error) {
    console.error('Error adding domain:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
