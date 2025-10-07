const User = require('../models/user.model');

//  Get user details by userId
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ status: 'error', message: 'User ID is required' });
    }

    const user = await User.findByPk(userId, {
      attributes: ['id', 'firstName', 'lastName', 'email', 'notificationSetting', 'phone', 'status']
    });

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    return res.status(200).json({
      status: 'success',
      message: 'User details fetched successfully',
      data: user
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch user', error: error.message });
  }
};

// Update user details by userId
exports.updateUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, email, notificationSetting } = req.body;

    if (!userId) {
      return res.status(400).json({ status: 'error', message: 'User ID is required' });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    // Update only the provided fields
    await user.update({
      firstName: firstName ?? user.firstName,
      lastName: lastName ?? user.lastName,
      email: email ?? user.email,
      notificationSetting: notificationSetting ?? user.notificationSetting
    });

    return res.status(200).json({
      status: 'success',
      message: 'User updated successfully',
      data: user
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to update user', error: error.message });
  }
};
