import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { setUnauthorizedHandler } from '../../services/api';

/**
 * Bridges the axios 401 interceptor back into React so an expired session logs
 * the user out (clearing in-memory AuthContext state too) and soft-navigates to
 * THEIR role's login screen — no full-page reload, no student-login-for-everyone.
 */
export default function AuthBridge() {
	const navigate = useNavigate();
	const { logout } = useAuth();

	useEffect(() => {
		setUnauthorizedHandler((loginPath) => {
			logout();
			toast.error('Your session expired. Please sign in again.');
			navigate(loginPath, { replace: true });
		});
		return () => setUnauthorizedHandler(null);
		// logout/navigate are behaviourally stable (state setters + router nav),
		// so registering once on mount is correct.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return null;
}
