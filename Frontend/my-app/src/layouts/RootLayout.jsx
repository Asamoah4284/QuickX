import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Helmet } from 'react-helmet-async';
import { Analytics } from '@vercel/analytics/react';


/** Book profile at /store/:bookId — hide site chrome for a focused layout */
function isStoreBookDetailPath(pathname) {
  return /^\/store\/[^/]+$/.test(pathname);
}

function RootLayout() {
  const { pathname } = useLocation();
  const hideNavOnBookDetail = isStoreBookDetailPath(pathname);

  // Scroll to top whenever the route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
     <Helmet>
        <title>QuickXLearn - Learn Forex, Crypto, and Web Development</title>
        <meta name="description" content="Join QuickXLearn for free forex, crypto, and web dev courses. Real analysis. Real results." />
        <meta property="og:title" content="QuickXLearn" />
        <meta property="og:description" content="Upgrade your skills with real-world education." />
        <meta property="og:url" content="https://quickxlearn.com" />
        <meta property="og:type" content="website" />
      </Helmet>
    <div className="root-layout overflow-x-hidden w-full">
      {!hideNavOnBookDetail ? <Navbar /> : null}
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
    <Analytics />
    </>
  );
}

export default RootLayout; 