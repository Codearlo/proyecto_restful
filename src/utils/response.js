const xml = require('xml');

/**
 * Formatea la respuesta según el formato solicitado
 * @param {Object} res - Objeto response de Express
 * @param {Number} statusCode - Código HTTP de la respuesta
 * @param {Object|String} data - Datos a enviar en la respuesta
 * @param {String} message - Mensaje descriptivo (opcional)
 * @param {String} format - Formato de respuesta ('json' o 'xml')
 */
const formatResponse = (res, statusCode, data, message = null, format = 'json') => {
    // Construir objeto de respuesta
    const response = {
        success: statusCode >= 200 && statusCode < 300,
        code: statusCode,
        message: message || getDefaultMessage(statusCode),
        data: data || null,
        timestamp: new Date().toISOString()
    };

    // Establecer el código de estado HTTP
    res.status(statusCode);

    // Enviar respuesta según el formato solicitado
    if (format === 'xml') {
        res.set('Content-Type', 'application/xml');
        // Convertir respuesta a formato XML
        const xmlResponse = generateXML(response);
        return res.send(xmlResponse);
    } else {
        res.set('Content-Type', 'application/json');
        // Enviar respuesta en formato JSON
        return res.json(response);
    }
};

/**
 * Obtiene un mensaje predeterminado según el código de estado
 * @param {Number} statusCode - Código HTTP 
 * @returns {String} - Mensaje predeterminado
 */
const getDefaultMessage = (statusCode) => {
    switch (statusCode) {
        case 200: return 'OK';
        case 201: return 'Recurso creado correctamente';
        case 400: return 'Solicitud incorrecta';
        case 401: return 'No autorizado';
        case 403: return 'Acceso prohibido';
        case 404: return 'Recurso no encontrado';
        case 500: return 'Error interno del servidor';
        default: return 'Operación completada';
    }
};

/**
 * Convierte un objeto JavaScript a formato XML
 * @param {Object} data - Objeto a convertir
 * @returns {String} - Cadena XML
 */
const generateXML = (data) => {
    // Función auxiliar para convertir objetos anidados a formato compatible con la librería xml
    const processObject = (obj) => {
        if (obj === null || obj === undefined) return '';
        
        if (Array.isArray(obj)) {
            return obj.map(item => {
                if (typeof item === 'object' && item !== null) {
                    return { item: processObject(item) };
                }
                return { item: String(item) };
            });
        } else if (typeof obj === 'object') {
            const result = [];
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    const value = obj[key];
                    if (typeof value === 'object' && value !== null) {
                        result.push({ [key]: processObject(value) });
                    } else {
                        result.push({ [key]: String(value) });
                    }
                }
            }
            return result;
        } else {
            return String(obj);
        }
    };

    // Formato XML final
    const xmlObj = {
        response: processObject(data)
    };

    return xml(xmlObj, { declaration: true, indent: '  ' });
};

module.exports = {
    formatResponse
};