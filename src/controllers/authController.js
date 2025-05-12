const { User } = require('../models');
const { generateToken } = require('../utils/jwt');

/**
 * Registra un nuevo usuario
 * @param {Object} req - Objeto request de Express
 * @param {Object} res - Objeto response de Express
 */
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Verificar si el correo ya está registrado
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.formatResponse(400, null, 'El correo electrónico ya está registrado');
        }

        // Validar contraseña (aunque Sequelize también lo hace)
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.formatResponse(400, null, 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número');
        }

        // Crear nuevo usuario (el hash de la contraseña se hace automáticamente por los hooks)
        const user = await User.create({
            name,
            email,
            password,
            role: role === 'admin' ? 'admin' : 'user' // Solo permitir rol admin si se proporciona explícitamente
        });

        // Retornar usuario creado (sin la contraseña)
        const userData = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt
        };

        return res.formatResponse(201, userData, 'Usuario registrado correctamente');
    } catch (error) {
        console.error('Error en registro:', error);
        
        // Manejo de errores de validación de Sequelize
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            const messages = error.errors.map(e => e.message);
            return res.formatResponse(400, null, messages.join(', '));
        }
        
        return res.formatResponse(500, null, 'Error al registrar usuario');
    }
};

/**
 * Inicia sesión de usuario y genera token JWT
 * @param {Object} req - Objeto request de Express
 * @param {Object} res - Objeto response de Express
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validar que se proporcionaron email y password
        if (!email || !password) {
            return res.formatResponse(400, null, 'Correo y contraseña son requeridos');
        }

        // Buscar usuario por email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.formatResponse(401, null, 'Credenciales inválidas');
        }

        // Verificar si el usuario está activo
        if (!user.active) {
            return res.formatResponse(401, null, 'Usuario inactivo. Contacte al administrador');
        }

        // Verificar contraseña
        const isValidPassword = await user.checkPassword(password);
        if (!isValidPassword) {
            return res.formatResponse(401, null, 'Credenciales inválidas');
        }

        // Generar token JWT
        const token = generateToken(user);

        // Retornar token y datos básicos del usuario
        const userData = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        return res.formatResponse(200, { user: userData, token }, 'Inicio de sesión exitoso');
    } catch (error) {
        console.error('Error en login:', error);
        return res.formatResponse(500, null, 'Error al iniciar sesión');
    }
};

/**
 * Obtiene el perfil del usuario autenticado
 * @param {Object} req - Objeto request de Express
 * @param {Object} res - Objeto response de Express
 */
const getProfile = async (req, res) => {
    try {
        // Buscar usuario completo por ID (req.user tiene información limitada)
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] } // Excluir campo de contraseña
        });

        if (!user) {
            return res.formatResponse(404, null, 'Usuario no encontrado');
        }

        return res.formatResponse(200, user, 'Perfil de usuario obtenido correctamente');
    } catch (error) {
        console.error('Error al obtener perfil:', error);
        return res.formatResponse(500, null, 'Error al obtener perfil de usuario');
    }
};

module.exports = {
    register,
    login,
    getProfile
};