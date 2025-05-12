const { Sequelize } = require('sequelize');
require('dotenv').config();

// Configuración de la conexión a la base de datos usando SQLite para desarrollo
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite', // Archivo de base de datos local
    logging: process.env.NODE_ENV === 'development' ? console.log : false
});

// Función para probar la conexión a la base de datos
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('Conexión a la base de datos SQLite establecida correctamente.');
        return true;
    } catch (error) {
        console.error('Error al conectar con la base de datos:', error);
        return false;
    }
};

module.exports = {
    sequelize,
    testConnection
};