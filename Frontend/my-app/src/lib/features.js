import { FiPlayCircle, FiActivity, FiUsers, FiTarget } from 'react-icons/fi';

/** The four things a member can have. Keys match the backend (constants/features.js). */
export const FEATURES = {
  courses: {
    key: 'courses',
    label: 'Courses',
    icon: FiPlayCircle,
    path: '/courses',
    productKey: 'courses',
    blurb: 'Step-by-step video lessons you can watch online or download for later.',
  },
  signals: {
    key: 'signals',
    label: 'Signals',
    icon: FiActivity,
    path: '/signals',
    productKey: 'signals',
    blurb: 'Live trade ideas with entry, stop loss and targets, sent to your phone.',
  },
  community: {
    key: 'community',
    label: 'Community',
    icon: FiUsers,
    path: '/community',
    productKey: 'community',
    blurb: 'Ask questions, share your trades and learn alongside other members.',
  },
  mentorship: {
    key: 'mentorship',
    label: 'Mentorship',
    icon: FiTarget,
    path: '/mentorship',
    productKey: 'mentorship',
    blurb: '1-on-1 sessions and direct guidance from Maxwell.',
  },
};

export const FEATURE_LIST = Object.values(FEATURES);
