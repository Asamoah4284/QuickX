import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaChartLine, FaUser, FaCalendarAlt, FaArrowLeft, FaChartBar, FaImage, FaSearch, FaStar, FaBell, FaFilter, FaTag, FaCalendar, FaBookmark, FaNewspaper } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

function PremiumAnalysis() {
  const navigate = useNavigate();
  
  // State to track image loading errors
  const [imageErrors, setImageErrors] = useState({});

  const handleImageError = (id, type, index) => {
    setImageErrors(prev => ({
      ...prev,
      [`${id}-${type}${index ? `-${index}` : ''}`]: true
    }));
  };

  // Popular tags for sidebar
  const popularTags = ['Forex', 'Crypto', 'Stocks', 'Commodities', 'Indices', 'Economic Calendar'];
  
  // Recent analyses for sidebar
  const recentAnalyses = [
    { id: 1, title: 'USD/JPY: Key Levels for Week Ahead', date: 'June 14, 2023' },
    { id: 2, title: 'Oil Markets: Supply Constraints Analysis', date: 'June 13, 2023' },
    { id: 3, title: 'S&P 500 Technical Outlook', date: 'June 13, 2023' },
    { id: 4, title: 'Bitcoin: Resistance Levels to Watch', date: 'June 12, 2023' },
  ];

  const premiumAnalysisData = [
    {
      id: 1,
      title: 'EUR/USD Technical Analysis: Bullish Momentum Continues',
      author: 'Jane Smith',
      date: 'June 12, 2023',
      image: 'https://i.pinimg.com/474x/8c/ab/8e/8cab8e4e17f2e9ff068f590a15d68dab.jpg',
      additionalCharts: [
        {
          url: 'https://i.pinimg.com/474x/0e/1d/b2/0e1db296b7055a9213b128b7ae9aa53d.jpg',
          caption: 'EUR/USD Daily Chart with RSI Indicator Showing Bullish Momentum'
        },
        {
          url: 'https://i.pinimg.com/474x/0e/1d/b2/0e1db296b7055a9213b128b7ae9aa53d.jpg',
          caption: 'EUR/USD 4-Hour Chart Showing Bullish Channel Formation'
        }
      ],
      content: [
        'The EUR/USD pair continues to show bullish momentum, with key resistance at 1.2150. A breakout above this level could signal a continued uptrend toward the 1.2300 level in the coming weeks.',
        'Recent economic data from the Eurozone has exceeded market expectations, providing fundamental support for the Euro. Meanwhile, the US dollar index (DXY) has weakened following the latest Federal Reserve policy statement, which indicated a more dovish stance than previously anticipated.',
        'On the 4-hour chart, we can observe a clear bullish channel formation with strong support at 1.2050. The RSI indicator is currently at 62, suggesting momentum remains positive without entering overbought territory yet.',
        'Volume analysis confirms the strength of the current move, with above-average participation during recent bullish candles. This suggests institutional interest in the current rally.',
        'Traders should monitor the upcoming ECB policy meeting on Thursday, which could provide additional catalysts for the pair. A hawkish tone from ECB officials could accelerate the bullish momentum.'
      ]
    },
    {
      id: 2,
      title: 'GBP/JPY Breakout Potential: Key Levels to Watch',
      author: 'John Doe',
      date: 'June 11, 2023',
      image: 'https://forextraininggroup.com/wp-content/uploads/2020/03/GBPJPY-trade-setup-trade-entry.png',
      additionalCharts: [
        {
          url: 'https://www.forexmt4indicators.com/wp-content/uploads/2022/07/gbpjpy-price-action-trading-strategy.webp',
          caption: 'GBP/JPY Daily Chart Showing Symmetrical Triangle Formation'
        },
        {
          url: 'https://elearnmarkets.com/blogs/storage/2024/03/Screenshot-2024-03-06-at-16.36.55-1331x600.png',
          caption: 'GBP/JPY MACD Histogram Showing Increasing Momentum'
        }
      ],
      content: [
        'GBP/JPY is approaching a critical resistance level at 155.00, with increasing volume suggesting a potential breakout. This cross pair has been consolidating for the past two weeks, building potential energy for a significant move.',
        'The Bank of England\'s recent hawkish stance contrasts with the Bank of Japan\'s continued dovish policy, creating a fundamental backdrop that supports the bullish case for this pair. The interest rate differential continues to favor the British Pound.',
        'Technical analysis reveals a symmetrical triangle formation on the daily chart, with the price currently testing the upper boundary. A confirmed close above 155.00 would validate the breakout scenario, with potential targets at 157.50 and 160.00.',
        'The MACD histogram is showing increasing positive momentum, while the 50-day moving average has crossed above the 100-day moving average, confirming the medium-term bullish bias.',
        'Risk management is crucial for this trade. Conservative traders might wait for a pullback to 153.80 after the breakout for a better risk-reward entry, while aggressive traders could enter on the initial breakout with a stop below 152.50.'
      ]
    },
    {
      id: 3,
      title: 'Gold Price Comprehensive Forecast: Bullish Factors Align',
      author: 'Michael Brown',
      date: 'June 10, 2023',
      image: 'https://www.dailyfx.com/wp-content/uploads/2023/04/Gold_Price_Forecast_XAU_USD_Yearly_Chart-637c24ffe26be.webp',
      additionalCharts: [
        {
          url: 'https://www.investopedia.com/thmb/I3TJA2gd0u-Taz8D-c0AgKRsQTA=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/dotdash_Final_Gold_Price_History_from_1929_to_present_September_2020-01-e39c2615fb1f4a2ea50dd34eac03ea46.jpg',
          caption: 'Gold Price Historical Chart Showing Long-Term Support Levels'
        },
        {
          url: 'https://www.tradingview.com/x/Tct8LWr3/',
          caption: 'Gold Price Daily Chart with Golden Cross Formation'
        }
      ],
      content: [
        'Gold is showing strong support at $1,850, with potential for a rally toward $1,900 and beyond. The precious metal has been forming a solid base after the recent pullback from all-time highs.',
        'Inflation concerns continue to provide a fundamental tailwind for gold prices. The latest CPI data from major economies suggests that inflation remains persistent, which typically benefits gold as an inflation hedge.',
        'Technical indicators are aligning bullishly on multiple timeframes. The daily chart shows a golden cross (50-day MA crossing above the 200-day MA), while weekly stochastics are turning upward from oversold territory.',
        'Physical demand from central banks remains robust, with several emerging market countries adding to their gold reserves in Q2 2023. This institutional buying provides a solid floor for prices.',
        'Sentiment analysis indicates that retail traders are still underexposed to gold, suggesting room for additional buying pressure as more investors seek safe-haven assets amid ongoing geopolitical tensions and economic uncertainties.',
        'Key resistance levels to watch are $1,875, $1,900, and $1,920. A breakthrough above $1,920 could accelerate the rally toward the previous all-time high.'
      ]
    }
  ];

  return (
    <div className="font-sans">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Premium Market Analysis</h1>
            <p className="text-xl mb-8 text-blue-100">Gain exclusive insights from our expert analysts to make informed trading decisions</p>
            <div className="flex justify-center gap-4">
              <button className="bg-white text-blue-600 hover:bg-blue-50 py-3 px-6 rounded-lg font-medium transition-colors duration-200">
                Latest Reports
              </button>
              <button className="bg-transparent hover:bg-blue-700 border border-white text-white py-3 px-6 rounded-lg font-medium transition-colors duration-200">
                Subscribe Now
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto md:p-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <motion.aside 
            className="md:w-1/3 lg:w-1/3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="relative mb-4">
                <input 
                  type="text" 
                  placeholder="Search analyses..." 
                  className="w-full py-2 pl-10 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center">
                  <FaFilter className="mr-2 text-blue-500" /> Categories
                </h3>
                <ul className="space-y-2">
                  <li>
                    <a href="#" className="flex items-center text-gray-700 hover:text-blue-600">
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                      Forex Analysis
                    </a>
                  </li>
                  <li>
                    <a href="#" className="flex items-center text-gray-700 hover:text-blue-600">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                      Commodity Insights
                    </a>
                  </li>
                  <li>
                    <a href="#" className="flex items-center text-gray-700 hover:text-blue-600">
                      <span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
                      Crypto Market Reports
                    </a>
                  </li>
                  <li>
                    <a href="#" className="flex items-center text-gray-700 hover:text-blue-600">
                      <span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-2"></span>
                      Stock Market Analysis
                    </a>
                  </li>
                </ul>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center">
                  <FaTag className="mr-2 text-blue-500" /> Popular Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {popularTags.map((tag, index) => (
                    <a 
                      key={index} 
                      href="#" 
                      className="text-sm bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700 rounded-full px-3 py-1 transition-colors"
                    >
                      {tag}
                    </a>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center">
                  <FaCalendar className="mr-2 text-blue-500" /> Recent Analyses
                </h3>
                <ul className="space-y-3">
                  {recentAnalyses.map(analysis => (
                    <li key={analysis.id} className="border-b border-gray-100 pb-2 last:border-0">
                      <a href="#" className="text-gray-700 hover:text-blue-600 text-sm">
                        <div className="font-medium">{analysis.title}</div>
                        <div className="text-gray-500 text-xs">{analysis.date}</div>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg shadow-md p-6 border border-blue-100">
              <div className="flex items-center mb-4">
                <FaStar className="text-yellow-500 mr-2" size={20} />
                <h3 className="text-lg font-semibold text-blue-800">Premium Benefits</h3>
              </div>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li className="flex items-start">
                  <span className="inline-block bg-blue-500 rounded-full w-2 h-2 mt-2 mr-2"></span>
                  Exclusive in-depth analysis
                </li>
                <li className="flex items-start">
                  <span className="inline-block bg-blue-500 rounded-full w-2 h-2 mt-2 mr-2"></span>
                  Weekly market forecasts
                </li>
                <li className="flex items-start">
                  <span className="inline-block bg-blue-500 rounded-full w-2 h-2 mt-2 mr-2"></span>
                  Email alerts for market opportunities
                </li>
                <li className="flex items-start">
                  <span className="inline-block bg-blue-500 rounded-full w-2 h-2 mt-2 mr-2"></span>
                  Direct access to expert analysts
                </li>
              </ul>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded mt-4 text-sm font-medium transition-colors duration-200">
                Upgrade Membership
              </button>
            </div>
          </motion.aside>

          {/* Main Content */}
          <div className="md:w-3/4 lg:w-4/5">
            <div className="text-center mb-12 relative">
           
              <h2 className="text-3xl font-bold mb-2 text-gray-800">Featured Analysis</h2>
              <p className="text-lg text-gray-500 mb-8">In-depth research from our expert analysts</p>
            </div>

            <div className="flex flex-col gap-16">
              {premiumAnalysisData.map((analysis) => (
                <motion.article 
                  key={analysis.id} 
                  className="bg-white rounded-lg shadow-lg overflow-hidden pb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: analysis.id * 0.2 }}
                >
                  <div className="w-full h-[400px] overflow-hidden relative">
                    {imageErrors[`${analysis.id}-main`] ? (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <FaImage size={60} className="text-gray-400" />
                        <p className="absolute bottom-4 text-center w-full text-gray-600">Image could not be loaded</p>
                      </div>
                    ) : (
                      <img 
                        src={analysis.image} 
                        alt={analysis.title} 
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" 
                        onError={() => handleImageError(analysis.id, 'main')}
                      />
                    )}
                    {/* Adding premium badge */}
                    <div className="absolute top-4 right-4 bg-blue-600 text-white py-1 px-3 rounded-full text-sm font-medium flex items-center">
                      <FaStar className="mr-1 text-yellow-300" /> Premium
                    </div>
                  </div>
                  
                  <div className="px-8 pt-8 pb-4">
                    <h2 className="text-2xl font-bold mb-4 text-gray-800">{analysis.title}</h2>
                    <div className="flex flex-wrap gap-6 text-gray-500 text-sm mb-4">
                      <span className="flex items-center"><FaUser className="mr-2" /> {analysis.author}</span>
                      <span className="flex items-center"><FaCalendarAlt className="mr-2" /> {analysis.date}</span>
                      <span className="flex items-center"><FaChartLine className="mr-2" /> Premium Analysis</span>
                    </div>
                  </div>
                  
                  <div className="px-8 text-gray-700 leading-7">
                    <p className="mb-5 text-justify">{analysis.content[0]}</p>
                    <p className="mb-5 text-justify">{analysis.content[1]}</p>
                    
                    {/* First additional chart */}
                    <div className="my-8">
                      {imageErrors[`${analysis.id}-chart-0`] ? (
                        <div className="w-full h-[300px] flex items-center justify-center bg-gray-200 rounded-lg">
                          <FaImage size={40} className="text-gray-400" />
                          <p className="absolute text-gray-600">Chart could not be loaded</p>
                        </div>
                      ) : (
                        <img 
                          src={analysis.additionalCharts[0].url} 
                          alt={analysis.additionalCharts[0].caption}
                          className="w-full rounded-lg shadow-md"
                          onError={() => handleImageError(analysis.id, 'chart', 0)}
                        />
                      )}
                      <p className="text-sm text-gray-500 mt-2 text-center">{analysis.additionalCharts[0].caption}</p>
                    </div>
                    
                    <p className="mb-5 text-justify">{analysis.content[2]}</p>
                    <p className="mb-5 text-justify">{analysis.content[3]}</p>
                    
                    {/* Second additional chart */}
                    <div className="my-8">
                      {imageErrors[`${analysis.id}-chart-1`] ? (
                        <div className="w-full h-[300px] flex items-center justify-center bg-gray-200 rounded-lg">
                          <FaImage size={40} className="text-gray-400" />
                          <p className="absolute text-gray-600">Chart could not be loaded</p>
                        </div>
                      ) : (
                        <img 
                          src={analysis.additionalCharts[1].url} 
                          alt={analysis.additionalCharts[1].caption}
                          className="w-full rounded-lg shadow-md"
                          onError={() => handleImageError(analysis.id, 'chart', 1)}
                        />
                      )}
                      <p className="text-sm text-gray-500 mt-2 text-center">{analysis.additionalCharts[1].caption}</p>
                    </div>
                    
                    <p className="mb-5 text-justify">{analysis.content[4]}</p>
                    {analysis.content[5] && <p className="mb-5 text-justify">{analysis.content[5]}</p>}
                  </div>
                  
                  <div className="px-8 mt-8">
                    <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                      <h3 className="text-lg font-semibold text-blue-800 flex items-center mb-3">
                        <FaChartBar className="mr-2" /> Key Trading Insights
                      </h3>
                      <ul className="list-disc pl-5 space-y-2 text-gray-700">
                        <li>Support level: {analysis.id === 1 ? '1.2050' : analysis.id === 2 ? '152.50' : '$1,850'}</li>
                        <li>Resistance level: {analysis.id === 1 ? '1.2150' : analysis.id === 2 ? '155.00' : '$1,900'}</li>
                        <li>Trend direction: <span className="text-green-600 font-medium">Bullish</span></li>
                        <li>Risk level: {analysis.id === 1 ? 'Medium' : analysis.id === 2 ? 'High' : 'Low'}</li>
                        <li>Recommended timeframe: {analysis.id === 1 ? 'Daily' : analysis.id === 2 ? '4-Hour' : 'Weekly'}</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="px-8 pt-6 flex justify-between gap-4 border-t border-gray-100 mt-6">
                    <button className="flex items-center text-gray-600 hover:text-blue-600 bg-gray-100 hover:bg-gray-200 py-2 px-4 rounded transition-colors duration-200 font-medium">
                      <FaBookmark className="mr-2" /> Save for Later
                    </button>
                    <div className="flex gap-3">
                      <button className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors duration-200 font-medium flex items-center">
                        <FaNewspaper className="mr-2" /> Download PDF
                      </button>
                      <button className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded transition-colors duration-200 font-medium">
                        Share Analysis
                      </button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PremiumAnalysis; 