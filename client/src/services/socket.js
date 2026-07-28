import { io } from 'socket.io-client';
import { getServerBaseUrl } from '../utils/urlHelper';

let socket = null;

// Auth rides on the httpOnly session cookie, which the browser attaches to the
// handshake when `withCredentials` is set — no token is handled in JS.
export const connectSocket = () => {
	if (socket?.connected) return socket;

	socket = io(getServerBaseUrl(), {
		withCredentials: true,
		autoConnect: true,
	});

	return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
	if (socket) {
		socket.disconnect();
		socket = null;
	}
};

export default { connectSocket, getSocket, disconnectSocket };
