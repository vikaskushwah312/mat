const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // adjust the path if needed

const Gstn = sequelize.define('Gstn', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  gstn: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false
  }
}, {
  tableName: 'gstn',
  timestamps: false // set true if you have created_at, updated_at fields
});

module.exports = Gstn;
