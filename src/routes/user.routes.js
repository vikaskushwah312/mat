const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

//Get user details by userId
router.get('/:userId', userController.getUserById);

//Update user details by userId
router.put('/:userId', userController.updateUserById);

module.exports = router;
