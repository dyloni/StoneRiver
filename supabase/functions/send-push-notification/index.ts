import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PushNotificationPayload {
  userId: number;
  userType: 'agent' | 'admin';
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  requireInteraction?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const payload: PushNotificationPayload = await req.json();
    const { userId, userType, title, body, icon, badge, tag, url, requireInteraction } = payload;

    if (!userId || !userType || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const subscriptionsResponse = await fetch(
      `${supabaseUrl}/rest/v1/push_subscriptions?user_id=eq.${userId}&user_type=eq.${userType}`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!subscriptionsResponse.ok) {
      throw new Error('Failed to fetch subscriptions');
    }

    const subscriptions = await subscriptionsResponse.json();

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions found for user' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const notificationData = {
      title,
      body,
      icon: icon || '/icon-192x192.png',
      badge: badge || '/badge-72x72.png',
      tag: tag || 'stone-river-notification',
      data: { url: url || '/' },
      requireInteraction: requireInteraction || false,
      vibrate: [200, 100, 200]
    };

    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ||
      'MIHcAgEBBEIBpKLlzPi4qmQdOEW9KBzEqGNPyHxRs_Tf2dEBwpX6lQvqRD0LjLHmP3s8Zz7xLKg5xPpvJkQJdUi7XKX3C0TsKzOgBwYFK4EEACOhgYkDgYYABAEl62iUYgUivxIkv69yViEuiBIa-Ib9-SklnwxNZDDRxQYHRhMiXFiMJNnY8pVL0MBnX8Xc5TsOmGr3xvHFLRLQ';

    const results = await Promise.allSettled(
      subscriptions.map(async (sub: any) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh_key,
            auth: sub.auth_key,
          },
        };

        try {
          const webpush = await import('npm:web-push@3.6.6');

          webpush.setVapidDetails(
            'mailto:support@stoneriver.com',
            'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SklnwxNZDDRxQYHRhMiXFiMJNnY8pVL0MBnX8Xc5TsOmGr3xvHFLRLQ',
            vapidPrivateKey
          );

          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(notificationData)
          );

          return { success: true, endpoint: sub.endpoint };
        } catch (error: any) {
          console.error('Failed to send notification:', error);

          if (error.statusCode === 410 || error.statusCode === 404) {
            await fetch(
              `${supabaseUrl}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`,
              {
                method: 'DELETE',
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                },
              }
            );
          }

          return { success: false, endpoint: sub.endpoint, error: error.message };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    return new Response(
      JSON.stringify({
        message: 'Notifications sent',
        successful,
        failed,
        total: results.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});