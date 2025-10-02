const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  order_number: {            // Uncommented for unique order number
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true,
  },
  userId: {                  // Field name corrected
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
    defaultValue: 'pending',
    allowNull: false,
  },
  payment_status: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
    defaultValue: 'pending',
    allowNull: false,
  },
  shipping_address: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  billing_address: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  tableName: 'orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// Associations
Order.associate = (models) => {
  Order.belongsTo(models.User, {
    foreignKey: 'userId', // Corrected from 'user_id'
    as: 'user',
  });
  
  Order.hasMany(models.OrderItem, {
    foreignKey: 'order_id',
    as: 'items',
  });
};

// Generate unique order number
Order.beforeCreate(async (order) => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  order.order_number = `ORD-${timestamp}-${random}`;
});

module.exports = Order;
