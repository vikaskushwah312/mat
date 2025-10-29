const User = require('../models/user.model');
const Product = require('../models/product.model');
const ProductImage = require('../models/productImage.model');
const sequelize = require('../config/db');
const Order = require('../models/order.model');
const OrderItem = require('../models/orderItem.model');
const AdminProductImage = require('../models/admin_product_images.model');
require('dotenv').config();

// Upload product images
exports.uploadProductImages = async (req, res) => {
    try {
      // The files and form data are already processed by multer middleware
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const userId = req.body.userId || 'default';
      const productId = req.body.productId; // Get productId from form data if provided
  
      // Get the uploaded files
      const files = req.files || [];
  
      if (files.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'No files were uploaded.'
        });
      }
  
      // Create array of image URLs and file info
      const uploadedImages = files.map(file => {
        const imageUrl = `${baseUrl}/uploads/products/${userId}/${file.filename}`;
        return {
          url: imageUrl,
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          // Add productId to each image if provided
          ...(productId && { productId })
        };
      });
  
      // Here you could save the image references to your database
      // Example: await ProductImage.bulkCreate(uploadedImages);
  
      res.status(200).json({
        status: 'success',
        message: 'Product images uploaded successfully!',
        images: uploadedImages
      });
  
    } catch (error) {
      console.error('Upload product images error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to upload product images',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
      });
    }
  };


  // Add a new product
exports.addProduct = async (req, res) => {
    try {
      const {
        userId,
        heading,
        productImageUrl,
        sub_heading,
        details,
        price,
        mrp,
        specification,
        product_type,
        brand,
        item,
        status = 'active',
        stock_quantity = 0,
        images = [] // optional array of image URLs
      } = req.body;
  
      // Basic validation
      if (!userId || !heading || !price || !mrp || !product_type || !brand || !item) {
        return res.status(400).json({
          status: 'error',
          message: 'Required fields: userId, heading, price, mrp, product_type, brand, item'
        });
      }
      
      const user = await User.findByPk(userId);

      // Create the product
      const product = await Product.create({
        userId,
        productImageUrl,
        userType:user?.userType,
        heading,
        sub_heading: sub_heading || null,
        details: details || null,
        price,
        mrp,
        specification: specification ? JSON.stringify(specification) : null,
        product_type,
        brand,
        item,
        status,
        stock_quantity
      });
  
      // If images array is provided, save them in ProductImage table
      if (images.length > 0) {
        const imageData = images.map((url, index) => ({
          productId: product.id,
          image_url: url,
          is_primary: index === 0 ? true : false, // first image primary
          display_order: index,
          status: 'active'
        }));
        await ProductImage.bulkCreate(imageData);
      }
  
      res.status(201).json({
        status: 'success',
        message: 'Product added successfully',
        data: { productId: product.id }
      });
  
    } catch (error) {
      console.error('Add product error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to add product',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
      });
    }
};

// controllers/product.controller.js

exports.updateProduct = async (req, res) => {
    try {
      const {
        productId,
        heading,
        productImageUrl,
        sub_heading,
        details,
        price,
        mrp,
        specification,
        product_type,
        brand,
        item,
        status,
        stock_quantity,
        images = []
      } = req.body;
  
      // Basic validation
      if (!productId) {
        return res.status(400).json({
          status: 'error',
          message: 'Product ID is required'
        });
      }
  
      // Find the existing product
      const product = await Product.findByPk(productId);
      if (!product) {
        return res.status(404).json({
          status: 'error',
          message: 'Product not found'
        });
      }
  
      // Update only provided fields
      product.productImageUrl = productImageUrl || product.productImageUrl;
      product.heading = heading || product.heading;
      product.sub_heading = sub_heading || product.sub_heading;
      product.details = details || product.details;
      product.price = price || product.price;
      product.mrp = mrp || product.mrp;
      product.specification = specification
        ? JSON.stringify(specification)
        : product.specification;
      product.product_type = product_type || product.product_type;
      product.brand = brand || product.brand;
      product.item = item || product.item;
      product.status = status || product.status;
      product.stock_quantity =
        typeof stock_quantity !== 'undefined'
          ? stock_quantity
          : product.stock_quantity;
  
      await product.save();
  
      // Update product images if provided
      if (images.length > 0) {
        // Remove old images
        await ProductImage.destroy({ where: { productId: product.id } });
  
        // Add new images
        const imageData = images.map((url, index) => ({
          productId: product.id,
          image_url: url,
          is_primary: index === 0 ? true : false,
          display_order: index,
          status: 'active'
        }));
  
        await ProductImage.bulkCreate(imageData);
      }
  
      res.status(200).json({
        status: 'success',
        message: 'Product updated successfully',
        data: { productId: product.id }
      });
  
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update product',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
      });
    }
  };
  

// Get single product by ID
exports.getProductById = async (req, res) => {
    try {
      const { id } = req.params; // product ID from route
  
      if (!id) {
        return res.status(400).json({ status: 'error', message: 'Product ID is required' });
      }
  
      const query = `
        SELECT 
          p.id,
          p.userId,
          p.heading AS name,
          p.sub_heading,
          p.details AS description,
          p.price,
          p.mrp,
          p.specification,
          p.product_type,
          p.brand,
          p.item,
          p.status,
          p.productImageUrl,
          GROUP_CONCAT(pi.image_url ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.id ASC) AS images
        FROM products p
        LEFT JOIN product_images pi
          ON pi.productId = p.id AND pi.status = 'active'
        WHERE p.id = :id AND p.status = 'active'
        GROUP BY p.id
        LIMIT 1
      `;
  
      const [product] = await sequelize.query(query, {
        replacements: { id },
        type: sequelize.QueryTypes.SELECT
      });
  
      if (!product) {
        return res.status(404).json({ status: 'error', message: 'Product not found' });
      }
  
      // Format product
      const formattedProduct = {
        id: product.id,
        name: product.name,
        sub_heading: product.sub_heading,
        description: product.description,
        price: parseFloat(product.price),
        mrp: parseFloat(product.mrp || product.price),
        specification: product.specification,
        discount: product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0,
        product_type: product.product_type,
        brand: product.brand,
        item: product.item,
        status: product.status,
        productImageUrl: product.productImageUrl,
        images: product.images ? product.images.split(',') : []
      };
  
      res.status(200).json({
        status: 'success',
        data: formattedProduct
      });
  
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch product',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
      });
    }
  };


  // Get all products by user Id
exports.getAllProducts = async (req, res) => {
    try {
      const { 
        userType,
        userId,
        page = 1, 
        limit = 10, 
        product_type, 
        item,
        brand, 
        price, 
        // maxPrice, 
        search, 
        sortBy = 'created_at', 
        order = 'DESC' 
      } = req.query;
      const offset = (page - 1) * limit;
  
      // Build WHERE clause
      let whereClause = `WHERE p.status = 'active'`;
      const replacements = {};

    if (userType && userType.trim() !== "") {
        whereClause += ` AND p.userType = :userType`;
        replacements.userType = userType.trim();
    }     

    if (userId && userId.trim() !== "" && userId.trim() !== '""') {
        whereClause += ` AND p.userId = :userId`;
        replacements.userId = userId;
    }

    if (product_type && product_type.trim() !== "" && product_type.trim() !== '""') {
        whereClause += ` AND TRIM(p.product_type) = :product_type`;
        replacements.product_type = product_type.trim();
    }
    
    if (item && item.trim() !== "" && item.trim() !== '""') {
        const cleanItem = item.trim().replace(/^['"]+|['"]+$/g, '').trim(); // remove quotes
      
        whereClause += ` AND LOWER(TRIM(p.item)) LIKE :item`;
        replacements.item = `${cleanItem.toLowerCase()}%`; // starts with given text
      }   
      
      // sanitize brand from query
      let brandRaw = req.query?.brand;           
      let brandClean = '';
  
      if (typeof brandRaw !== 'undefined' && brandRaw !== null) {
        brandClean = String(brandRaw).trim();
  
        // Remove surrounding single or double quotes (and any extras)
        // e.g. '"Greenply"' -> 'Greenply',  '""' -> ''
        brandClean = brandClean.replace(/^['"]+|['"]+$/g, '').trim();
  
        // Optionally decode URI components if frontend double-encodes
        try { brandClean = decodeURIComponent(brandClean); } catch (e) { /* ignore */ }
  
        // final trim after decode
        brandClean = brandClean.trim();
      }
  
      // Only add the brand WHERE clause when cleaned value is non-empty
      if (brandClean.length > 0) {
        whereClause += ` AND LOWER(TRIM(p.brand)) = :brand`;
        replacements.brand = brandClean.toLowerCase();
      }
      // Price filters
      // Always filter price > 0
      whereClause += ` AND p.price >= 0`;
  
      if (price) {
        whereClause += ` AND p.price <= :price`;
        replacements.price = parseFloat(price);
      }
  
      console.log("whereClause", whereClause);
      console.log("replacements", replacements);
      // if (search) {
      //   whereClause += ` AND (p.heading LIKE :search OR p.sub_heading LIKE :search OR p.details LIKE :search)`;
      //   replacements.search = `%${search}%`;
      // }
  
      // Sorting
      let orderBy = `ORDER BY p.created_at DESC`;
      if (['price', 'created_at'].includes(sortBy)) {
        orderBy = `ORDER BY p.${sortBy} ${order}`;
      }
  
      // SQL query with GROUP_CONCAT to get all images
      const query = `
        SELECT 
          p.id,
          p.userId,
          p.heading AS name,
          p.sub_heading,
          p.details AS description,
          p.price,
          p.mrp,
          p.specification,
          p.product_type,
          p.brand,
          p.item,
          p.status,
          p.productImageUrl,
          GROUP_CONCAT(pi.image_url ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.id ASC) AS images
        FROM products p
        LEFT JOIN product_images pi
          ON pi.productId = p.id AND pi.status = 'active'
        ${whereClause}
        GROUP BY p.id
        ${orderBy}
        LIMIT :limit OFFSET :offset
      `;
  
      // Count query for pagination
      const countQuery = `
        SELECT COUNT(*) AS total
        FROM products p
        ${whereClause}
      `;
  
      replacements.limit = parseInt(limit);
      replacements.offset = offset;
  
      const products = await sequelize.query(query, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });
  
      const [countResult] = await sequelize.query(countQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });
  
      const total = countResult.total;
  
      // Format products
      const formattedProducts = products.map(p => ({
        id: p.id,
        name: p.name,
        sub_heading: p.sub_heading,
        description: p.description,
        price: parseFloat(p.price),
        mrp: parseFloat(p.mrp || p.price),
        specification: p.specification,
        discount: p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0,
        product_type: p.product_type,
        brand: p.brand,
        item: p.item,
        status: p.status,
        productImageUrl: p.productImageUrl,
        images: p.images ? p.images.split(',') : [] // convert comma string to array
      }));
  
      res.status(200).json({
        status: 'success',
        data: {
          pagination: {
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            perPage: parseInt(limit)
          },
          products: formattedProducts,
        }
      });
  
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch products',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
      });
    }
  }; 


  exports.getAllOrders = async (req, res) => {
    try {
      const {
        userId,        // optional filter
        page = 1,      // pagination
        limit = 10
      } = req.query;
  
      const offset = (page - 1) * limit;
  
      // 1. Fetch orders with optional user filter & pagination
      const whereOrders = {};
      if (userId && userId.trim() !== '') whereOrders.userId = userId.trim();
  
      const orders = await Order.findAll({
        where: whereOrders,
        order: [['created_at', 'DESC']],
        offset: parseInt(offset),
        limit: parseInt(limit),
        raw: true
      });
  
      // 2. Count total orders for pagination
      const totalOrders = await Order.count({ where: whereOrders });
  
      if (!orders.length)
        return res.status(200).json({
          pagination: {
            total: 0,
            totalPages: 0,
            currentPage: parseInt(page),
            perPage: parseInt(limit)
          },
          orders: []
        });
  
      const orderIds = orders.map(o => o.id);
  
      // 3. Fetch order items for all orders
      const orderItems = await OrderItem.findAll({
        where: { order_id: orderIds },
        raw: true
      });
  
      const productIds = orderItems.map(item => item.product_id);
  
      // 4. Fetch products
      const products = await Product.findAll({
        where: { id: productIds },
        raw: true
      });
  
      const productMap = {};
      products.forEach(p => (productMap[p.id] = p));
  
      // 5. Fetch product images
      const productImages = await ProductImage.findAll({
        where: { productId: productIds },
        raw: true
      });
  
      const imageMap = {};
      productImages.forEach(img => {
        if (!imageMap[img.productId]) imageMap[img.productId] = [];
        imageMap[img.productId].push(img.image_url);
      });
  
      // 6. Combine orders + items + product details
      const ordersWithDetails = orders.map(order => {
        const items = orderItems
          .filter(item => item.order_id === order.id)
          .map(item => {
            const product = productMap[item.product_id];
            return {
              id: item.id,
              quantity: item.quantity,
              price: item.price,
              total: item.total,
              product: {
                id: product.id,
                heading: product.heading,
                brand: product.brand,
                product_type: product.product_type,
                images: imageMap[product.id] || []
              }
            };
          });
  
        return {
          ...order,
          items
        };
      });
  
      // 7. Return paginated result
      res.status(200).json({
        pagination: {
          total: totalOrders,
          totalPages: Math.ceil(totalOrders / limit),
          currentPage: parseInt(page),
          perPage: parseInt(limit)
        },
        orders: ordersWithDetails
      });
  
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: 'error', message: err.message });
    }
  };
  

  // PUT /api/orders/:orderId/status
exports.updateOrderStatus = async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body; // New status
  
      // Basic validation
      if (!status || status.trim() === '') {
        return res.status(400).json({
          status: 'error',
          message: 'Status is required'
        });
      }
  
      // Find the order
      const order = await Order.findByPk(orderId);
      console.log("order ", order)
      console.log("orderId", orderId)
      if (!order) {
        return res.status(404).json({
          status: 'error',
          message: 'Order not found'
        });
      }
  
      // Update order status
      order.status = status.trim();
      await order.save();
  
      res.status(200).json({
        status: 'success',
        message: 'Order status updated successfully',
        data: {
          orderId: order.id,
          status: order.status
        }
      });
  
    } catch (err) {
      console.error(err);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update order status',
        ...(process.env.NODE_ENV === 'development' && { error: err.message })
      });
    }
  };

exports.uploadProductImagesAdd = async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const userId = req.body.userId || 'default';
    const productId = req.body.productId;

    const files = req.files || [];

    if (files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No files were uploaded.'
      });
    }

    const uploadedImages = files.map(file => {
      const imageUrl = `${baseUrl}/uploads/products/image/${userId}/${file.filename}`;
      return {
        imageUrl,
        userId,
        productId
      };
    });

    // Use bulkCreate for multiple records
    const newImages = await AdminProductImage.bulkCreate(uploadedImages);

    res.status(200).json({
      status: 'success',
      message: 'Product images uploaded successfully!',
      images: newImages
    });

  } catch (error) {
    console.error('Upload product images error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload product images',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

exports.uploadProductImagesList = async (req, res) => {
  try {
    // Fetch all images, only select the imageUrl field
    const images = await AdminProductImage.findAll({
      attributes: ['imageUrl'],
      where: { active: 1 } // optional: only active images
    });

    // Extract only URLs from the result
    const imageUrls = images.map(img => img.imageUrl);

    res.status(200).json({
      status: 'success',
      message: 'Product images fetched successfully',
      data: imageUrls
    });

  } catch (error) {
    console.error('Error fetching product images:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch product images',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

exports.getUsersByType = async (req, res) => {
  try {
    const { userType } = req.query; // Get userType from query parameters

    // Validate userType
    const allowedTypes = ['customer', 'vendor', 'admin', 'subAdmin'];
    if (!userType || !allowedTypes.includes(userType)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid or missing userType. Allowed types: ${allowedTypes.join(', ')}`,
      });
    }

    // Fetch users by userType
    const users = await User.findAll({
      where: { userType },
      attributes: ['id', 'userType', 'firstName', 'lastName', 'email', 'phone', 'photo', 'notificationSetting', 'status'],
      order: [['created_at', 'DESC']], // optional: order by creation date
    });

    res.status(200).json({
      status: 'success',
      message: `Users with type '${userType}' fetched successfully`,
      data: users,
    });

  } catch (error) {
    console.error('Error fetching users by type:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch users',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};