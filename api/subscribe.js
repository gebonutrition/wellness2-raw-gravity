export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, source } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    const apiKey = process.env.KLAVIYO_API_KEY;
    const listId = process.env.KLAVIYO_LIST_ID;

    if (!apiKey || !listId) {
      console.error('Missing Klaviyo environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const response = await fetch(
      'https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs',
      {
        method: 'POST',
        headers: {
          'Authorization': `Klaviyo-API-Key ${apiKey}`,
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json',
          'revision': '2026-07-15'
        },
        body: JSON.stringify({
          data: {
            type: 'profile-subscription-bulk-create-job',
            attributes: {
              profiles: {
                data: [
                  {
                    type: 'profile',
                    attributes: {
                      email,
                      subscriptions: {
                        email: {
                          marketing: {
                            consent: 'SUBSCRIBED'
                          }
                        }
                      }
                    }
                  }
                ]
              }
            },
            relationships: {
              list: {
                data: {
                  type: 'list',
                  id: listId
                }
              }
            }
          }
        })
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      console.error('Klaviyo error:', response.status, responseText);

      return res.status(500).json({
        error: 'Klaviyo request failed'
      });
    }

    return res.status(200).json({
      success: true,
      promoCode: 'RAWGRAV25',
      amazonUrl: process.env.AMAZON_URL || 'https://www.amazon.com/'
    });

  } catch (error) {
    console.error('Subscribe error:', error);

    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}