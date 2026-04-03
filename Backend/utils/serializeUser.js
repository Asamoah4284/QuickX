function serializeUser(user) {
    if (!user) return null;

    return {
        id: user._id || user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role || 'student',
        creatorStatus: user.creatorStatus || 'not_applied',
        phone: user.phone || '',
        country: user.country || '',
        avatar: user.avatar || user.profilePicture || '',
        profilePicture: user.profilePicture || user.avatar || '',
        creatorHeadline: user.creatorHeadline || '',
        creatorBio: user.creatorBio || '',
        expertise: Array.isArray(user.expertise) ? user.expertise : [],
        languagesSpoken: Array.isArray(user.languagesSpoken) ? user.languagesSpoken : [],
        socialLinks: user.socialLinks || {},
        subscriptionStatus: user.subscriptionStatus || 'none'
    };
}

module.exports = { serializeUser };
