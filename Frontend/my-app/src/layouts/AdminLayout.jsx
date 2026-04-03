import { useState } from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import {
  FiHome,
  FiUsers,
  FiBook,
  FiVideo,
  FiSettings,
  FiLogOut,
  FiBookOpen,
  FiTag,
  FiStar,
  FiImage,
  FiDollarSign,
  FiX,
  FiClipboard,
} from 'react-icons/fi';

function navClass(active) {
  return `flex items-center w-full px-3 lg:px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
    active
      ? 'bg-white text-gray-900 border border-slate-200 shadow-sm'
      : 'text-gray-600 hover:bg-gray-50 border border-transparent'
  }`;
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    navigate('/admin/login');
  };

  const isTutorApps = pathname.startsWith('/admin/tutors/applications');
  const isCourseReview = pathname.includes('/courses/review-queue');
  const isPlatformSettings = pathname.startsWith('/admin/platform/settings');
  const isCourses =
    pathname === '/admin/courses' ||
    pathname.startsWith('/admin/courses/add') ||
    pathname.startsWith('/admin/courses/edit');
  const isBooks = pathname.startsWith('/admin/books');
  const isUpload = pathname.startsWith('/admin/upload');
  const isSettingsTab = pathname.startsWith('/admin/settings') && !pathname.startsWith('/admin/platform');
  const isCoupons = pathname.startsWith('/admin/coupons');
  const isMentorship = pathname.startsWith('/admin/mentorship');
  const isAds = pathname.startsWith('/admin/advertisements');
  const isWithdrawals = pathname.startsWith('/admin/withdrawals');

  const close = () => setIsSidebarOpen(false);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-white">
      <div className="lg:hidden flex items-center justify-between p-4 bg-white shadow-sm shrink-0">
        <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
        <button
          type="button"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 relative z-50"
        >
          {isSidebarOpen ? <FiX className="text-gray-600 text-2xl" /> : (
            <svg className="w-6 h-6 text-gray-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      <div
        className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:sticky lg:top-0 lg:self-start lg:h-screen lg:shrink-0 inset-0 z-40 lg:z-auto w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out`}
      >
        <div className="p-4 lg:p-6">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-800 hidden lg:block">Admin Panel</h1>
        </div>
        <nav className="mt-4 lg:mt-6">
          <div className="px-2 lg:px-4 space-y-1 lg:space-y-2">
            <NavLink to="/admin/dashboard" end className={({ isActive }) => navClass(isActive)} onClick={close}>
              <FiHome className="mr-2 lg:mr-3" />
              Dashboard
            </NavLink>
            <NavLink to="/admin/tutors/applications" className={() => navClass(isTutorApps)} onClick={close}>
              <FiUsers className="mr-2 lg:mr-3" />
              Tutor applications
            </NavLink>
            <NavLink to="/admin/courses/review-queue" className={() => navClass(isCourseReview)} onClick={close}>
              <FiClipboard className="mr-2 lg:mr-3" />
              Course review queue
            </NavLink>
            <NavLink to="/admin/platform/settings" className={() => navClass(isPlatformSettings)} onClick={close}>
              <FiSettings className="mr-2 lg:mr-3" />
              Platform settings
            </NavLink>
            <NavLink to="/admin/courses" className={() => navClass(isCourses)} onClick={close}>
              <FiBook className="mr-2 lg:mr-3" />
              Courses
            </NavLink>
            <NavLink to="/admin/books" className={() => navClass(isBooks)} onClick={close}>
              <FiBookOpen className="mr-2 lg:mr-3" />
              Books
            </NavLink>
            <NavLink to="/admin/upload" className={() => navClass(isUpload)} onClick={close}>
              <FiVideo className="mr-2 lg:mr-3" />
              Upload Content
            </NavLink>
            <NavLink to="/admin/settings" className={() => navClass(isSettingsTab)} onClick={close}>
              <FiSettings className="mr-2 lg:mr-3" />
              Settings
            </NavLink>
            <NavLink to="/admin/coupons" className={() => navClass(isCoupons)} onClick={close}>
              <FiTag className="mr-2 lg:mr-3" />
              Coupons
            </NavLink>
            <NavLink to="/admin/mentorship" className={() => navClass(isMentorship)} onClick={close}>
              <FiStar className="mr-2 lg:mr-3" />
              Mentorship
            </NavLink>
            <NavLink to="/admin/advertisements" className={() => navClass(isAds)} onClick={close}>
              <FiImage className="mr-2 lg:mr-3" />
              Advertisements
            </NavLink>
            <NavLink to="/admin/withdrawals" className={() => navClass(isWithdrawals)} onClick={close}>
              <FiDollarSign className="mr-2 lg:mr-3" />
              Withdrawals
            </NavLink>
          </div>
        </nav>
        <div className="p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center w-full px-3 lg:px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <FiLogOut className="mr-2 lg:mr-3" />
            Logout
          </button>
        </div>
      </div>

      {isSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black bg-opacity-30 z-30 lg:hidden"
          aria-label="Close menu"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 min-h-0 lg:h-screen">
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
