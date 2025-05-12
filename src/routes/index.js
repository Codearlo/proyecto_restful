const express = require('express');
const router = express.Router();

// Importar todas las rutas
const authRoutes = require('./authRoutes');
const projectRoutes = require('./projectRoutes');
const taskRoutes = require('./taskRoutes');

// Middleware para formatear respuestas
const { formatMiddleware } = require('../middlewares/auth');
router.use(formatMiddleware);

// Configurar rutas
router.use('/', authRoutes);
router.use('/proyectos', projectRoutes);
router.use('/tareas', taskRoutes);

// Ruta base para verificar que la API está funcionando
router.get('/', (req, res) => {
    res.formatResponse(200, { message: 'API de Gestión de Proyectos v1.0' }, 'API funcionando correctamente');
});

// Manejo de rutas no encontradas
router.use('*', (req, res) => {
    res.formatResponse(404, null, 'Ruta no encontrada');
});

module.exports = router;