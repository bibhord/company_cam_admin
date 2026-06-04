/**
 * Send a notification email to hello@captureyourwork.com when a new user signs up.
 * Users are auto-approved — this is an FYI ping, not an approval request.
 */
export async function notifyNewSignup(userEmail: string, displayName: string) {
  const to = 'hello@captureyourwork.com';
  const subject = `New CaptureYourWork signup: ${displayName}`;
  const body = `A new user just signed up for CaptureYourWork.

Name: ${displayName}
Email: ${userEmail}
Signed up: ${new Date().toISOString()}

The account was auto-approved. You can review or suspend it from the superadmin panel:
https://app.captureyourwork.com/superadmin/orgs`;

  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'CaptureYourWork <noreply@mail.captureyourwork.com>',
          to,
          subject,
          text: body,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error('[notifyNewSignup] Resend rejected:', res.status, err);
      }
      return;
    }

    console.log(`[SIGNUP NOTIFICATION] To: ${to} | Subject: ${subject}\n${body}`);
  } catch (err) {
    console.error('Failed to send signup notification:', err);
  }
}
