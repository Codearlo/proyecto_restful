const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');

// Ruta de registro de usuarios
router.post('/registro', authController.register);

// Ruta de inicio de sesión
router.post('/login', authController.login);

// Ruta para obtener perfil de usuario (protegida)
router.get('/perfil', authenticate, authController.getProfile);

module.exports = router;