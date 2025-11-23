const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  // process.env.DB_NAME,
  // process.env.DB_USER,
  // process.env.DB_PASSWORD,
  "mat-database",
  "admin",
  "Xu?UrU0j4}mUD7ofV",

  {
    // host: process.env.DB_HOST,
    // port: process.env.DB_PORT,
    host: "mat-database.cdms0o6kyl46.ap-south-1.rds.amazonaws.com",
    port: 3306,

    dialect: 'mysql',
    logging: false, // Set to console.log to see SQL queries
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

module.exports = sequelize;
