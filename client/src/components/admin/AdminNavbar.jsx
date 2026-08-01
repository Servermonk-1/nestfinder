import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import NavPill from '../common/NavPill';
import { useAuth } from '../../context/AuthContext';

export default function AdminNavbar() {
	const navigate = useNavigate();
	const { logout } = useAuth();

	const signOut = () => { logout(); navigate('/admin/login'); };

	const links = [
		{ to: '/admin/dashboard', label: 'Dashboard' },
		{ to: '/admin/verifications', label: 'Verifications' },
		{ to: '/admin/reports', label: 'Reports' },
		{ to: '/admin/listings', label: 'Listings' },
		{ to: '/admin/landlords', label: 'Landlords' },
		{ to: '/admin/companies', label: 'SIWES' },
		{ to: '/admin/bookings', label: 'Bookings' },
		{ to: '/admin/health', label: 'Health' },
	];

	return (
		<NavPill
			links={links}
			// The console is a different context from the public product, and the
			// wordmark says so rather than relying on a badge or an icon.
			wordmark="NestFinder Console"
			wordmarkTo="/admin/dashboard"
			right={
				<button
					onClick={signOut}
					className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[14px] font-semibold text-muted transition hover:bg-danger/[0.08] hover:text-danger-ink"
				>
					<LogOut className="h-4 w-4" strokeWidth={1.75} /> Sign out
				</button>
			}
			mobileExtras={
				<button onClick={signOut} className="block w-full px-4 py-3 text-left text-sm font-semibold text-danger-ink">
					Sign out
				</button>
			}
		/>
	);
}
