export async function sendPush(
  subscriptionIds: string[],
  title: string,
  body: string,
  url?: string,
): Promise<void> {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey || subscriptionIds.length === 0) return;

  await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${apiKey}`,
    },
    body: JSON.stringify({
      app_id: appId,
      include_player_ids: subscriptionIds,
      headings: { en: title },
      contents: { en: body },
      ...(url ? { url } : {}),
    }),
  }).catch(console.error);
}
