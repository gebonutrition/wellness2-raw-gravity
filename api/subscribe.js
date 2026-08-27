export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, source } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    const response = await fetch(
      'https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/',
      {
        method: 'POST',
        headers: {
          'Authorization': `Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`,
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
                  id: 'RiQaUD'
                }
              }
            }
          }
        })
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      console.error('Klaviyo error:', responseText);
			const profileResponse = await fetch(
	  'https://a.klaviyo.com/api/profile-import/',
	  {
		method: 'POST',
		headers: {
		  'Authorization': `Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`,
		  'Content-Type': 'application/vnd.api+json',
		  'Accept': 'application/vnd.api+json',
		  'revision': '2026-07-15'
		},
		body: JSON.stringify({
		  data: {
			type: 'profile',
			attributes: {
			  email,
			  properties: {
				source: source || 'direct'
			  }
			}
		  }
		})
	  }
	);

	if (!profileResponse.ok) {
	  const profileError = await profileResponse.text();
	  console.error('Klaviyo profile update error:', profileError);

	  return res.status(500).json({
		error: 'Profile update failed'
	  });
	}
      return res.status(response.status).json({
        error: 'Klaviyo request failed'
      });
    }

    return res.status(200).json({
      success: true
    });
  } catch (error) {
    console.error('Subscribe error:', error);

    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}