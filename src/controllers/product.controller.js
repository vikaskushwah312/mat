// product.controller.js
const { Op } = require('sequelize');
const Product = require('../models/product.model');
const ProductImage = require('../models/productImage.model');
const sequelize = require('../config/db');

// Get all products
exports.getAllProducts = async (req, res) => {
    try {
      const { 
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
          p.product_type,
          p.brand,
          p.item,
          p.status,
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
        discount: p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0,
        product_type: p.product_type,
        brand: p.brand,
        item: p.item,
        status: p.status,
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
          p.product_type,
          p.brand,
          p.item,
          p.status,
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
        discount: product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0,
        product_type: product.product_type,
        brand: product.brand,
        item: product.item,
        status: product.status,
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
      userId,
      page = 1, 
      limit = 10, 
      product_type, 
      item,
      brand, 
      price, 
      // maxPrice, 
      search,
      userType, 
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
        p.product_type,
        p.brand,
        p.item,
        p.status,
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
      discount: p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0,
      product_type: p.product_type,
      brand: p.brand,
      item: p.item,
      status: p.status,
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

// Add a new product
exports.addProduct = async (req, res) => {
  try {
    const {
      userId,
      heading,
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

    // Create the product
    const product = await Product.create({
      userId,
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
