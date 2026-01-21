const User = require('../models/User');
const jwt = require('jsonwebtoken');

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

exports.register = async (req, res) => {
    try {
        const { name, email, password, role, employeeType } = req.body;

        // Check for creator (Logged in user creating another user)
        let createdBy = undefined;
        let creatorRole = undefined;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            try {
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const creator = await User.findById(decoded.id);
                if (creator) {
                    createdBy = creator._id;
                    creatorRole = creator.role;
                }
            } catch (error) {
                // Invalid token
            }
        }

        // STRICT ADMIN ONLY:
        // Only Admin can create users. Public registration is DISABLED.
        if (creatorRole !== 'admin') {
            return res.status(403).json({
                status: 'fail',
                message: 'Access denied. Only Admins can create new users.'
            });
        }

        const userRole = role || 'engineer';

        const user = await User.create({
            name,
            email,
            password,
            role: userRole,
            employeeType: userRole === 'employee' ? employeeType : undefined,
            createdBy
        });
        const token = signToken(user._id);

        res.status(201).json({
            status: 'success',
            token,
            data: { user }
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};


exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Incorrect email or password' });
        }

        const token = signToken(user._id);
        res.status(200).json({
            status: 'success',
            token,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    employeeType: user.employeeType,
                    profileImage: user.profileImage || null,
                    phoneNumber: user.phoneNumber || '',
                    address: user.address || '',
                    city: user.city || '',
                    state: user.state || '',
                    zipCode: user.zipCode || '',
                    createdBy: user.createdBy
                }
            }
        });
    } catch (err) {
        res.status(400).json({ status: 'info', message: err.message });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const { role } = req.query;
        let filter = role ? { role } : {};

        // If Engineer, only show Clients created by them. Employees are visible to all.
        if (req.user.role === 'engineer' && role === 'client') {
            filter.createdBy = req.user.id;
        }

        const users = await User.find(filter).select('-password');
        res.status(200).json({
            status: 'success',
            data: { users }
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, profileImage, phoneNumber, address, city, state, zipCode, password } = req.body;

        // Permission Check: Allow if user is updating their own profile OR user is an engineer
        if (req.user.id !== id && req.user.role !== 'engineer' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update this profile' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Only allow changing name/email/etc if it's provided
        if (name) user.name = name;
        if (email) user.email = email;
        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (address) user.address = address;
        if (city) user.city = city;
        if (state) user.state = state;
        if (zipCode) user.zipCode = zipCode;

        // Handle Password Update (For Engineer resetting paswords)
        if (password && password.trim().length > 0) {
            user.password = password; // Will be hashed by pre-save hook
        }

        if (req.file) {
            // Save relative path
            user.profileImage = `uploads/${req.file.filename}`;
        } else if (profileImage) {
            // Allow updating via URL string if provided and no file uploaded
            user.profileImage = profileImage;
        }

        await user.save();

        // If updating self, generate new token. If updating others (as engineer), don't need to return token?? 
        // Actually, the frontend expects a token update if it's the current user, but if we are editing someone else, we shouldn't change OUR token.
        // Let's return the token ONLY if we are updating ourselves.

        let token = undefined;
        if (req.user.id === id) {
            token = signToken(user._id);
        }

        res.status(200).json({
            status: 'success',
            token, // Will be undefined if updating another user, which is fine
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    employeeType: user.employeeType,
                    profileImage: user.profileImage,
                    phoneNumber: user.phoneNumber,
                    address: user.address,
                    city: user.city,
                    state: user.state,
                    zipCode: user.zipCode
                }
            }
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.status(200).json({
            status: 'success',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    employeeType: user.employeeType,
                    profileImage: user.profileImage,
                    phoneNumber: user.phoneNumber,
                    address: user.address,
                    city: user.city,
                    state: user.state,
                    zipCode: user.zipCode
                }
            }
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const userToDelete = await User.findById(req.params.id);

        if (!userToDelete) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Permission Logic
        // Admin: Can delete anyone (except maybe themselves, but let's allow it or handle in frontend)
        // Engineer: Can delete Clients & Employees. CANNOT delete Admin or other Engineers.

        if (req.user.role === 'engineer') {
            if (userToDelete.role === 'admin' || userToDelete.role === 'engineer') {
                return res.status(403).json({ message: 'Engineers cannot delete Admins or other Engineers' });
            }
        }

        await User.findByIdAndDelete(req.params.id);

        res.status(204).json({
            status: 'success',
            data: null
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};
