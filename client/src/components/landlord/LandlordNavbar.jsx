import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import NavPill from '../common/NavPill';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

function UnreadBadge({ count }) {
	if (!count) return null;
	return (
		<span className="ml-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] font-semibold leading-none text-white">
			{count > 9 ? '9+' : count}
		</span>
	);
}

export default function LandlordNavbar() {
	const { logout } = useAuth();
	const navigate = useNavigate();
	const { unreadTotal } = useNotifications();

	const handleSignOut = () => { logout(); navigate('/for-landlords'); };

	const links = [
		{ to: '/for-landlords', label: 'Home' },
		{ to: '/landlord/dashboard', label: 'Dashboard', match: /^\/landlord\/(dashboard|listings)/ },
		{ to: '/landlord/bookings', label: 'Bookings' },
		{ to: '/landlord/messages', label: 'Messages', badge: <UnreadBadge count={unreadTotal} /> },
		{ to: '/landlord/account', label: 'Account' },
	];

	return (
		<NavPill
			links={links}
			wordmarkTo="/for-landlords"
			right={
				<button
					onClick={handleSignOut}
					className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold text-muted transition hover:bg-danger/[0.08] hover:text-danger-ink"
				>
					<LogOut className="h-4 w-4" strokeWidth={1.75} /> Sign out
				</button>
			}
			mobileExtras={
				<button onClick={handleSignOut} className="block w-full px-4 py-3 text-left text-sm font-semibold text-danger-ink">
					Sign out
				</button>
			}
		/>
	);
}
