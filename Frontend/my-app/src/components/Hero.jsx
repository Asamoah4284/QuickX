import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';

const Hero = () => {
  const [activeMembers] = useState([
    { id: 1, image: 'https://pixner.net/html/tradexy/tradexy/assets/images/testimonial/testimonial-author1.png' },
    { id: 2, image: 'https://pixner.net/html/tradexy/tradexy/assets/images/testimonial/testimonial-author2.png' },
    { id: 3, image: 'https://pixner.net/html/tradexy/tradexy/assets/images/testimonial/testimonial-author3.png' },
    { id: 4, image: 'https://pixner.net/html/tradexy/tradexy/assets/images/testimonial/testimonial-author5.png' },
  ]);

  const [currentBackgroundIndex, setCurrentBackgroundIndex] = useState(0);
  const [nextContentIndex, setNextContentIndex] = useState(0);
  const [animationState, setAnimationState] = useState('visible');

  const backgroundImages = useMemo(
    () => [
      '/images/hero.png',
      '/images/7.jpg',
      'https://pixner.net/html/tradexy/tradexy/assets/images/hero/banner5-slide2.png',
      'https://i.pinimg.com/736x/47/d3/6e/47d36eab2ad7496068569c27e70823d8.jpg',
    ],
    []
  );

  const contentSlides = [
    {
      tagline: 'Learn anything · One place',
      heading: 'Find Your Next Course That Move Your Career Forward',
      description:
        'Browse thousands of lessons across topics you care about. Learn on your schedule, track progress, and pick up new skills with instructors.',
    },
    {
      tagline: 'Expert-led · Always on',
      heading: 'A Learning Hub Built Like the Platforms You Already Love',
      description:
        'Discover courses by category, read clear previews, and start in minutes—whether you are upskilling, switching paths, or exploring something new.',
    },
    {
      tagline: 'Your pace · Your goals',
      heading: 'From Lessons to Structured Paths That Fit Real Life',
      description:
        'Short modules, logical sequences, and resources you can revisit anytime. No fluff—just clear outcomes and content you can apply right away.',
    },
    {
      tagline: 'Community · Quality',
      heading: 'Join Learners Who Choose Clear Teaching and Fair Value',
      description:
        'We focus on practical courses, transparent structure, and support when you need it—so you spend less time searching and more time learning.',
    },
  ];

  const taglineRef = useRef(null);
  const headingRef = useRef(null);
  const descriptionRef = useRef(null);

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: false,
      mirror: true,
      offset: 100,
    });

    const interval = setInterval(() => {
      setAnimationState('exiting');
      const nextIndex = (currentBackgroundIndex + 1) % backgroundImages.length;
      setNextContentIndex(nextIndex);
      setTimeout(() => {
        setCurrentBackgroundIndex(nextIndex);
        setAnimationState('entering');
        setTimeout(() => {
          setAnimationState('visible');
        }, 100);
      }, 600);
    }, 6000);

    return () => clearInterval(interval);
  }, [currentBackgroundIndex, backgroundImages.length]);

  const getAnimationClasses = (element) => {
    const baseClasses = 'transition-all duration-700 ease-out ';

    if (animationState === 'visible') {
      return `${baseClasses}translate-y-0 opacity-100`;
    }
    if (animationState === 'exiting') {
      if (element === 'tagline') return `${baseClasses}opacity-0 -translate-y-6`;
      if (element === 'heading') return `${baseClasses}opacity-0 -translate-y-8`;
      return `${baseClasses}opacity-0 -translate-y-10`;
    }
    if (animationState === 'entering') {
      if (element === 'tagline') return `${baseClasses}translate-y-6 opacity-0`;
      if (element === 'heading') return `${baseClasses}translate-y-8 opacity-0`;
      return `${baseClasses}translate-y-10 opacity-0`;
    }

    return baseClasses;
  };

  const getDelay = (element) => {
    if (animationState === 'exiting') {
      if (element === 'tagline') return '0ms';
      if (element === 'heading') return '80ms';
      return '160ms';
    }
    if (animationState === 'entering') {
      if (element === 'tagline') return '0ms';
      if (element === 'heading') return '120ms';
      return '240ms';
    }
    return '0ms';
  };

  const content =
    animationState === 'entering' || animationState === 'visible'
      ? contentSlides[currentBackgroundIndex]
      : contentSlides[nextContentIndex === 0 ? contentSlides.length - 1 : nextContentIndex - 1];
  const currentBg = backgroundImages[currentBackgroundIndex % backgroundImages.length];
  const nextBg = backgroundImages[nextContentIndex % backgroundImages.length];

  return (
    <section className="relative flex min-h-[min(92vh,880px)] items-center overflow-hidden text-white">
      {/* Background image + layered atmosphere */}
      <div className="absolute inset-0 z-0">
        {/* Crossfade background slider (syncs with the text slide timing) */}
        <img
          src={currentBg}
          alt=""
          className={`absolute left-1/2 top-1/2 h-full min-h-full w-full min-w-full -translate-x-1/2 -translate-y-1/2 object-cover transition-opacity duration-700 ease-out ${
            animationState === 'exiting' ? 'opacity-0' : 'opacity-100'
          }`}
          loading="eager"
          decoding="async"
        />
        <img
          src={nextBg}
          alt=""
          className={`absolute left-1/2 top-1/2 h-full min-h-full w-full min-w-full -translate-x-1/2 -translate-y-1/2 object-cover transition-opacity duration-700 ease-out ${
            animationState === 'exiting' ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          decoding="async"
          aria-hidden
        />
        {/* Depth: vignette + cool gradient (reads premium on mobile & desktop) */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-blue-900/50 to-slate-950/90"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-tr from-blue-500/22 via-transparent to-emerald-500/15"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_120%,rgba(59,130,246,0.35),transparent)]"
          aria-hidden
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:48px_48px]"
          aria-hidden
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20 md:py-24 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12 lg:py-4">
          <div className="lg:col-span-7">
            <div className="relative">
              {/* Glass card on small screens for contrast; open on large */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-blue-800/30 backdrop-blur-md sm:p-8 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
                {/* Tagline */}
                <div
                  ref={taglineRef}
                  className={getAnimationClasses('tagline')}
                  style={{ transitionDelay: getDelay('tagline') }}
                >
                  <div className="mb-5 sm:mb-6">
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200/95 sm:text-xs">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                      {content.tagline}
                    </span>
                  </div>
                </div>

                {/* Heading */}
                <div
                  ref={headingRef}
                  className={getAnimationClasses('heading')}
                  style={{ transitionDelay: getDelay('heading') }}
                >
                  <h1 className="mb-4 text-[1.35rem] font-bold leading-[1.18] tracking-tight sm:mb-5 sm:text-3xl sm:leading-[1.15] md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
                    <span className="bg-gradient-to-br from-white via-white to-blue-100/90 bg-clip-text text-transparent">
                      {content.heading}
                    </span>
                  </h1>
                </div>

                {/* Description + social proof */}
                <div
                  ref={descriptionRef}
                  className={getAnimationClasses('description')}
                  style={{ transitionDelay: getDelay('description') }}
                >
                  <p className="mb-8 max-w-xl text-xs leading-relaxed text-blue-100/90 sm:text-base md:text-lg">
                    {content.description}
                  </p>

                  <div className="mb-8 flex flex-col gap-6 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:gap-8 md:mb-10">
                    <div>
                      <span className="mb-2 block text-[10px] font-medium uppercase tracking-wider text-slate-400 sm:text-xs">
                        Join learners worldwide
                      </span>
                      <div className="flex items-center">
                        {activeMembers.map((member, index) => (
                          <div
                            key={member.id}
                            className="h-9 w-9 overflow-hidden rounded-full border-2 border-white/90 shadow-md ring-2 ring-slate-900/50 sm:h-10 sm:w-10"
                            style={{ marginLeft: index > 0 ? '-12px' : '0' }}
                          >
                            <img src={member.image} alt="" className="h-full w-full object-cover" />
                          </div>
                        ))}
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/90 bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold shadow-md ring-2 ring-slate-900/50 sm:h-10 sm:w-10 sm:text-sm"
                          style={{ marginLeft: '-12px' }}
                        >
                          +
                        </div>
                        <span className="ml-3 text-xs font-semibold text-white/95 sm:ml-4 sm:text-sm">Growing community</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
                    <Link
                      to="/courses"
                      className="group inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 text-center text-xs font-semibold text-white shadow-lg shadow-blue-800/30 transition hover:from-blue-400 hover:to-indigo-600 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:min-w-[200px] sm:px-7 sm:py-3.5 sm:text-sm"
                    >
                      Explore courses
                      <svg
                        className="ml-2 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 sm:h-4 sm:w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                    <Link
                      to="/store"
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/25 bg-white/5 px-6 py-3 text-center text-xs font-semibold text-white backdrop-blur-sm transition hover:border-white/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:min-w-[200px] sm:px-7 sm:py-3.5 sm:text-sm"
                    >
                      Explore Books
                    </Link>
                  </div>

                  {/* Slide dots */}
                  <div className="mt-8 flex items-center gap-2 sm:mt-10" role="tablist" aria-label="Hero highlights">
                    {contentSlides.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          i === currentBackgroundIndex ? 'w-8 bg-white' : 'w-1.5 bg-white/35'
                        }`}
                        aria-current={i === currentBackgroundIndex ? 'true' : undefined}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative column — light panel suggests depth (desktop) */}
          <div className="relative hidden lg:col-span-5 lg:block" aria-hidden>
            <div className="relative mx-auto aspect-[4/5] max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.02] p-1 shadow-2xl backdrop-blur-sm">
              <div className="flex h-full flex-col justify-between rounded-xl bg-slate-900/40 p-6">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-blue-200/80">Quick X</p>
                  <p className="mt-2 text-lg font-semibold leading-snug text-white">Courses you can browse, start, and finish</p>
                </div>
                <div className="space-y-3 text-sm text-blue-100/80">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">✓</span>
                    Search & filter by topic
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">✓</span>
                    Video lessons & structured curriculum
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">✓</span>
                    Learn at your own pace
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade into next section */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-[1] h-24 bg-gradient-to-t from-white to-transparent"
        aria-hidden
      />
    </section>
  );
};

export default Hero;
