const { verifyToken } = require('../utils/jwt');
const { User } = require('../models');
const { formatResponse } = require('../utils/response');

/**
 * Middleware que verifica si el usuario está autenticado
 * @param {Object} req - Objeto request de Express
 * @param {Object} res - Objeto response de Express
 * @param {Function} next - Función next de Express
 */
const authenticate = async (req, res, next) => {
    try {
        // Obtener formato de respuesta
        const format = req.query.format || 'json';

        // Verificar si existe el header Authorization
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return formatResponse(res, 401, null, 'No se proporcionó token de autenticación', format);
        }

        // Verificar el formato del token (Bearer scheme)
        const [scheme, token] = authHeader.split(' ');
        if (scheme !== 'Bearer' || !token) {
            return formatResponse(res, 401, null, 'Formato de token inválido', format);
        }

        // Verificar y decodificar el token
        const decoded = verifyToken(token);
        if (!decoded) {
            return formatResponse(res, 401, null, 'Token inválido o expirado', format);
        }

        // Verificar que el usuario existe en la base de datos
        const user = await User.findByPk(decoded.id);
        if (!user || !user.active) {
            return formatResponse(res, 401, null, 'Usuario no encontrado o inactivo', format);
        }

        // Guardar información del usuario en el objeto request
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role
        };

        // Continuar con la siguiente función middleware
        next();
    } catch (error) {
        console.error('Error en autenticación:', error);
        const format = req.query.format || 'json';
        return formatResponse(res, 500, null, 'Error en autenticación', format);
    }
};

/**
 * Middleware que verifica si el usuario tiene el rol requerido
 * @param {String|Array} roles - Rol o roles permitidos
 * @returns {Function} - Middleware de Express
 */
const authorize = (roles) => {
    return (req, res, next) => {
        const format = req.query.format || 'json';
        
        // Verificar que el middleware de autenticación se ejecutó primero
        if (!req.user) {
            return formatResponse(res, 500, null, 'Error de configuración: middleware de autenticación no ejecutado', format);
        }

        // Convertir a array si solo se recibe un rol
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        
        // Verificar si el usuario tiene alguno de los roles permitidos
        if (!allowedRoles.includes(req.user.role)) {
            return formatResponse(res, 403, null, 'No tiene permisos para acceder a este recurso', format);
        }

        // El usuario tiene el rol requerido, continuar
        next();
    };
};

/**
 * Middleware que verifica si el usuario es el creador del proyecto
 * o si tiene rol de administrador
 * @param {Object} req - Objeto request de Express
 * @param {Object} res - Objeto response de Express
 * @param {Function} next - Función next de Express
 */
const isProjectOwnerOrAdmin = async (req, res, next) => {
    try {
        const format = req.query.format || 'json';
        const { Project } = require('../models');
        
        // Obtener el ID del proyecto
        const projectId = req.params.projectId || req.params.id || req.body.projectId;
        
        if (!projectId) {
            return formatResponse(res, 400, null, 'ID de proyecto no proporcionado', format);
        }

        // Buscar el proyecto
        const project = await Project.findByPk(projectId);
        if (!project) {
            return formatResponse(res, 404, null, 'Proyecto no encontrado', format);
        }

        // Verificar si el usuario es el creador o es administrador
        if (project.createdBy === req.user.id || req.user.role === 'admin') {
            // Guardar el proyecto en el request para no tener que volver a buscarlo
            req.project = project;
            next();
        } else {
            return formatResponse(res, 403, null, 'No tiene permiso para modificar este proyecto', format);
        }
    } catch (error) {
        console.error('Error en verificación de propietario:', error);
        const format = req.query.format || 'json';
        return formatResponse(res, 500, null, 'Error al verificar permisos', format);
    }
};

/**
 * Middleware para validar y formatear la respuesta
 * @param {Object} req - Objeto request de Express
 * @param {Object} res - Objeto response de Express
 * @param {Function} next - Función next de Express
 */
const formatMiddleware = (req, res, next) => {
    // Añadir método para formatear respuestas
    res.formatResponse = (statusCode, data, message) => {
        const format = req.query.format || 'json';
        return formatResponse(res, statusCode, data, message, format);
    };
    next();
};

module.exports = {
    authenticate,
    authorize,
    isProjectOwnerOrAdmin,
    formatMiddleware
};