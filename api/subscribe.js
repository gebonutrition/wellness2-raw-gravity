export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { email, source, creative } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid email is required'
      });
    }

    const cleanEmail = email.trim();
    const cleanSource = String(source || 'unknown').trim();
    const cleanCreative = String(creative || 'unknown').trim();

    const apiKey = process.env.KLAVIYO_API_KEY;
    const listId = process.env.KLAVIYO_LIST_ID;

    if (!apiKey || !listId) {
      console.error('Missing Klaviyo environment variables');

      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    const headers = {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Revision: '2026-07-15'
    };

    /*
     * STEP 1
     * Create or update the Klaviyo profile with source + creative.
     */
    const profileResponse = await fetch(
      'https://a.klaviyo.com/api/profile-import',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          data: {
            type: 'profile',
            attributes: {
              email: cleanEmail,
              properties: {
                source: cleanSource,
                creative: cleanCreative
              }
            }
          }
        })
      }
    );

    const profileText = await profileResponse.text();

    if (!profileResponse.ok) {
      console.error(
        'Klaviyo profile error:',
        profileResponse.status,
        profileText
      );

      return res.status(502).json({
        success: false,
        error: 'Klaviyo profile update failed'
      });
    }

    /*
     * STEP 2
     * Subscribe the profile to the Klaviyo list.
     */
    const subscribeResponse = await fetch(
      'https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          data: {
            type: 'profile-subscription-bulk-create-job',
            attributes: {
              profiles: {
                data: [
                  {
                    type: 'profile',
                    attributes: {
                      email: cleanEmail,
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

    const subscribeText = await subscribeResponse.text();

    if (!subscribeResponse.ok) {
      console.error(
        'Klaviyo subscription error:',
        subscribeResponse.status,
        subscribeText
      );

      return res.status(502).json({
        success: false,
        error: 'Klaviyo subscription failed'
      });
    }

    /*
     * STEP 3
     * Choose Amazon attribution URL by traffic source.
     */
    const amazonUrls = {
      tiktok:
        'https://www.amazon.com/dp/B0GTWB11LW?maas=maas_adg_9EAB36473ED1EB5F2AC4DBD00BF649CE_afap_abs&ref_=aa_maas&tag=maas',

      meta:
        'https://www.amazon.com/dp/B0GTWB11LW?maas=maas_adg_B05D582BAB7E5BC8F40DEBA1EBC61AEE_afap_abs&ref_=aa_maas&tag=maas',

      klavio:
        'https://www.amazon.com/dp/B0GTWB11LW?maas=maas_adg_25B95FF8BD805EF1A9DF6465C32333F9_afap_abs&ref_=aa_maas&tag=maas',

      klaviyo:
        'https://www.amazon.com/dp/B0GTWB11LW?maas=maas_adg_25B95FF8BD805EF1A9DF6465C32333F9_afap_abs&ref_=aa_maas&tag=maas',

      instagram:
        'https://www.amazon.com/dp/B0GTWB11LW?maas=maas_adg_DA3922AD16009007A17A120E9C2F3E79_afap_abs&ref_=aa_maas&tag=maas'
    };

    const normalizedSource = cleanSource.toLowerCase();

    const amazonUrl =
      amazonUrls[normalizedSource] ||
      amazonUrls.meta;

    return res.status(200).json({
      success: true,
      amazonUrl
    });

  } catch (error) {
    console.error('Vercel API error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}