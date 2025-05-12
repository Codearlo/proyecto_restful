const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Genera un JWT con la información del usuario
 * @param {Object} user - Objeto con los datos del usuario
 * @returns {String} - Token JWT generado
 */
const generateToken = (user) => {
    // Solo incluimos información necesaria en el token
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role
    };

    return jwt.sign(
        payload, 
        process.env.JWT_SECRET, 
        { expiresIn: process.env.JWT_EXPIRATION }
    );
};

/**
 * Verifica y decodifica un token JWT
 * @param {String} token - Token JWT a verificar
 * @returns {Object|null} - Objeto con los datos decodificados o null si es inválido
 */
const verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded;
    } catch (error) {
        console.error('Error al verificar token JWT:', error.message);
        return null;
    }
};

module.exports = {
    generateToken,
    verifyToken
};