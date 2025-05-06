import React from 'react';
import { Link } from 'react-router-dom';

const About = () => {
  // Team members data
  const teamMembers = [
    {
      id: 1,
      name: 'John Smith',
      role: 'CEO & Founder',
      bio: 'With over 15 years of experience in financial markets, John founded CritoX to democratize access to quality financial education.',
      image: '/images/team/john-smith.jpg',
      linkedin: 'https://linkedin.com/in/john-smith',
      twitter: 'https://twitter.com/johnsmith'
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      role: 'Head of Education',
      bio: 'Sarah brings her expertise in curriculum development and financial education to lead our educational initiatives.',
      image: '/images/team/sarah-johnson.jpg',
      linkedin: 'https://linkedin.com/in/sarah-johnson',
      twitter: 'https://twitter.com/sarahjohnson'
    },
    {
      id: 3,
      name: 'Michael Chen',
      role: 'Technical Director',
      bio: 'Michael oversees our technical infrastructure and ensures our platform delivers the best learning experience.',
      image: '/images/team/michael-chen.jpg',
      linkedin: 'https://linkedin.com/in/michael-chen',
      twitter: 'https://twitter.com/michaelchen'
    },
    {
      id: 4,
      name: 'Emily Rodriguez',
      role: 'Community Manager',
      bio: 'Emily fosters our vibrant community of learners and ensures everyone feels supported on their journey.',
      image: '/images/team/emily-rodriguez.jpg',
      linkedin: 'https://linkedin.com/in/emily-rodriguez',
      twitter: 'https://twitter.com/emilyrodriguez'
    }
  ];

  return (
    <div className="bg-gray-50 min-h-screen pt-20">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-800 to-purple-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div className="max-w-6xl mx-auto px-6 py-24 relative z-10">
          <div className="text-center">
            <h1 className="text-5xl font-extrabold tracking-tight text-white mb-6 drop-shadow-lg">
              About <span className="text-blue-400">Quick</span><span className="text-yellow-400">X</span>
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Empowering individuals with knowledge and tools to navigate the complex world of finance and technology.
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 to-transparent"></div>
      </div>

      {/* Company Story Section */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
            <p className="text-gray-600 mb-4">
            At Quick X, we are passionate about lighting up minds through innovative digital learning. Our mission is to equip individuals with the essential skills and the right mindset to achieve financial freedom and personal growth. We believe that knowledge is the key to unlocking limitless opportunities, and we are committed to providing accessible, practical education that empowers our learners to excel in their chosen fields.
            </p>
            <p className="text-gray-600 mb-4">
            One of the core principles at Quick X is recognizing the gaps left by traditional education systems in preparing individuals for financial success. Formal education often neglects to provide the critical knowledge, mindset, and skillset needed to excel in real-world financial scenarios. At Quick X, we aim to fill this gap by offering cutting-edge courses and mentorship that teach the financial wisdom and skills that are rarely addressed in school.
            </p>
            <p className="text-gray-600">
            Our platform provides a variety of online courses in areas such as crypto trading, forex trading, web development, data analysis, and market research. These courses are carefully designed to bridge the gap between conventional learning and practical financial expertise. Through our expert-led training, we focus not only on imparting knowledge but also on fostering the mindset required to create wealth and thrive financially.
In addition to our online courses, we also offer books that delve deeper into financial literacy, self-development, and entrepreneurship. Our books serve as valuable resources for those looking to enhance their knowledge and accelerate their journey to financial independence.
At Quick X, we provide more than just learning material — we offer personalized mentorship and coaching, guiding individuals on how to apply their knowledge, cultivate self-reliance, and build a pathway to sustainable financial success. Our goal is to instill the mindset and skills that formal education systems often overlook, ensuring our learners are equipped to excel in finance and entrepreneurship.
We are dedicated to transforming lives by empowering individuals to take charge of their financial futures. Whether you’re looking to start a career in trading, develop technical skills, or grow your financial mindset, Quick X provides the knowledge, resources, and support to unlock your potential and pave the way to financial freedom.
            </p>
          </div>
          <div className="md:bg-white md:p-8 p-0 md:rounded-xl md:shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Our Values</h3>
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-semibold text-gray-900">Innovation</h4>
                  <p className="text-gray-600">We constantly evolve our curriculum to reflect the latest developments in finance and technology.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-semibold text-gray-900">Community</h4>
                  <p className="text-gray-600">We believe in the power of community and foster an environment where learners support each other.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-semibold text-gray-900">Integrity</h4>
                  <p className="text-gray-600">We are committed to providing honest, unbiased education without promoting specific investments.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Meet Our Team</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our diverse team brings together expertise in finance, technology, and education to create the best learning experience for you.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member) => (
              <div key={member.id} className="bg-gray-50 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
                <div className="h-64 bg-gray-200 relative">
                  {/* Placeholder for team member image */}
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{member.name}</h3>
                  <p className="text-blue-600 font-medium mb-3">{member.role}</p>
                  <p className="text-gray-600 mb-4">{member.bio}</p>
                  <div className="flex space-x-4">
                    <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                    </a>
                    <a href={member.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-800 to-purple-900 py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Join Our Learning Community</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Start your journey with CritoX today and gain the knowledge and skills you need to succeed in the financial markets.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/school" className="px-8 py-3 bg-blue-500 text-white font-semibold rounded-full shadow-lg hover:bg-blue-600 transition-all duration-200">
              Explore Courses
            </Link>
            <Link to="/register" className="px-8 py-3 bg-white text-blue-900 font-semibold rounded-full shadow-lg hover:bg-blue-50 transition-all duration-200">
              Sign Up Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About; 