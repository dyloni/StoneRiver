# Push Notifications Setup

Push notifications have been implemented in the Stone River Portal. To complete the setup, you need to configure the VAPID private key.

## Configuration Required

### 1. Set the VAPID Private Key Secret

The edge function `send-push-notification` requires the `VAPID_PRIVATE_KEY` secret to be configured.

**Generated Private Key:**
```
G4dN6uHpT6tjcUBEFNEO22Tcw4oK9SIDo-BpTt0MDZw
```

**To configure this secret:**

1. Go to your Supabase Dashboard
2. Navigate to: Project Settings → Edge Functions → Secrets
3. Add a new secret:
   - **Name:** `VAPID_PRIVATE_KEY`
   - **Value:** `G4dN6uHpT6tjcUBEFNEO22Tcw4oK9SIDo-BpTt0MDZw`
4. Save the secret

### 2. Public Key (Already Configured)

The public VAPID key is already configured in the frontend code:
```
BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SklnwxNZDDRxQYHRhMiXFiMJNnY8pVL0MBnX8Xc5TsOmGr3xvHFLRLQ
```

**Note:** If you want to use the newly generated keys instead, update the public key in:
- `utils/pushNotifications.ts` (line 3)
- `supabase/functions/send-push-notification/index.ts` (line 120)

Use the newly generated public key:
```
BHjOh1JeDGfxkWG5a96U-cFUDtBjx-wCpAUGRDyOjJI3NpOIhTbodjqU8awbgTwl-ZHuqb_Cu94EbXiSWXHA_jY
```

## Features Implemented

### 1. User Notification Subscription
- Users can enable/disable notifications from their Profile page
- Auto-prompt appears 3 seconds after login for first-time users
- Subscriptions are stored in the `push_subscriptions` database table

### 2. Service Worker
- Handles push notification display
- Click handlers to navigate to relevant pages
- Automatic cleanup of invalid subscriptions

### 3. Notification Sending
- Edge function: `send-push-notification`
- Automatically removes expired/invalid subscriptions
- Supports targeting by user ID and type (agent/admin)

## Usage Example

To send a push notification to a user, call the edge function:

```javascript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/send-push-notification`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      userId: 1,
      userType: 'agent',
      title: 'New Message',
      body: 'You have a new message from Admin',
      url: '/messages',
      tag: 'message-notification'
    })
  }
);
```

## Testing

1. Enable notifications in the Profile page
2. The system will show a test notification when you enable them
3. To test programmatically, call the edge function as shown above

## Browser Support

Push notifications work in:
- Chrome/Edge (Desktop & Mobile)
- Firefox (Desktop & Mobile)
- Safari 16+ (Desktop & Mobile)
- Opera (Desktop & Mobile)

**Note:** Notifications require HTTPS in production. They work on localhost for development.

## Troubleshooting

1. **No prompt appears:** Check browser notification settings
2. **Notifications blocked:** User must enable them in browser settings
3. **Push not received:** Verify the VAPID_PRIVATE_KEY secret is configured correctly
4. **Invalid subscription errors:** These are automatically cleaned up by the edge function
