import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider, useParams } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, RequireAuth } from './lib/auth';
import { PageLoader } from './ui/primitives';
import SiteLayout from './layouts/SiteLayout';
import Landing from './features/marketing/Landing';

/* New design */
const Pricing = lazy(() => import('./features/billing/Pricing'));
const ProductCheckout = lazy(() => import('./features/billing/ProductCheckout'));
const PaymentDone = lazy(() => import('./features/billing/PaymentDone'));
const Signals = lazy(() => import('./features/signals/Signals'));
const Courses = lazy(() => import('./features/courses/Courses'));
const CourseDetail = lazy(() => import('./features/courses/CourseDetail'));
const Mentorship = lazy(() => import('./features/mentorship/Mentorship'));
const Community = lazy(() => import('./features/community/Community'));
const Account = lazy(() => import('./features/account/Account'));
const PieList = lazy(() => import('./features/pie/PieList'));
const PieDetail = lazy(() => import('./features/pie/PieDetail'));

/* Pages still on the previous design (rendered on a light sheet via handle.legacy) */
const About = lazy(() => import('./features/marketing/About'));
const Privacy = lazy(() => import('./features/legal/Privacy'));
const DeleteAccount = lazy(() => import('./features/legal/DeleteAccount'));
const CoursePlayer = lazy(() => import('./pages/School/CourseDetail'));
const Store = lazy(() => import('./pages/store/store'));
const BookDetails = lazy(() => import('./pages/BookDetails'));
const Checkout = lazy(() => import('./pages/Checkout'));
const BookGuestDownload = lazy(() => import('./pages/BookGuestDownload'));
const Events = lazy(() => import('./pages/Events'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const Profile = lazy(() => import('./features/account/Profile'));
const Login = lazy(() => import('./features/auth/Login'));
const Register = lazy(() => import('./features/auth/Register'));
const ForgotPassword = lazy(() => import('./features/auth/PasswordReset').then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./features/auth/PasswordReset').then((m) => ({ default: m.ResetPassword })));
const VerifyAccount = lazy(() => import('./features/auth/VerifyAccount'));

/* Owner studio (course and book authoring) */
const CreatorProtectedRoute = lazy(() => import('./components/CreatorProtectedRoute'));
const CreatorLayout = lazy(() => import('./layouts/CreatorLayout'));
const CreatorDashboardOverview = lazy(() => import('./pages/creator/CreatorDashboardOverview'));
const CreatorCourses = lazy(() => import('./pages/creator/CreatorCourses'));
const CreatorCourseWizard = lazy(() => import('./pages/creator/CreatorCourseWizard'));
const CreatorStudents = lazy(() => import('./pages/creator/CreatorStudents'));
const CreatorReviews = lazy(() => import('./pages/creator/CreatorReviews'));
const CreatorProfileSettings = lazy(() => import('./pages/creator/CreatorProfileSettings'));
const CreatorBooks = lazy(() => import('./pages/creator/CreatorBooks'));
const CreatorBookWizard = lazy(() => import('./pages/creator/CreatorBookWizard'));

/* Admin */
const AdminLogin = lazy(() => import('./pages/Admin/Login'));
const AdminProtectedRoute = lazy(() => import('./components/AdminProtectedRoute'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/Admin/Dashboard'));
const AddCourse = lazy(() => import('./pages/Admin/AddCourse'));
const EditCourse = lazy(() => import('./pages/Admin/EditCourse'));
const AdminSignals = lazy(() => import('./features/admin/AdminSignals'));
const AdminPricing = lazy(() => import('./features/admin/AdminPricing'));
const AdminMembers = lazy(() => import('./features/admin/AdminMembers'));
const AdminSessions = lazy(() => import('./features/admin/AdminSessions'));
const AdminOverview = lazy(() => import('./features/admin/AdminOverview'));
const AdminPie = lazy(() => import('./features/admin/AdminPie'));
const AdminEvents = lazy(() => import('./pages/Admin/AdminEvents'));

const legacy = { legacy: true };
const authed = (element) => <RequireAuth>{element}</RequireAuth>;
const go = (to) => <Navigate to={to} replace />;

function PieRedirect() {
  const { id } = useParams();
  return <Navigate to={`/pie/${id}`} replace />;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <SiteLayout />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'pricing', element: <Pricing /> },
      { path: 'payment/done', element: <PaymentDone /> },
      { path: 'checkout/plan/:productKey', element: authed(<ProductCheckout />) },
      { path: 'signals', element: <Signals /> },
      { path: 'courses', element: <Courses /> },
      { path: 'courses/:courseId', element: <CourseDetail /> },
      { path: 'mentorship', element: <Mentorship /> },
      { path: 'community', element: <Community /> },
      { path: 'account', element: authed(<Account />) },
      { path: 'pie', element: <PieList /> },
      { path: 'pie/:id', element: <PieDetail /> },
      { path: 'privacy', element: <Privacy /> },
      { path: 'delete-account', element: <DeleteAccount /> },
      { path: 'ptrading', element: go('/pie') },
      { path: 'ptrading/:id', element: <PieRedirect /> },

      // Previous design, still in use
      { path: 'about', element: <About /> },
      { path: 'school/course/:courseId', element: <CoursePlayer />, handle: { legacy: true, bare: true } },
      { path: 'store', element: <Store />, handle: legacy },
      { path: 'store/:bookId', element: <BookDetails />, handle: legacy },
      { path: 'checkout', element: <Checkout />, handle: legacy },
      { path: 'download/book', element: <BookGuestDownload />, handle: legacy },
      { path: 'events', element: <Events />, handle: legacy },
      { path: 'events/:id', element: <EventDetail />, handle: legacy },
      { path: 'profile', element: authed(<Profile />) },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'forgot-password', element: <ForgotPassword /> },
      { path: 'reset-password/:token', element: <ResetPassword /> },
      { path: 'verify-account', element: <VerifyAccount /> },

      // Owner studio
      {
        path: 'creator/dashboard',
        handle: { legacy: true, bare: true },
        element: (
          <CreatorProtectedRoute>
            <CreatorLayout />
          </CreatorProtectedRoute>
        ),
        children: [
          { index: true, element: <CreatorDashboardOverview /> },
          { path: 'courses', element: <CreatorCourses /> },
          { path: 'courses/new', element: <CreatorCourseWizard /> },
          { path: 'courses/:courseId/edit', element: <CreatorCourseWizard /> },
          { path: 'drafts', element: <CreatorCourses statusFilter="draft" /> },
          { path: 'students', element: <CreatorStudents /> },
          { path: 'community', element: go('/community?tab=manage') },
          { path: 'reviews', element: <CreatorReviews /> },
          { path: 'settings', element: <CreatorProfileSettings /> },
          { path: 'books', element: <CreatorBooks /> },
          { path: 'books/new', element: <CreatorBookWizard /> },
          { path: 'books/:bookId/edit', element: <CreatorBookWizard /> },
          { path: '*', element: go('/creator/dashboard') },
        ],
      },

      // Old addresses → new homes
      { path: 'dashboard', element: go('/account') },
      { path: 'membership', element: go('/account') },
      { path: 'school', element: go('/courses') },
      { path: 'school/*', element: go('/courses') },
      { path: 'programs', element: go('/pricing') },
      { path: 'instructor', element: go('/account') },
      { path: 'instructors/:tutorId/community', element: go('/community') },
      { path: 'instructors/:userId', element: go('/pricing') },
      { path: 'creator/*', element: go('/account') },
      { path: 'analysis/*', element: go('/signals') },
      { path: 'premium-analysis', element: go('/signals') },
      { path: '*', element: go('/') },
    ],
  },
  {
    path: '/admin',
    children: [
      { path: 'login', element: <AdminLogin /> },
      {
        element: (
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        ),
        children: [
          { index: true, element: go('/admin/dashboard') },
          { path: 'dashboard', element: <AdminOverview /> },
          { path: 'signals', element: <AdminSignals /> },
          { path: 'pricing', element: <AdminPricing /> },
          { path: 'members', element: <AdminMembers /> },
          { path: 'sessions', element: <AdminSessions /> },
          { path: 'courses', element: <AdminDashboard />, handle: legacy },
          { path: 'books', element: <AdminDashboard />, handle: legacy },
          { path: 'events', element: <AdminEvents />, handle: legacy },
          { path: 'pie', element: <AdminPie /> },
          { path: 'courses/add', element: <AddCourse />, handle: legacy },
          { path: 'courses/edit/:courseId', element: <EditCourse />, handle: legacy },
          { path: 'settings', element: <AdminDashboard />, handle: legacy },
          { path: 'coupons', element: <AdminDashboard />, handle: legacy },
          { path: 'withdrawals', element: <AdminDashboard />, handle: legacy },
          { path: '*', element: go('/admin/dashboard') },
        ],
      },
    ],
  },
]);

export default function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <RouterProvider router={router} />
        </Suspense>
      </AuthProvider>
    </HelmetProvider>
  );
}
