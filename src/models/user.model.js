const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: false,
  },
  otp: {
    type: DataTypes.STRING(4),
    allowNull: true,
    validate: {
      isNumeric: true,
      len: [4, 4]
    }
  },
  status: {
    type: DataTypes.ENUM('0', '1'),
    defaultValue: '0', // 0 = Inactive, 1 = Active
    allowNull: false
  },
  otpExpires: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Set up associations
User.associate = (models) => {
  User.hasMany(models.Order, {
    foreignKey: 'user_id',
    as: 'orders',
  });

  User.hasMany(models.Product, {
    foreignKey: 'userId',
    as: 'products',
  });
};

module.exports = User;
