const mysql = require("mysql2");
const dbConnection = mysql.createPool({
    host:"localhost",
    user:"root",
    password:"",
    database:"chat_app"
}).promise();

module.exports = dbConnection;