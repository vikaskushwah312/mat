const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { uploadProductImages: upload } = require('../config/multerConfig');

// Public routes
router.get('/products/', adminController.getAllProducts);
router.get('/products/:id', adminController.getProductById);
// // Add product
router.post('/products/add', adminController.addProduct);

// Upload product images with form data
router.post('/products/images', upload, adminController.uploadProductImages);
router.post('/products/images/add', upload, adminController.uploadProductImagesAdd);
router.post('/products/images/list', adminController.uploadProductImagesList);

router.get('/users/list', adminController.getUsersByType);
// Update product
router.put('/products/update', adminController.updateProduct);
// Delete product
// router.delete('/delete/:id', productController.deleteProductById);

router.get('/orders', adminController.getAllOrders);

router.put('/orders/update/:orderId', adminController.updateOrderStatus);

module.exports = router;