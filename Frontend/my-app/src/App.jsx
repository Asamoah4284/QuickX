import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";

import RootLayout from "./layouts/RootLayout";
import Home from "./pages/Home";
import About from "./pages/About";

import UserDashboard from "./pages/UserDashboard";
import Analysis from "./pages/Analysis";
import PremiumAnalysis from "./pages/PremiumAnalysis";

import Community from "./pages/Community";
import Profile from "./pages/Profile";
import BookDetails from "./pages/BookDetails";
import Checkout from "./pages/Checkout";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import MainSchool from "./pages/School/MainSchool";
import ForexSchool from "./pages/School/ForexSchool";
import CryptoSchool from "./pages/School/CryptoSchool";
import WebDevSchool from "./pages/School/WebDevSchool";
import CourseDetail from "./pages/School/CourseDetail";
import Store from "./pages/store/store";
import Pricing from "./pages/School/Pricing";
import Membership from "./pages/Membership";
import CoursePublicDetail from "./pages/CoursePublicDetail";
import AdminLogin from "./pages/Admin/Login";
import AdminDashboard from "./pages/Admin/Dashboard";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AddCourse from './pages/Admin/AddCourse';
import EditCourse from './pages/Admin/EditCourse';
import { HelmetProvider } from 'react-helmet-async';
import CreatorProtectedRoute from "./components/CreatorProtectedRoute";
import CreatorLayout from "./layouts/CreatorLayout";
import CreatorEntry from "./pages/creator/CreatorEntry";
import CreatorOnboarding from "./pages/creator/CreatorOnboarding";
import CreatorDashboardOverview from "./pages/creator/CreatorDashboardOverview";
import CreatorCourses from "./pages/creator/CreatorCourses";
import CreatorCourseWizard from "./pages/creator/CreatorCourseWizard";
import CreatorStudents from "./pages/creator/CreatorStudents";
import CreatorReviews from "./pages/creator/CreatorReviews";
import CreatorEarnings from "./pages/creator/CreatorEarnings";
import CreatorPayouts from "./pages/creator/CreatorPayouts";
import CreatorProfileSettings from "./pages/creator/CreatorProfileSettings";
import CreatorApplications from "./pages/Admin/CreatorApplications";
import CourseReviewQueue from "./pages/Admin/CourseReviewQueue";
import CreatorSettings from "./pages/Admin/CreatorSettings";
import AdminLayout from "./layouts/AdminLayout";


// Define router with scrolling behavior
const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Home />
      },
      {
        path: "about",
        element: <About />
      },
      {
        path: "premium-analysis",
        element: <PremiumAnalysis />
      },
      {
        path: "school",
        children: [
          {
            index: true,
            element: <MainSchool />
          },
          { 
            path: "forex",
            element: <ForexSchool/>
          },
          {
            path: "crypto",
            element: <CryptoSchool/>
          },
          {
            path: "webdev",
            element: <WebDevSchool/>
          },
          {
            path: "pricing",
            element: <Pricing/>
          },
          
          {
            path: "course/:courseId",
            element: <CourseDetail />
          }
        ]
      },
      {
        path: "store",
        children: [
          {
            index: true,
            element: <Store/>
          },
          {
            path: ":bookId",
            element: <BookDetails />
          }
        ]
      },
      {
        path: "dashboard",
        element: <ProtectedRoute><UserDashboard /></ProtectedRoute>
      },
      {
        path: "profile",
        element: <ProtectedRoute><Profile /></ProtectedRoute>
      },
      {
        path: "checkout",
        element: <Checkout />
      },
      {
        path: "membership",
        element: <Membership />
      },
      {
        path: "courses",
        element: <MainSchool />
      },
      {
        path: "courses/:courseId",
        element: <CoursePublicDetail />
      },
      {
        path: "programs",
        element: <Navigate to="/creator/onboarding" replace />
      },
      {
        path: "instructor",
        element: <ProtectedRoute><CreatorEntry /></ProtectedRoute>
      },
      {
        path: "creator",
        children: [
          {
            path: "onboarding",
            element: <ProtectedRoute><CreatorOnboarding /></ProtectedRoute>
          },
          {
            path: "dashboard",
            element: <CreatorProtectedRoute><CreatorLayout /></CreatorProtectedRoute>,
            children: [
              {
                index: true,
                element: <CreatorDashboardOverview />
              },
              {
                path: "courses",
                element: <CreatorCourses />
              },
              {
                path: "courses/new",
                element: <CreatorCourseWizard />
              },
              {
                path: "courses/:courseId/edit",
                element: <CreatorCourseWizard />
              },
              {
                path: "drafts",
                element: <CreatorCourses statusFilter="draft" />
              },
              {
                path: "students",
                element: <CreatorStudents />
              },
              {
                path: "reviews",
                element: <CreatorReviews />
              },
              {
                path: "earnings",
                element: <CreatorEarnings />
              },
              {
                path: "payouts",
                element: <CreatorPayouts />
              },
              {
                path: "settings",
                element: <CreatorProfileSettings />
              }
            ]
          }
        ]
      },
      {
        path: "analysis",
        children: [
          {
            index: true,
            element: <Analysis />
          },
          {
            path: "premium",
            element: <ProtectedRoute><Analysis premium={true} /></ProtectedRoute>
          },
          {
            path: "premium-analysis",
            element: <PremiumAnalysis />
          }
        ]
      },
      {
        path: "community",
        element: <Community />
      },
      {
        path: "login",
        element: <Login />
      },
      {
        path: "register",
        element: <Register />
      },
      {
        path: "forgot-password",
        element: <ForgotPassword />
      },
      {
        path: "reset-password/:token",
        element: <ResetPassword />
      }
    ]
  },
  {
    path: "/admin",
    children: [
      {
        path: "login",
        element: <AdminLogin />
      },
      {
        element: <AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", element: <AdminDashboard /> },
          { path: "courses/add", element: <AddCourse /> },
          { path: "courses/edit/:courseId", element: <EditCourse /> },
          { path: "courses/review-queue", element: <CourseReviewQueue /> },
          { path: "courses", element: <AdminDashboard /> },
          { path: "tutors/applications", element: <CreatorApplications /> },
          { path: "platform/settings", element: <CreatorSettings /> },
          { path: "books", element: <AdminDashboard /> },
          { path: "upload", element: <AdminDashboard /> },
          { path: "settings", element: <AdminDashboard /> },
          { path: "coupons", element: <AdminDashboard /> },
          { path: "mentorship", element: <AdminDashboard /> },
          { path: "advertisements", element: <AdminDashboard /> },
          { path: "withdrawals", element: <AdminDashboard /> }
        ]
      }
    ]
  }
], {
  // This ensures the page starts from the top when navigating
  scrollBehavior: "auto"
});




function App() {

  
  

  return (
    <HelmetProvider>
      
      <RouterProvider router={router} />
    </HelmetProvider>
  )
  
}

export default App;
