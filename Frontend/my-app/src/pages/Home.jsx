import { useState, useEffect } from 'react';
import { FaArrowUp, FaWhatsapp } from 'react-icons/fa';
import Hero from '../components/Hero';
import Learn from '../components/Learn';
import Courses from '../components/Courses';
import Features from '../components/Features';
import Call from '../components/Call';
import '../styles/landing.css';

export default function Home() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWhatsappClick = () => {
    const phoneNumber = '+233555756303';
    const message = 'Hello! I would like to get in touch with you.';
    window.open(
      `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`,
      '_blank'
    );
  };

  return (
    <div className="qx-landing min-h-screen overflow-x-hidden">
      <Hero />
      <Learn />
      <Features />
      <Courses />
      <Call />

      {showScrollTop ? (
        <div className="fixed bottom-5 right-4 z-50 flex flex-col gap-2.5 sm:bottom-8 sm:right-8">
          <button
            type="button"
            onClick={handleWhatsappClick}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-md transition hover:brightness-95"
            aria-label="Contact us on WhatsApp"
          >
            <FaWhatsapp className="text-2xl" />
          </button>
          <button
            type="button"
            onClick={scrollToTop}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0B1F44] text-white shadow-md transition hover:bg-[#1B5EF5]"
            aria-label="Scroll to top"
          >
            <FaArrowUp className="text-sm" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
