const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const twilio = require('twilio');
const User = require('../models/user.model');
const { getActiveProducts } = require('../utils/product.utils');
require('dotenv').config();

let client;

// Initialize Twilio client only in production
if (process.env.NODE_ENV === 'production') {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials are required in production');
  }
  client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

// Generate 4-digit OTP
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Send OTP via SMS (or simulate in development)
const sendOTP = async (phone, otp) => {
  if (process.env.NODE_ENV === 'production') {
    try {
      await client.messages.create({
        body: `Your OTP for login is: ${otp}. Valid for 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: `+${phone}`
      });
      return true;
    } catch (error) {
      console.error('Error sending OTP:', error);
      return false;
    }
  } else {
    // In development, just log the OTP to console
    console.log(`[DEV] OTP for ${phone}: ${otp}`);
    return true;
  }
};

// Resend OTP
exports.resendOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        status: 'error',
        message: 'Phone number is required'
      });
    }

    // Find the user
    const user = await User.findOne({ where: { phone } });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user with new OTP
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Send OTP via SMS
    const otpSent = await sendOTP(phone, otp);

    if (!otpSent) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to resend OTP'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'OTP resent successfully',
      data: {
        phone,
        otp: otp
      }
    });
  } catch (error) {
    console.error('Error in resendOTP:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// Login/Signup with phone number
exports.requestOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        status: 'error',
        message: 'Phone number is required'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Find or create user
    const [user, created] = await User.findOrCreate({
      where: { phone },
      defaults: {
        phone,
        otp,
        otpExpires,
        status: 0
      }
    });
    // If user exists, update OTP
    if (!created) {
      user.otp = otp;
      user.otpExpires = otpExpires;
      await user.save();
    }

    // Send OTP via SMS
    const otpSent = await sendOTP(phone, otp);
    console.log(otpSent)
    if (!otpSent) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to send OTP'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'OTP sent successfully',
      data: {
        phone,
        otp: otp
      }
    });
  } catch (error) {
    console.error('Error in requestOTP:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    console.log(phone, otp)
    if (!phone || !otp) {
      return res.status(400).json({
        status: 'error',
        message: 'Phone number and OTP are required'
      });
    }

    // Find user by phone
    const user = await User.findOne({ where: { phone } });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check if OTP is expired
    if (user.otpExpires < new Date()) {
      return res.status(400).json({
        status: 'error',
        message: 'OTP has expired'
      });
    }

    // Verify OTP
    console.log("user.otp",user.otp, otp)
    if (user.otp != otp) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid OTP'
      });
    }

    // Update user status to active
    user.status = 1;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    // Generate JWT token
    const token = generateToken(user.id);
    const products = await getActiveProducts();
    res.status(200).json({
      status: 'success',
      message: 'OTP verified successfully',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          status: user.status
        },
        products: products,
        token
      }
    });
  } catch (error) {
    console.error('Error in verifyOTP:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};
