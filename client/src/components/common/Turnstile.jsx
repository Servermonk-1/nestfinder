import { useEffect, useRef } from 'react';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

// Whether CAPTCHA is switched on. Forms import this to require a token only when
// a site key is configured — otherwise the whole feature is a no-op.
export const captchaEnabled = Boolean(SITE_KEY);

// Load Cloudflare's script once, and only when we actually have a key.
let scriptPromise = null;
function loadTurnstileScript() {
	if (window.turnstile) return Promise.resolve();
	if (scriptPromise) return scriptPromise;
	scriptPromise = new Promise((resolve, reject) => {
		const s = document.createElement('script');
		s.src = SCRIPT_SRC;
		s.async = true;
		s.defer = true;
		s.onload = resolve;
		s.onerror = reject;
		document.head.appendChild(s);
	});
	return scriptPromise;
}

/**
 * Cloudflare Turnstile widget. Renders nothing until VITE_TURNSTILE_SITE_KEY is
 * set, so the app behaves exactly as before until keys are added. Calls
 * onVerify(token) when solved and onVerify('') when the token expires/errors.
 */
export default function Turnstile({ onVerify }) {
	const boxRef = useRef(null);
	const widgetId = useRef(null);

	useEffect(() => {
		if (!SITE_KEY) return;
		let cancelled = false;

		loadTurnstileScript()
			.then(() => {
				if (cancelled || !boxRef.current || !window.turnstile) return;
				widgetId.current = window.turnstile.render(boxRef.current, {
					sitekey: SITE_KEY,
					callback: (token) => onVerify?.(token),
					'expired-callback': () => onVerify?.(''),
					'error-callback': () => onVerify?.(''),
				});
			})
			.catch(() => { /* script blocked — leave the form usable */ });

		return () => {
			cancelled = true;
			if (widgetId.current && window.turnstile) {
				try { window.turnstile.remove(widgetId.current); } catch { /* ignore */ }
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	if (!SITE_KEY) return null;
	return <div ref={boxRef} className="flex justify-center" />;
}
