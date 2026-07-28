// Remembers a per-account "trusted device" token so a recently-verified device
// can skip the login OTP. Keyed by the email the user types, so a student and a
// landlord account on the same machine are remembered independently.
const KEY = 'nf_devices';

const read = () => {
	try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
};

export const getDeviceToken = (email) => read()[String(email || '').trim().toLowerCase()] || null;

export const saveDeviceToken = (email, token) => {
	if (!token) return;
	const map = read();
	map[String(email || '').trim().toLowerCase()] = token;
	try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* ignore */ }
};
