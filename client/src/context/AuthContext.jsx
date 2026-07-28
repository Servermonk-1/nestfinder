import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

/**
 * The session JWT lives in an httpOnly cookie set by the server — it is never
 * stored in (or readable from) JavaScript, so an XSS bug can't steal it. What we
 * keep in localStorage is only the non-sensitive user object, purely so the UI
 * can render instantly on reload; the cookie is what actually authenticates, and
 * `refreshUser()` re-validates it against the server.
 */
export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);

	// Hydrate the cached user on app start (the cookie carries the real session).
	useEffect(() => {
		const savedUser = localStorage.getItem('user');
		if (savedUser) {
			try {
				setUser(JSON.parse(savedUser));
			} catch {
				localStorage.removeItem('user');
				setUser(null);
			}
		}
		setLoading(false);
	}, []);

	// Keep auth in sync across tabs — if another tab signs in or out, mirror it.
	useEffect(() => {
		const syncFromStorage = () => {
			const savedUser = localStorage.getItem('user');
			if (savedUser) {
				try {
					setUser(JSON.parse(savedUser));
					return;
				} catch {
					/* fall through to clear */
				}
			}
			setUser(null);
		};
		window.addEventListener('storage', syncFromStorage);
		return () => window.removeEventListener('storage', syncFromStorage);
	}, []);

	// Pull the freshest account from the server and merge it in, so fields that
	// change server-side (e.g. `verified` flipped by admin KYC approval) stop
	// being frozen at whatever was cached at last login. Also revalidates the
	// cookie: a 401 here is handled by the api interceptor.
	const refreshUser = useCallback(async () => {
		if (!localStorage.getItem('user')) return;
		try {
			const { data } = await api.get('/profile/me');
			if (data?.user) {
				setUser((prev) => {
					const next = { ...(prev || {}), ...data.user };
					localStorage.setItem('user', JSON.stringify(next));
					return next;
				});
			}
		} catch {
			/* transient/expired — 401s are handled by the api interceptor */
		}
	}, []);

	// Refresh once, right after the initial hydration.
	useEffect(() => {
		if (!loading) refreshUser();
	}, [loading, refreshUser]);

	// `login(user)` — the second arg is accepted for call-site compatibility but
	// intentionally ignored: the server already set the httpOnly session cookie.
	const login = (userData) => {
		setUser(userData);
		localStorage.setItem('user', JSON.stringify(userData));
	};

	// Merge partial updates into the current user (e.g. after email verification)
	const updateUser = (patch) => {
		setUser((prev) => {
			const next = { ...(prev || {}), ...patch };
			localStorage.setItem('user', JSON.stringify(next));
			return next;
		});
	};

	// Clearing the cookie is the server's job — JS can't touch an httpOnly cookie.
	const logout = () => {
		setUser(null);
		localStorage.removeItem('user');
		api.post('/auth/logout').catch(() => { /* best-effort; local state is already cleared */ });
	};

	return (
		<AuthContext.Provider value={{ user, isAuthenticated: Boolean(user), login, logout, updateUser, refreshUser, loading }}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) throw new Error('useAuth must be used within AuthProvider');
	return context;
};

export default AuthContext;
