/**
 * Send a notification email to hello@captureyourwork.com when a new user signs up.
 * Uses Supabase edge function or a simple fetch to an email API.
 * For now, we use a lightweight approach: Supabase's built-in email via service role.
 */
export async function notifyNewSignup(userEmail: string, displayName: string) {
  const to = 'hello@captureyourwork.com';
  const subject = `New CaptureYourWork signup: ${displayName}`;
  const body = `A new user has signed up and is pending approval.\n\nName: ${displayName}\nEmail: ${userEmail}\n\nLog in to the admin dashboard to approve or reject this user:\nhttps://app.captureyourwork.com/admin/users`;

  // Use Resend, SendGrid, or any transactional email service.
  // For now, try the Supabase Edge Function or a simple SMTP relay.
  // Fallback: use fetch to a simple email endpoint.
  try {
    // If RESEND_API_KEY is set, use Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'CaptureYourWork <noreply@captureyourwork.com>',
          to,
          subject,
          text: body,
        }),
      });
      return;
    }

    // Fallback: log to console so admin can see in Vercel logs
    console.log(`[SIGNUP NOTIFICATION] To: ${to} | Subject: ${subject}\n${body}`);
  } catch (err) {
    console.error('Failed to send signup notification:', err);
  }
}
