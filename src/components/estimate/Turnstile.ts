type TurnstileApi = {
  render: (element: HTMLElement, options: {
    sitekey: string;
    action: string;
    callback: (token: string) => void;
    'error-callback': () => void;
    'expired-callback': () => void;
  }) => string;
  remove: (id: string) => void;
};

type TurnstileWindow = Window & { turnstile?: TurnstileApi };
let loading: Promise<TurnstileApi> | undefined;

export function loadTurnstile() {
  const browser = window as TurnstileWindow;
  if (browser.turnstile) return Promise.resolve(browser.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    const fail = () => {
      clearTimeout(timer);
      script.remove();
      loading = undefined;
      reject(new Error('Verification could not load.'));
    };
    const timer = window.setTimeout(fail, 12_000);
    script.onload = () => {
      if (!browser.turnstile) { fail(); return; }
      clearTimeout(timer);
      resolve(browser.turnstile);
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return loading;
}
