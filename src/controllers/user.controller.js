const User = require('../models/user.model');
const Product = require('../models/product.model');
const ProductImage = require('../models/productImage.model');
const Order = require('../models/order.model');
const OrderItem = require('../models/orderItem.model');
const sequelize = require('../config/db');


//  Get user details by userId
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ status: 'error', message: 'User ID is required' });
    }

    const user = await User.findByPk(userId, {
      attributes: ['id', 'userType', 'firstName', 'lastName', 'email', 'notificationSetting', 'photo', 'status', 'phone']
    });

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    const profileInfo = {};
    if (user.userType === 'customer') {
      console.log("I am customer ")
      profileInfo.totalSaving =  await getTotalSavings(userId); // Assuming a method to get total savings
      profileInfo.totalOrders =  await getTotalOrders(userId); // Assuming a method to get total orders
      profileInfo.avgDevelaryTIme =  30; // Assuming a method to get total ratings
    } else if (user.userType === 'vendor') {
      profileInfo.totalOrders =  await user.getTotalOrders(userId); // Assuming a method to get total orders
    }

    return res.status(200).json({
      status: 'success',
      message: 'User details fetched successfully',
      data: { user, profile: profileInfo }
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch user', error: error.message });
  }
};
const getTotalSavings = async (userId) => {
  try {
    const [results] = await sequelize.query(
      `
      SELECT 
        SUM((p.mrp - p.price) * oi.quantity) AS totalSavings
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.userId = :userId
      `,
      {
        replacements: { userId },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    return results?.totalSavings || 0;
  } catch (error) {
    console.error('Error calculating total savings:', error);
    return 0;
  }
};

const getTotalOrders = async (userId) => {
  try {
    const [results] = await sequelize.query(
      `
      SELECT COUNT(*) AS totalOrders
      FROM orders
      WHERE userId = :userId
      `,
      {
        replacements: { userId },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    return results?.totalOrders || 0;
  } catch (error) {
    console.error('Error fetching total orders:', error);
    return 0;
  }
};


// Update user details by userId
exports.updateUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, email, notificationSetting, photo, status } = req.body;

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
      notificationSetting: notificationSetting ?? user.notificationSetting,
      photo: photo ?? user.photo,
      status: status ?? user.status,
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
