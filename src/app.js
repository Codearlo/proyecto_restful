const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const { testConnection } = require('./config/database');
const { syncModels } = require('./models');

// Crear aplicación Express
const app = express();

// Middleware para seguridad y parseo de datos
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar rutas
app.use('/api', routes);

// Middleware para manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error no capturado:', err.stack);
    const format = req.query.format || 'json';
    
    // Usar el middleware de formato si está disponible
    if (res.formatResponse) {
        return res.formatResponse(500, null, 'Error interno del servidor');
    } else {
        // Fallback en caso de que el error ocurra antes de cargar el middleware
        return res.status(500).json({ 
            success: false,
            code: 500,
            message: 'Error interno del servidor',
            data: null,
            timestamp: new Date().toISOString()
        });
    }
});

// Función para inicializar la aplicación
const initializeApp = async () => {
    try {
        // Probar conexión a la base de datos
        const dbConnected = await testConnection();
        if (!dbConnected) {
            console.error('No se pudo conectar a la base de datos. Saliendo...');
            process.exit(1);
        }

        // Sincronizar modelos con la base de datos
        // Pasar true como argumento para forzar recreación de tablas (solo en desarrollo)
        const forceSync = process.env.NODE_ENV === 'development' && process.env.FORCE_SYNC === 'true';
        await syncModels(forceSync);

        // Iniciar servidor
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Servidor API corriendo en puerto ${PORT}`);
        });
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        process.exit(1);
    }
};

module.exports = { app, initializeApp };