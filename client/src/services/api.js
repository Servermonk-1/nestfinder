import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
	baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
	// The session JWT lives in an httpOnly cookie the browser attaches
	// automatically — it is deliberately NOT readable by JS (so XSS can't steal it).
	withCredentials: true,
});

// The app registers a handler (see AuthBridge) so a session-expiry can log the
// user out and navigate WITHIN React Router — no jarring full-page reload.
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

// Send an expired session to the login screen that matches its role — a landlord
// shouldn't land on the student sign-in. Exported for unit testing.
export const loginPathForRole = (role) =>
	role === 'landlord' ? '/landlord/login'
		: role === 'admin' ? '/admin/login'
			: '/student/login';

// A request that never got a response means the network or server is down.
// Surface it once (throttled) instead of failing silently — several widgets can
// fail at the same moment and shouldn't stack toasts.
let lastNetworkToast = 0;
const notifyNetworkError = () => {
	const now = Date.now();
	if (now - lastNetworkToast < 8000) return;
	lastNetworkToast = now;
	toast.error(
		navigator.onLine === false
			? "You're offline — check your connection."
			: "Can't reach NestFinder right now. Please try again.",
		{ id: 'network-error' }
	);
};

// Auto-handle 401s from an authenticated session (token expired/invalid).
api.interceptors.response.use(
	(res) => res,
	(err) => {
		// No response at all → network/server unreachable (not an auth problem).
		if (!err.response && err.code !== 'ERR_CANCELED') {
			notifyNetworkError();
			return Promise.reject(err);
		}
		// Only treat this as a session-expiry if we thought we were signed in.
		// The token itself is an httpOnly cookie we can't read, so the cached
		// user object is our signal. A 401 from a login attempt (wrong password)
		// has no cached user, so it surfaces its own error instead of redirecting.
		const cachedUser = localStorage.getItem('user');

		if (err.response?.status === 401 && cachedUser) {
			let role;
			try { role = JSON.parse(cachedUser)?.role; } catch { /* ignore */ }
			const loginPath = loginPathForRole(role);

			localStorage.removeItem('user');

			if (onUnauthorized) {
				onUnauthorized(loginPath);
			} else {
				// Fallback before the app has registered its handler.
				window.location.href = loginPath;
			}
		}
		return Promise.reject(err);
	}
);

export default api;
