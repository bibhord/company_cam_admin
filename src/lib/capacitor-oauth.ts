import type { SupabaseClient } from '@supabase/supabase-js';

export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

interface SignInOptions {
  supabase: SupabaseClient;
  provider: 'google' | 'apple';
  webRedirectTo: string;
  capacitorBridgeUrl: string;
  queryParams?: Record<string, string>;
  onSuccess: () => void;
  onError: (message: string) => void;
  onFinally: () => void;
}

export async function signInWithOAuthProvider({
  supabase,
  provider,
  webRedirectTo,
  capacitorBridgeUrl,
  queryParams,
  onSuccess,
  onError,
  onFinally,
}: SignInOptions): Promise<void> {
  const native = isCapacitorNative();
  const redirectTo = native ? capacitorBridgeUrl : webRedirectTo;

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams,
      },
    });

    if (error) {
      onError(error.message);
      onFinally();
      return;
    }

    if (!data?.url) {
      onError('No OAuth URL returned.');
      onFinally();
      return;
    }

    if (!native) {
      window.location.assign(data.url);
      return;
    }

    const { Browser } = await import('@capacitor/browser');
    const { App } = await import('@capacitor/app');

    let handled = false;

    const urlListener = await App.addListener('appUrlOpen', async ({ url }) => {
      if (handled) return;
      handled = true;

      try { await Browser.close(); } catch {}
      urlListener.remove();

      const urlWithQuery = url.replace('#', '?');
      const urlObj = new URL(urlWithQuery);
      const code = urlObj.searchParams.get('code');
      const accessToken = urlObj.searchParams.get('access_token');
      const refreshToken = urlObj.searchParams.get('refresh_token');

      let authenticated = false;
      if (code) {
        const { error: err } = await supabase.auth.exchangeCodeForSession(code);
        if (!err) authenticated = true;
        else onError(`Auth error: ${err.message}`);
      } else if (accessToken && refreshToken) {
        const { error: err } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!err) authenticated = true;
        else onError(`Session error: ${err.message}`);
      } else {
        onError(`OAuth returned no code or token. URL: ${url.substring(0, 100)}`);
      }

      if (authenticated) {
        try { await fetch('/api/auth/ensure-profile', { method: 'POST' }); } catch {}
        onSuccess();
        return;
      }
      onFinally();
    });

    const browserListener = await Browser.addListener('browserFinished', async () => {
      await new Promise((r) => setTimeout(r, 1500));
      if (handled) return;
      handled = true;
      browserListener.remove();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) onSuccess();
      else onFinally();
    });

    await Browser.open({ url: data.url, presentationStyle: 'popover' });
  } catch {
    onError('Something went wrong. Please try again.');
    onFinally();
  }
}
