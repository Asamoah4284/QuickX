require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const User = require('../models/User');

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    const targetEmail = 'stepperdek1212@gmail.com';
    const user = await User.findOne({ email: targetEmail });
    if (user) {
        user.isVerified = true;
        user.role = 'admin';
        await user.save();
        console.log('User document updated to role=admin, isVerified=true');
    }

    const defaultPassword = 'admin123';
    const permissions = ['create_course', 'edit_course', 'delete_course', 'manage_users', 'manage_payments'];

    let adminRecord = await Admin.findOne({ email: targetEmail.toLowerCase() });
    if (adminRecord) {
        adminRecord.fullName = 'Clement Obeng';
        adminRecord.role = 'superadmin';
        adminRecord.password = defaultPassword;
        adminRecord.permissions = permissions;
        await adminRecord.save();
        console.log('Admin document updated for:', targetEmail);
    } else {
        adminRecord = new Admin({
            email: targetEmail.toLowerCase(),
            password: defaultPassword,
            fullName: 'Clement Obeng',
            role: 'superadmin',
            permissions: permissions
        });
        await adminRecord.save();
        console.log('Admin document created for:', targetEmail, 'with password:', defaultPassword);
    }

    const allAdmins = await Admin.find({}).lean();
    console.log('All admins in DB now:');
    allAdmins.forEach(a => console.log(`- Email: ${a.email}, Role: ${a.role}, Name: ${a.fullName}`));

    await mongoose.disconnect();
    console.log('Done successfully');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
