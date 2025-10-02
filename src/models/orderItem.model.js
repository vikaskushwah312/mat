const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'orders',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id',
    },
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: { min: 1 },
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  product_details: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  tableName: 'order_items',
  timestamps: false,
});

// Associations
OrderItem.associate = (models) => {
  OrderItem.belongsTo(models.Order, {
    foreignKey: 'order_id',
    as: 'order',
  });
  
  OrderItem.belongsTo(models.Product, {
    foreignKey: 'product_id',
    as: 'product',
  });
};

// Calculate total before save
OrderItem.beforeSave((orderItem) => {
  if (orderItem.quantity && orderItem.price) {
    orderItem.total = orderItem.quantity * orderItem.price;
  }
});

module.exports = OrderItem;
