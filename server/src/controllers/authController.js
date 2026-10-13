import { User } from '../models/User.js';
import { generateToken, setAuthCookie, clearAuthCookie } from '../security/jwt.js';
import { generateCsrfToken, setCsrfCookie } from '../security/csrf.js';
import { logAuditEvent } from '../security/auditService.js';

/**
 * Handle User Login
 */
export async function login(req, res) {
  const { email, password } = req.body;

  try {
    // Select password explicitly since it's excluded by default in model
    const user = await User.findOne({ email }).select('+password');

    // Generic error message to prevent user enumeration
    if (!user || !user.isActive) {
      await logAuditEvent({
        req,
        actor: { email, role: 'unknown' },
        action: 'AUTH_LOGIN_FAILED',
        resourceType: 'User',
        details: { email, reason: !user ? 'User not found' : 'Account deactivated' },
        status: 'FAILURE',
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await logAuditEvent({
        req,
        actor: user,
        action: 'AUTH_LOGIN_FAILED',
        resourceType: 'User',
        resourceId: user._id,
        details: { email, reason: 'Password mismatch' },
        status: 'FAILURE',
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT and CSRF tokens
    const token = generateToken(user);
    const csrfToken = generateCsrfToken();

    setAuthCookie(res, token);
    setCsrfCookie(res, csrfToken);

    await logAuditEvent({
      req,
      actor: user,
      action: 'AUTH_LOGIN_SUCCESS',
      resourceType: 'User',
      resourceId: user._id,
      details: { email: user.email, role: user.role },
      status: 'SUCCESS',
    });

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: user.toSafeJSON(),
      csrfToken,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error during login processing.',
    });
  }
}

/**
 * Handle User Logout
 */
export async function logout(req, res) {
  try {
    if (req.user) {
      await logAuditEvent({
        req,
        actor: req.user,
        action: 'AUTH_LOGOUT',
        resourceType: 'User',
        resourceId: req.user._id,
        status: 'SUCCESS',
      });
    }

    clearAuthCookie(res);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error during logout.',
    });
  }
}

/**
 * Get currently authenticated user profile
 */
export async function getCurrentUser(req, res) {
  res.status(200).json({
    success: true,
    user: req.user.toSafeJSON(),
  });
}

/**
 * Issue fresh CSRF token
 */
export async function getCsrfToken(req, res) {
  const token = generateCsrfToken();
  setCsrfCookie(res, token);
  res.status(200).json({
    success: true,
    csrfToken: token,
  });
}

/**
 * Change current user password
 */
export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password.' });
    }

    user.password = newPassword;
    await user.save();

    await logAuditEvent({
      req,
      actor: user,
      action: 'AUTH_PASSWORD_CHANGE',
      resourceType: 'User',
      resourceId: user._id,
      status: 'SUCCESS',
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating password.' });
  }
}

/**
 * List all users (Admin only)
 */
export async function getAllUsers(req, res) {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching users.' });
  }
}

/**
 * Create new user (Admin only)
 */
export async function createUser(req, res) {
  const { name, email, password, role } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'User with this email already exists.' });
    }

    const newUser = new User({ name, email, password, role });
    await newUser.save();

    await logAuditEvent({
      req,
      actor: req.user,
      action: 'USER_CREATED',
      resourceType: 'User',
      resourceId: newUser._id,
      details: { createdEmail: email, assignedRole: role },
      status: 'SUCCESS',
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      user: newUser.toSafeJSON(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating user.' });
  }
}

/**
 * Update user role or status (Admin only)
 */
export async function updateUserRole(req, res) {
  const { id } = req.params;
  const { role, isActive } = req.body;

  try {
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Prevent demoting the logged-in admin if they are the only active admin
    if (req.user._id.toString() === id && role && role !== 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot demote the only remaining active administrator.',
        });
      }
    }

    const beforeState = { role: targetUser.role, isActive: targetUser.isActive };

    if (role) targetUser.role = role;
    if (typeof isActive === 'boolean') targetUser.isActive = isActive;

    await targetUser.save();

    await logAuditEvent({
      req,
      actor: req.user,
      action: 'USER_ROLE_UPDATED',
      resourceType: 'User',
      resourceId: targetUser._id,
      details: { before: beforeState, after: { role: targetUser.role, isActive: targetUser.isActive } },
      status: 'SUCCESS',
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      user: targetUser.toSafeJSON(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating user.' });
  }
}
