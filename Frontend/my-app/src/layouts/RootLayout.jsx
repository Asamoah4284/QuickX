import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { useEffect, useLayoutEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Helmet } from 'react-helmet-async';
import { Analytics } from '@vercel/analytics/react';

/** Book profile at /store/:bookId — hide site chrome for a focused layout */
function isStoreBookDetailPath(pathname) {
  return /^\/store\/[^/]+$/.test(pathname);
}

function scrollWindowToTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function RootLayout() {
  const { pathname, search, hash } = useLocation();
  const hideNavOnBookDetail = isStoreBookDetailPath(pathname);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Jump to top on every navigation (before paint when possible)
  useLayoutEffect(() => {
    if (hash) return;
    scrollWindowToTop();
  }, [pathname, search, hash]);

  // Retry after paint — late-loading content / images can restore mid-page offset
  useEffect(() => {
    if (hash) return undefined;
    scrollWindowToTop();
    const raf = window.requestAnimationFrame(scrollWindowToTop);
    const t1 = window.setTimeout(scrollWindowToTop, 0);
    const t2 = window.setTimeout(scrollWindowToTop, 50);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [pathname, search, hash]);

  return (
    <>
      <Helmet>
        <title>QuickXLearn - Learn Forex, Crypto, and Web Development</title>
        <meta
          name="description"
          content="Join QuickXLearn for free forex, crypto, and web dev courses. Real analysis. Real results."
        />
        <meta property="og:title" content="QuickXLearn" />
        <meta property="og:description" content="Upgrade your skills with real-world education." />
        <meta property="og:url" content="https://quickxlearn.com" />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="root-layout w-full overflow-x-hidden">
        <ScrollRestoration getKey={(location) => location.pathname} />
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
