import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Footer from '../components/Footer';

function RootLayout() {
  const { pathname } = useLocation();
  
  // Scroll to top whenever the route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return (
    <div className="root-layout overflow-x-hidden w-full">
      <Navbar />
      {/* <Hero/> */}
      <main>
        <Outlet />
      </main>
      <Footer/>
    </div>
  );
}

export default RootLayout; 