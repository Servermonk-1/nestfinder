import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { CompareProvider } from './context/CompareContext';
import { SavedProvider } from './context/SavedContext';
import { StudentRoute, LandlordRoute, AdminRoute, StudentOrLandlordRoute } from './components/common/ProtectedRoute';
import AuthBridge from './components/common/AuthBridge';
import NetworkStatus from './components/common/NetworkStatus';

// Route components are code-split (React.lazy) so the initial bundle stays lean —
// a visitor to the landing page no longer downloads the admin panel, etc.
const StudentAuth = lazy(() => import('./pages/student/StudentLogin'));
const LandlordAuth = lazy(() => import('./pages/landlord/LandlordAuth'));
const AdminLogin = lazy(() => import('./pages/admin/adminLogin'));
const LandingV2 = lazy(() => import('./pages/LandingV2'));
const LandlordLanding = lazy(() => import('./pages/LandlordLanding'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const Dashboard = lazy(() => import('./pages/student/Dashboard'));
const ComparePage = lazy(() => import('./pages/student/ComparePage'));
const SavedPage = lazy(() => import('./pages/student/SavedPage'));
const CompaniesPage = lazy(() => import('./pages/student/CompaniesPage'));
const BookingsPage = lazy(() => import('./pages/student/BookingsPage'));
const SavedSearchesPage = lazy(() => import('./pages/student/SavedSearchesPage'));
const BookingDetailPage = lazy(() => import('./pages/student/BookingDetailPage'));
const CheckoutPage = lazy(() => import('./pages/student/CheckoutPage'));
const ManageBookings = lazy(() => import('./pages/admin/ManageBookings'));
const SystemHealth = lazy(() => import('./pages/admin/SystemHealth'));
const AccountPage = lazy(() => import('./pages/student/AccountPage'));
const MessagesPage = lazy(() => import('./pages/student/MessagesPage'));
const LandlordMessagesPage = lazy(() => import('./pages/landlord/LandlordMessagesPage'));
const LandlordDashboard = lazy(() => import('./pages/landlord/LandlordDashboard'));
const LandlordAccountPage = lazy(() => import('./pages/landlord/LandlordAccountPage'));
const AddListingPage = lazy(() => import('./pages/landlord/AddListingPage'));
const EditListingPage = lazy(() => import('./pages/landlord/EditListingPage'));
const ListingDetail = lazy(() => import('./pages/student/ListingDetailPage'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ManageVerifications = lazy(() => import('./pages/admin/ManageVerifications'));
const ManageReports = lazy(() => import('./pages/admin/ManageReports'));
const ManageLandlords = lazy(() => import('./pages/admin/ManageLandlords'));
const ManageListings = lazy(() => import('./pages/admin/ManageListings'));
const ManageCompanies = lazy(() => import('./pages/admin/ManageCompanies'));
const PaymentSettingsPage = lazy(() => import('./pages/admin/PaymentSettingsPage'));
const PaymentsPage = lazy(() => import('./pages/admin/PaymentsPage'));
const CompanyDetailPage = lazy(() => import('./pages/student/CompanyDetailPage'));
const NotFound = lazy(() => import('./pages/NotFound'));


const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-paper">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NetworkStatus />
        <AuthBridge />
        <NotificationProvider>
          <CompareProvider>
            <SavedProvider>
              <Suspense fallback={<PageLoader />}>
              <Routes>
              <Route path="/" element={<LandingV2 />} />
              <Route path="/for-landlords" element={<LandlordLanding />} />
              <Route path="/student/login" element={<StudentAuth />} />
              <Route path="/student/register" element={<StudentAuth />} />
              <Route path="/landlord/login" element={<LandlordAuth />} />
              <Route path="/landlord/register" element={<LandlordAuth />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/listings/:id" element={<ListingDetail />} />

              <Route path="/dashboard" element={
                <StudentRoute><Dashboard /></StudentRoute>
              } />
              <Route path="/compare" element={
                <StudentRoute><ComparePage /></StudentRoute>
              } />
              <Route path="/companies/:id" element={
                <StudentRoute><CompanyDetailPage /></StudentRoute>
              } />
              <Route path="/bookings" element={
                <StudentOrLandlordRoute><BookingsPage /></StudentOrLandlordRoute>
              } />
              <Route path="/bookings/:id" element={
                <StudentOrLandlordRoute><BookingDetailPage /></StudentOrLandlordRoute>
              } />
              {/* Checkout is the student's alone — a landlord has nothing to pay. */}
              <Route path="/bookings/:id/pay" element={
                <StudentRoute><CheckoutPage /></StudentRoute>
              } />
              <Route path="/landlord/bookings" element={
                <StudentOrLandlordRoute><BookingsPage /></StudentOrLandlordRoute>
              } />
              <Route path="/companies" element={
                <StudentRoute><CompaniesPage /></StudentRoute>
              } />
              <Route path="/saved-searches" element={
                <StudentRoute><SavedSearchesPage /></StudentRoute>
              } />
              <Route path="/saved" element={
                <StudentRoute><SavedPage /></StudentRoute>
              } />
              <Route path="/account" element={
                <StudentRoute><AccountPage /></StudentRoute>
              } />
              <Route path="/messages" element={
                <StudentRoute><MessagesPage /></StudentRoute>
              } />

              <Route path="/landlord/dashboard" element={
                <LandlordRoute><LandlordDashboard /></LandlordRoute>
              } />
              <Route path="/landlord/account" element={
                <LandlordRoute><LandlordAccountPage /></LandlordRoute>
              } />
              <Route path="/landlord/messages" element={
                <LandlordRoute><LandlordMessagesPage /></LandlordRoute>
              } />
              <Route path="/landlord/listings/new" element={
                <LandlordRoute><AddListingPage /></LandlordRoute>
              } />
              <Route path="/landlord/listings/:id/edit" element={
                <LandlordRoute><EditListingPage /></LandlordRoute>
              } />

              <Route path="/admin/dashboard" element={
                <AdminRoute><AdminDashboard /></AdminRoute>
              } />
              <Route path="/admin/verifications" element={
                <AdminRoute><ManageVerifications /></AdminRoute>
              } />
              <Route path="/admin/reports" element={
                <AdminRoute><ManageReports /></AdminRoute>
              } />
              <Route path="/admin/landlords" element={
                <AdminRoute><ManageLandlords /></AdminRoute>
              } />
              {/* Payouts are handled manually outside the application; route removed. */}
              <Route path="/admin/payment-settings" element={
                <AdminRoute><PaymentSettingsPage /></AdminRoute>
              } />
              <Route path="/admin/payments" element={
                <AdminRoute><PaymentsPage /></AdminRoute>
              } />
              <Route path="/admin/health" element={
                <AdminRoute><SystemHealth /></AdminRoute>
              } />
              <Route path="/admin/bookings" element={
                <AdminRoute><ManageBookings /></AdminRoute>
              } />
              <Route path="/admin/companies" element={
                <AdminRoute><ManageCompanies /></AdminRoute>
              } />
              <Route path="/admin/listings" element={
                <AdminRoute><ManageListings /></AdminRoute>
              } />

              <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </SavedProvider>
          </CompareProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
