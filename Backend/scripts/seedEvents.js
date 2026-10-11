const Event = require('../models/Event');

const DEFAULT_EVENTS = [
    {
        title: 'Forex Price Action Masterclass: Live Scalping & Liquidity',
        shortDescription: 'Master institutional liquidity concepts, order blocks, and high-probability scalping strategies with senior QuickX traders.',
        description: `Join us for an intensive 2-hour live session where our senior analysts break down real-time market movements, institutional liquidity grabs, and optimal trade entries.

What You Will Learn:
- Identifying High-Probability Order Blocks
- Fair Value Gaps (FVG) and Market Structure Shifts
- Managing Drawdown & Position Sizing
- Live Q&A and trade setup reviews

Perfect for intermediate and advancing traders wanting to elevate their consistency.`,
        category: 'Trading',
        eventType: 'online',
        venue: 'Virtual (Zoom Live Stream)',
        location: '',
        meetingLink: 'https://meet.quickxlearn.com/forex-live',
        startDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
        endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 3 * 3600 * 1000),
        time: '6:30 PM - 8:30 PM GMT',
        coverImage: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80',
        organizer: {
            name: 'QuickX Trading Academy',
            email: 'trading@quickxlearn.com',
            phone: '+233 55 903 7872',
            avatar: ''
        },
        isFree: true,
        price: 0,
        currency: 'GHS',
        capacity: 300,
        ticketsSold: 42,
        status: 'published',
        tags: ['Forex', 'Scalping', 'Price Action', 'Trading', 'Live'],
        speakers: [
            {
                name: 'Kofi Mensah',
                title: 'Head of Technical Analysis',
                bio: '7+ years experienced institutional forex trader & mentor.',
                avatar: ''
            }
        ]
    },
    {
        title: 'Algorithmic & AI Trading Intensive 2026',
        shortDescription: 'Build, backtest, and automate algorithmic trading models using Python, Pine Script, and AI indicators.',
        description: `Unlock the future of finance with quantitative algorithmic trading. In this full-day masterclass, you will learn how to turn proven trading strategies into automated algorithms.

Key Modules:
- Introduction to Quantitative Trading
- Backtesting with VectorBT & Python
- Setting up automated Webhooks with MT5 and TradingView
- Risk management automation & stop-out safeguards
- AI-driven sentiment analysis integration

Attendees will receive starter source code scripts, lifetime access to session recordings, and priority Discord support.`,
        category: 'Workshop',
        eventType: 'online',
        venue: 'Virtual (Google Meet & Private GitHub Repo)',
        location: '',
        meetingLink: 'https://meet.quickxlearn.com/algo-trading',
        startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 5 * 3600 * 1000),
        time: '10:00 AM - 3:00 PM GMT',
        coverImage: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=1200&q=80',
        organizer: {
            name: 'QuickX AI & Quant Labs',
            email: 'quant@quickxlearn.com',
            phone: '+233 55 903 7872',
            avatar: ''
        },
        isFree: false,
        price: 150,
        currency: 'GHS',
        capacity: 100,
        ticketsSold: 18,
        status: 'published',
        tags: ['AI Trading', 'Python', 'Algorithms', 'Automation', 'PineScript'],
        speakers: [
            {
                name: 'Dr. Kwame Addo',
                title: 'Quantitative Finance Lead',
                bio: 'Specialist in quantitative strategies and AI risk mitigation.',
                avatar: ''
            }
        ]
    },
    {
        title: 'Accra Tech & Web3 Developers Summit',
        shortDescription: 'The premier annual gathering of African builders, fintech architects, and web3 creators.',
        description: `Join 250+ software engineers, product founders, and crypto innovators in Accra for a day of keynote talks, live hack demos, and high-impact networking.

Agenda:
- Keynotes from leading West African fintech founders
- Hands-on workshops: Modern React Native, Cloud Native Architecture & Smart Contracts
- Pitch arena and talent recruitment networking
- Catered lunch and evening mixer cocktail

Physical badge, welcome gift bag, and digital certification included with ticket.`,
        category: 'Conference',
        eventType: 'hybrid',
        venue: 'Accra Digital Centre, Ring Road West, Accra',
        location: 'Accra Digital Centre, Accra, Ghana',
        meetingLink: 'https://meet.quickxlearn.com/accra-summit-live',
        startDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000), // 18 days from now
        endDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000 + 8 * 3600 * 1000),
        time: '9:00 AM - 5:00 PM GMT',
        coverImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80',
        organizer: {
            name: 'QuickX Developers Ecosystem',
            email: 'community@quickxlearn.com',
            phone: '+233 55 903 7872',
            avatar: ''
        },
        isFree: false,
        price: 250,
        currency: 'GHS',
        capacity: 250,
        ticketsSold: 64,
        status: 'published',
        tags: ['Tech', 'Conference', 'Accra', 'Web3', 'Networking', 'Coding'],
        speakers: [
            {
                name: 'Nana Yaw Osei',
                title: 'Principal Software Architect',
                bio: 'Fintech builder & open-source contributor.',
                avatar: ''
            }
        ]
    },
    {
        title: 'Crypto Portfolio Building & Risk Management',
        shortDescription: 'Free community session on identifying fundamental crypto gems and safeguarding your digital assets.',
        description: `Navigate market cycles with confidence. Learn how seasoned investors allocate portfolios between Bitcoin, Layer-1s, DePIN, and high-conviction narratives without risking total capital loss.

Session Highlights:
- Cycle analysis and macro indicators
- Cold storage best practices & hardware wallet security
- On-chain metrics that actually matter
- Q&A with QuickX crypto mentors`,
        category: 'Webinar',
        eventType: 'online',
        venue: 'Virtual (YouTube Private Stream)',
        location: '',
        meetingLink: 'https://meet.quickxlearn.com/crypto-gems',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 3600 * 1000),
        time: '7:00 PM - 9:00 PM GMT',
        coverImage: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?auto=format&fit=crop&w=1200&q=80',
        organizer: {
            name: 'QuickX Crypto Club',
            email: 'crypto@quickxlearn.com',
            phone: '+233 55 903 7872',
            avatar: ''
        },
        isFree: true,
        price: 0,
        currency: 'GHS',
        capacity: 500,
        ticketsSold: 89,
        status: 'published',
        tags: ['Crypto', 'Bitcoin', 'Portfolio', 'Risk Management', 'Free'],
        speakers: [
            {
                name: 'Selorm Mensah',
                title: 'Crypto Research Lead',
                bio: 'DeFi researcher and crypto strategist.',
                avatar: ''
            }
        ]
    }
];

async function seedEvents() {
    try {
        const count = await Event.countDocuments();
        if (count === 0) {
            await Event.insertMany(DEFAULT_EVENTS);
            console.log(`[seedEvents] Seeded ${DEFAULT_EVENTS.length} initial events.`);
        }
    } catch (error) {
        console.error('[seedEvents] Error seeding events:', error.message);
    }
}

module.exports = { seedEvents, DEFAULT_EVENTS };
