const CartItem = require('../models/cartItem.model');
const Product = require('../models/product.model');
const sequelize = require('../config/db');
const Order = require('../models/order.model');
const OrderItem = require('../models/orderItem.model');

// Add item to cart
exports.addToCart = async (req, res) => {
  try {
    const { userId, productId, quantity = 1 } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({ status: 'error', message: 'userId and productId are required' });
    }

    const product = await Product.findOne({ where: { id: productId, status: 'active' } });
    if (!product) return res.status(404).json({ status: 'error', message: 'Product not found' });

    let cartItem = await CartItem.findOne({ where: { userId, productId, status: 'active' } });

    if (cartItem) {
      cartItem.quantity += parseInt(quantity);
      cartItem.total_price = cartItem.quantity * parseFloat(cartItem.price);
      await cartItem.save();
    } else {
      cartItem = await CartItem.create({
        userId,
        productId,
        quantity: parseInt(quantity),
        price: parseFloat(product.price),
        total_price: parseInt(quantity) * parseFloat(product.price),
        status: 'active'
      });
    }

    res.status(200).json({ status: 'success', message: 'Item added to cart', data: cartItem });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Failed to add item to cart' });
  }
};

// Get all cart items for a user
exports.getCartItems = async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) return res.status(400).json({ status: 'error', message: 'userId is required' });
  
      const cartItems = await sequelize.query(
        `
        SELECT 
          c.id AS cartItemId,
          c.productId,
          c.quantity,
          c.price AS cart_price,
          c.total_price,
          p.heading AS product_name,
          p.price AS product_price,
          p.mrp AS product_mrp,
          p.brand AS product_brand,
          p.item AS product_item,
          p.product_type,
          -- Get all active images for this product
          IFNULL(GROUP_CONCAT(pi.image_url ORDER BY pi.is_primary DESC SEPARATOR ','), '') AS images
        FROM cart_items c
        JOIN products p ON p.id = c.productId
        LEFT JOIN product_images pi ON pi.productId = p.id AND pi.status = 'active'
        WHERE c.userId = :userId AND c.status = 'active'
        GROUP BY c.id
        `,
        {
          replacements: { userId },
          type: sequelize.QueryTypes.SELECT
        }
      );
  
      // Convert images from comma-separated string to array
      const formattedCartItems = cartItems.map(item => ({
        ...item,
        images: item.images ? item.images.split(',') : []
      }));
  
      res.status(200).json({ status: 'success', data: formattedCartItems });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 'error', message: 'Failed to get cart items' });
    }
  };
  

// Update quantity of a cart item
exports.updateCartItem = async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;
    if (!userId || !productId || !quantity) {
      return res.status(400).json({ status: 'error', message: 'userId, productId and quantity are required' });
    }

    const cartItem = await CartItem.findOne({ where: { userId, productId, status: 'active' } });
    if (!cartItem) return res.status(404).json({ status: 'error', message: 'Cart item not found' });

    cartItem.quantity = parseInt(quantity);
    cartItem.total_price = cartItem.quantity * parseFloat(cartItem.price);
    await cartItem.save();

    res.status(200).json({ status: 'success', message: 'Cart item updated', data: cartItem });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Failed to update cart item' });
  }
};

// Remove item from cart
exports.removeCartItem = async (req, res) => {
  try {
    const { userId, productId } = req.body;
    if (!userId || !productId) return res.status(400).json({ status: 'error', message: 'userId and productId are required' });

    const cartItem = await CartItem.findOne({ where: { userId, productId, status: 'active' } });
    if (!cartItem) return res.status(404).json({ status: 'error', message: 'Cart item not found' });

    await cartItem.destroy();
    res.status(200).json({ status: 'success', message: 'Cart item removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Failed to remove cart item' });
  }
};

// Clear cart for a user
exports.clearCart = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ status: 'error', message: 'userId is required' });

    await CartItem.destroy({ where: { userId, status: 'active' } });

    res.status(200).json({ status: 'success', message: 'Cart cleared' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Failed to clear cart' });
  }
};

// Checkout
exports.checkout = async (req, res) => {
    const { userId } = req.body;
  
    const t = await sequelize.transaction();
  
    try {
      // 1. Get active cart items and their products manually
      const cartItems = await CartItem.findAll({
        where: { userId, status: 'active' },
        raw: true
      });
  
      if (!cartItems.length) return res.status(400).json({ message: 'Cart is empty' });
  
      // 2. Fetch products for these cart items
      const productIds = cartItems.map(item => item.productId);
      const products = await Product.findAll({
        where: { id: productIds },
        raw: true
      });
  
      // 3. Map products by ID for easy lookup
      const productMap = {};
      products.forEach(p => { productMap[p.id] = p; });
  
      // 4. Calculate total and check stock
      let totalAmount = 0;
      for (let item of cartItems) {
        const product = productMap[item.productId];
        if (!product) throw new Error(`Product not found: ${item.productId}`);
        if (item.quantity > product.stock_quantity) {
          throw new Error(`Insufficient stock for product ${product.heading}`);
        }
        totalAmount += parseFloat(item.total_price);
      }
  
      // 5. Create Order
      const order = await Order.create({
        userId,
        total_amount: totalAmount,
        payment_status: 'pending',
        shipping_address: req.body.shipping_address,
        billing_address: req.body.billing_address,
        status: 'pending'
      }, { transaction: t });
  
      // 6. Create Order Items and reduce stock
      for (let item of cartItems) {
        const product = productMap[item.productId];
  
        await OrderItem.create({
          order_id: order.id,
          product_id: item.productId,
          quantity: item.quantity,
          price: item.price,
          total: item.total_price,
          product_details: {
            heading: product.heading,
            brand: product.brand,
            product_type: product.product_type
          }
        }, { transaction: t });
  
        // Reduce product stock
        await Product.update(
          { stock_quantity: product.stock_quantity - item.quantity },
          { where: { id: product.id }, transaction: t }
        );
      }
  
      // 7. Mark cart items as ordered
      await CartItem.update(
        { status: 'ordered' },
        { where: { userId, status: 'active' }, transaction: t }
      );
  
      await t.commit();
      res.status(200).json({ message: 'Order placed successfully', orderId: order.id });
  
    } catch (err) {
      await t.rollback();
      res.status(500).json({ message: err.message });
    }
  };
  
