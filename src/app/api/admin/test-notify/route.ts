import { NextResponse } from 'next/server';
import { notifyNewSignup } from '@/lib/notify-signup';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('secret') !== process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-8)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const email = searchParams.get('email') || 'extradhungel6+604@gmail.com';
  const name = searchParams.get('name') || 'demo dhungel';
  await notifyNewSignup(email, name);
  return NextResponse.json({ ok: true, sent_to: 'hello@captureyourwork.com', for: email });
}
