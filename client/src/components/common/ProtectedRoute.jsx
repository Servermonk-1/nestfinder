import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Spinner shown while checking auth
const Spinner = () => (
	<div className="min-h-screen flex items-center justify-center">
		<div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
	</div>
);

// For student-only pages
export const StudentRoute = ({ children }) => {
	const { user, loading } = useAuth();
	if (loading) return <Spinner />;
	if (!user || user.role !== 'student') return <Navigate to="/student/login" replace />;
	return children;
};

// For landlord-only pages
export const LandlordRoute = ({ children }) => {
	const { user, loading } = useAuth();
	if (loading) return <Spinner />;
	if (!user || user.role !== 'landlord') return <Navigate to="/landlord/login" replace />;
	return children;
};

// For pages both sides of a booking share — the same record, seen by the
// student who applied and the landlord who owns the room. Which actions appear
// is decided by the page; the server enforces who may actually do them.
export const StudentOrLandlordRoute = ({ children }) => {
	const { user, loading } = useAuth();
	if (loading) return <Spinner />;
	if (!user || !['student', 'landlord'].includes(user.role)) {
		return <Navigate to="/student/login" replace />;
	}
	return children;
};

// For admin-only pages
export const AdminRoute = ({ children }) => {
	const { user, loading } = useAuth();
	if (loading) return <Spinner />;
	if (!user || user.role !== 'admin') return <Navigate to="/admin/login" replace />;
	return children;
};