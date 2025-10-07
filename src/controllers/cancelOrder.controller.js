const CancelOrder = require('../models/cancelOrder.model');
const Order = require('../models/order.model');
const User = require('../models/user.model');

//Get all cancel orders (optional: filter by userId or orderId)
exports.getAllCancelOrders = async (req, res) => {
  try {
    const { userId, orderId } = req.query;
    const where = {};
    if (userId) where.userId = userId;
    if (orderId) where.orderId = orderId;

    const cancelOrders = await CancelOrder.findAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Order, as: 'order', attributes: ['id', 'total_amount', 'status'] }
      ],
      order: [['cancelled_at', 'DESC']]
    });

    return res.status(200).json({
      status: 'success',
      message: 'Cancel orders fetched successfully',
      data: cancelOrders
    });
  } catch (error) {
    console.error('Error fetching cancel orders:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch cancel orders', error: error.message });
  }
};

//Add a cancel order request
exports.addCancelOrder = async (req, res) => {
  try {
    const { orderId, userId, reason } = req.body;

    if (!orderId || !userId) {
      return res.status(400).json({ status: 'error', message: 'orderId and userId are required' });
    }

    // Optional: Check if order exists
    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Order not found' });
    }

    const cancelOrder = await CancelOrder.create({ orderId, userId, reason });

    return res.status(201).json({
      status: 'success',
      message: 'Cancel order request submitted successfully',
      data: cancelOrder
    });
  } catch (error) {
    console.error('Error adding cancel order:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to submit cancel order', error: error.message });
  }
};

//Update cancel order status by ID
exports.updateCancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const cancelOrder = await CancelOrder.findByPk(id);
    if (!cancelOrder) {
      return res.status(404).json({ status: 'error', message: 'Cancel order not found' });
    }

    await cancelOrder.update({ status, reason });

    return res.status(200).json({
      status: 'success',
      message: 'Cancel order updated successfully',
      data: cancelOrder
    });
  } catch (error) {
    console.error('Error updating cancel order:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to update cancel order', error: error.message });
  }
};

//Delete cancel order by ID
exports.deleteCancelOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const cancelOrder = await CancelOrder.findByPk(id);
    if (!cancelOrder) {
      return res.status(404).json({ status: 'error', message: 'Cancel order not found' });
    }

    await cancelOrder.destroy();

    return res.status(200).json({ status: 'success', message: 'Cancel order deleted successfully' });
  } catch (error) {
    console.error('Error deleting cancel order:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to delete cancel order', error: error.message });
  }
};
