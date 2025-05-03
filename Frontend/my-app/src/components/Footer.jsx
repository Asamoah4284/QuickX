import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gradient-to-r from-gray-900 to-gray-800 text-white pt-16 pb-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
              Quick X
            </h3>
            <p className="text-gray-300 mt-4 max-w-xs">
              Transforming ideas into exceptional digital experiences with innovative solutions.
            </p>
            <div className="flex space-x-4 mt-6">
              <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                <FaFacebook size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                <FaTwitter size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                <FaInstagram size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                <FaLinkedin size={20} />
              </a>
            </div>
          </div>
          
          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold relative pb-2 after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-10 after:h-1 after:bg-blue-500 after:rounded-full">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-300 hover:text-blue-400 transition-all duration-300 flex items-center">
                  <span className="bg-blue-500 h-1.5 w-1.5 rounded-full mr-2"></span>
                  Home
                </Link>
              </li>
              <li>
                <Link to="/store" className="text-gray-300 hover:text-blue-400 transition-all duration-300 flex items-center">
                  <span className="bg-blue-500 h-1.5 w-1.5 rounded-full mr-2"></span>
                  Store
                </Link>
              </li>
              <li>
                <Link to="/school" className="text-gray-300 hover:text-blue-400 transition-all duration-300 flex items-center">
                  <span className="bg-blue-500 h-1.5 w-1.5 rounded-full mr-2"></span>
                  School
                </Link>
              </li>
              <li>
                <Link to="/analysis" className="text-gray-300 hover:text-blue-400 transition-all duration-300 flex items-center">
                  <span className="bg-blue-500 h-1.5 w-1.5 rounded-full mr-2"></span>
                  Mentorship
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Services */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold relative pb-2 after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-10 after:h-1 after:bg-blue-500 after:rounded-full">
              Services
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="" className="text-gray-300 hover:text-blue-400 transition-all duration-300 flex items-center">
                  <span className="bg-blue-500 h-1.5 w-1.5 rounded-full mr-2"></span>
                 Online Courses
                </Link>
              </li>
              <li>
                <Link to="" className="text-gray-300 hover:text-blue-400 transition-all duration-300 flex items-center">
                  <span className="bg-blue-500 h-1.5 w-1.5 rounded-full mr-2"></span>
                  Mentorship
                </Link>
              </li>
              <li>
                <Link to="" className="text-gray-300 hover:text-blue-400 transition-all duration-300 flex items-center">
                  <span className="bg-blue-500 h-1.5 w-1.5 rounded-full mr-2"></span>
                  Consultation
                </Link>
              </li>
              <li>
                <Link to="" className="text-gray-300 hover:text-blue-400 transition-all duration-300 flex items-center">
                  <span className="bg-blue-500 h-1.5 w-1.5 rounded-full mr-2"></span>
                  Book Sales
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold relative pb-2 after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-10 after:h-1 after:bg-blue-500 after:rounded-full">
              Contact Us
            </h3>
            <div className="space-y-3">
              <p className="flex items-center text-gray-300">
                <FaEnvelope className="mr-3 text-blue-400" />
               Quickx310@gmail.com
              </p>
              <p className="flex items-center text-gray-300">
                <FaPhone className="mr-3 text-blue-400" />
                +233 555 756 303
              </p>
              <p className="flex items-center text-gray-300">
                <FaMapMarkerAlt className="mr-3 text-blue-400" />
                Central Region, Capecoast
              </p>
            </div>
          </div>
        </div>
        
        {/* Newsletter */}
        <div className="mt-12 border-t border-gray-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h4 className="text-lg font-medium mb-2">Subscribe to our newsletter</h4>
              <p className="text-gray-400">Stay updated with our latest news and offers</p>
            </div>
            <div className="w-full md:w-auto">
              <div className="flex">
                <input 
                  type="email" 
                  placeholder="Enter your email"
                  className="bg-gray-800 text-white py-2 px-4 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
                />
                <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-r-md transition-colors duration-300">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="border-t border-gray-700 mt-8 pt-8 text-center">
          <p className="text-gray-400">
            &copy; {currentYear} <span className="text-blue-400">Quick X</span>. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
