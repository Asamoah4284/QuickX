import { useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { FiCheck } from 'react-icons/fi';

const benefits = [
  'Wide course catalog',
  'Self-paced video lessons',
  'Instructor-led paths',
  'Skills you can use right away',
];

export default function Features() {
  useEffect(() => {
    AOS.init({
      duration: 900,
      once: true,
      offset: 80,
    });
  }, []);

  return (
    <section className="bg-white py-16 sm:py-24 md:py-28">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="flex flex-col items-center md:flex-row md:items-center">
          <div
            className="mb-8 w-full max-w-xs sm:max-w-sm md:mb-0 md:w-1/2 md:max-w-none"
            data-aos="fade-right"
            data-aos-delay="100"
          >
            <img
              src="https://i.pinimg.com/736x/a7/2e/b6/a72eb6dad6d4c20201d3a70c4fb784cf.jpg"
              alt="Person learning online with laptop"
              className="mx-auto w-full max-w-[280px] object-contain sm:max-w-sm md:max-w-lg"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="relative md:w-1/2 md:pl-8 lg:pl-12">
            <div
              className="absolute -right-4 -top-8 hidden h-28 w-28 opacity-25 lg:block"
              data-aos="zoom-in"
              data-aos-delay="300"
              aria-hidden
            >
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#1B5EF5" strokeWidth="1" />
                <circle cx="50" cy="50" r="30" fill="none" stroke="#1B5EF5" strokeWidth="0.5" />
                <ellipse cx="50" cy="50" rx="40" ry="20" fill="none" stroke="#1B5EF5" strokeWidth="0.5" />
                <ellipse
                  cx="50"
                  cy="50"
                  rx="40"
                  ry="20"
                  fill="none"
                  stroke="#1B5EF5"
                  strokeWidth="0.5"
                  transform="rotate(90 50 50)"
                />
                <ellipse
                  cx="50"
                  cy="50"
                  rx="40"
                  ry="20"
                  fill="none"
                  stroke="#1B5EF5"
                  strokeWidth="0.5"
                  transform="rotate(45 50 50)"
                />
                <ellipse
                  cx="50"
                  cy="50"
                  rx="40"
                  ry="20"
                  fill="none"
                  stroke="#1B5EF5"
                  strokeWidth="0.5"
                  transform="rotate(-45 50 50)"
                />
              </svg>
            </div>

            <div
              className="mb-2 flex items-center sm:mb-3"
              data-aos="fade-left"
              data-aos-delay="200"
            >
              <div className="flex space-x-1">
                <span className="h-2 w-2 rounded-full bg-[#1B5EF5]" />
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                <span className="h-2 w-2 rounded-full bg-sky-300" />
              </div>
              <h3 className="ml-3 text-lg font-medium text-[#1B5EF5] sm:text-xl md:text-2xl">
                Why Choose Us
              </h3>
            </div>

            <h2
              className="mb-4 text-xl font-bold leading-snug text-[#0B1F44] sm:mb-6 sm:text-2xl md:text-3xl"
              data-aos="fade-left"
              data-aos-delay="300"
            >
              One place to discover courses, follow lessons, and track progress
            </h2>

            <p
              className="mb-6 text-sm leading-relaxed text-slate-500 sm:mb-8 sm:text-base"
              data-aos="fade-left"
              data-aos-delay="400"
            >
              Quick X is built around how people actually learn online: clear course pages, organized
              modules, and instructors who focus on outcomes—not hype. Find something that fits your
              goal and start when you are ready.
            </p>

            <div
              className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2"
              data-aos="fade-up"
              data-aos-delay="500"
            >
              {benefits.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-[#1B5EF5] sm:h-6 sm:w-6">
                    <FiCheck className="h-5 w-5" strokeWidth={2.5} />
                  </span>
                  <span className="text-sm font-medium text-slate-700 sm:text-base">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
