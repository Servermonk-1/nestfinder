import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

/**
 * App-wide notification layer for chat. Owns the single socket connection,
 * tracks the total unread-message count (for the navbar badge), and raises an
 * in-app toast when a message lands while you're somewhere other than the inbox.
 */
export const NotificationProvider = ({ children }) => {
	const { user, isAuthenticated } = useAuth();
	const location = useLocation();
	const navigate = useNavigate();
	const [unreadTotal, setUnreadTotal] = useState(0);

	const role = user?.role;
	const canChat = isAuthenticated && (role === 'student' || role === 'landlord');

	const refreshUnread = useCallback(async () => {
		if (!canChat) { setUnreadTotal(0); return; }
		try {
			const { data } = await api.get('/messages/unread-count');
			setUnreadTotal(data.unread || 0);
		} catch { /* keep last known count on a transient failure */ }
	}, [canChat]);

	// Mirror the live pathname + role into a ref so the socket handler can read
	// them without the socket effect re-subscribing on every navigation.
	const liveRef = useRef({ pathname: location.pathname, role });
	useEffect(() => { liveRef.current = { pathname: location.pathname, role }; }, [location.pathname, role]);

	// Fetch the count on login / auth change.
	useEffect(() => { refreshUnread(); }, [refreshUnread]);

	// Single owner of the socket connection for the whole app.
	useEffect(() => {
		if (!canChat) { disconnectSocket(); return; }
		const socket = connectSocket();

		const handleNew = () => {
			refreshUnread();
			const { pathname, role: r } = liveRef.current;
			const inInbox = pathname.startsWith('/messages') || pathname.startsWith('/landlord/messages');
			if (inInbox) return; // they'll see it appear — no toast needed
			const dest = r === 'landlord' ? '/landlord/messages' : '/messages';
			toast((t) => (
				<button
					type="button"
					onClick={() => { toast.dismiss(t.id); navigate(dest); }}
					style={{ color: 'inherit', background: 'none', border: 0, cursor: 'pointer', textAlign: 'left', padding: 0, font: 'inherit' }}
				>
					💬 New message — tap to open
				</button>
			), { duration: 5000 });
		};

		socket.on('message:new', handleNew);
		return () => { socket.off('message:new', handleNew); };
	}, [canChat, refreshUnread, navigate]);

	return (
		<NotificationContext.Provider value={{ unreadTotal, refreshUnread }}>
			{children}
		</NotificationContext.Provider>
	);
};

export const useNotifications = () => {
	const ctx = useContext(NotificationContext);
	if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
	return ctx;
};

export default NotificationContext;
