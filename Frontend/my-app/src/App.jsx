import { createBrowserRouter, RouterProvider } from "react-router-dom";

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
import ProtectedRoute from "./components/ProtectedRoute";
import MainSchool from "./pages/School/MainSchool";
import ForexSchool from "./pages/School/ForexSchool";
import CryptoSchool from "./pages/School/CryptoSchool";
import WebDevSchool from "./pages/School/WebDevSchool";
import CourseDetail from "./pages/School/CourseDetail";
import Store from "./pages/store/store";
import Pricing from "./pages/School/Pricing";
import Membership from "./pages/Membership";
import AdminLogin from "./pages/Admin/Login";
import AdminDashboard from "./pages/Admin/Dashboard";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AddCourse from './pages/Admin/AddCourse';
import EditCourse from './pages/Admin/EditCourse';
import { HelmetProvider } from 'react-helmet-async';


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
        path: "dashboard",
        element: <AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>
      },
      {
        path: "courses/add",
        element: <AdminProtectedRoute><AddCourse /></AdminProtectedRoute>
      },
      {
        path: "courses/edit/:courseId",
        element: <AdminProtectedRoute><EditCourse /></AdminProtectedRoute>
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
