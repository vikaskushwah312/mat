const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  heading: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  sub_heading: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  mrp: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  specification: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  product_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  brand: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  item: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  stock_quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users', // This is the table name
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  }
}, {
  tableName: 'products',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// Associations
Product.associate = (models) => {
  Product.hasMany(models.ProductImage, {
    foreignKey: 'productId',
    as: 'images'
  });

  Product.hasMany(models.CartItem, {
    foreignKey: 'productId',
    as: 'cartItems'
  });
};

module.exports = Product;
