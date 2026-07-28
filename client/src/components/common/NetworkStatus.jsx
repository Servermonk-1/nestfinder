import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

/**
 * A persistent banner while the browser is offline, plus a brief "back online"
 * confirmation. Sits above everything so the user always knows why things
 * stopped working, instead of silently failing requests.
 */
export default function NetworkStatus() {
	const [online, setOnline] = useState(() => navigator.onLine !== false);
	const [justReconnected, setJustReconnected] = useState(false);

	useEffect(() => {
		const goOffline = () => { setOnline(false); setJustReconnected(false); };
		const goOnline = () => {
			setOnline(true);
			setJustReconnected(true);
			setTimeout(() => setJustReconnected(false), 3000);
		};
		window.addEventListener('offline', goOffline);
		window.addEventListener('online', goOnline);
		return () => {
			window.removeEventListener('offline', goOffline);
			window.removeEventListener('online', goOnline);
		};
	}, []);

	const show = !online || justReconnected;

	return (
		<AnimatePresence>
			{show && (
				<motion.div
					initial={{ y: -48, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: -48, opacity: 0 }}
					transition={{ type: 'spring', stiffness: 320, damping: 30 }}
					role="status"
					aria-live="polite"
					className={`fixed inset-x-0 top-0 z-[300] flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white shadow-card ${
						online ? 'bg-success' : 'bg-danger'
					}`}
				>
					{online ? (
						<><Wifi className="h-4 w-4" /> Back online</>
					) : (
						<><WifiOff className="h-4 w-4" /> You're offline — some things won't load until your connection returns.</>
					)}
				</motion.div>
			)}
		</AnimatePresence>
	);
}
