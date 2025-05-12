const { Project, User, Task } = require('../models');
const { Op } = require('sequelize');

/**
 * Obtiene todos los proyectos del usuario autenticado
 * @param {Object} req - Objeto request de Express
 * @param {Object} res - Objeto response de Express
 */
const getProjects = async (req, res) => {
    try {
        // Parámetros de filtrado opcionales
        const { status, search } = req.query;
        
        // Construir condiciones de búsqueda
        const whereConditions = {
            // Solo mostrar proyectos creados por el usuario actual (a menos que sea admin)
            createdBy: req.user.role === 'admin' ? undefined : req.user.id
        };
        
        // Filtrar por estado si se proporciona
        if (status && ['active', 'completed', 'canceled'].includes(status)) {
            whereConditions.status = status;
        }
        
        // Filtrar por término de búsqueda
        if (search) {
            whereConditions.name = {
                [Op.like]: `%${search}%`
            };
        }

        // Buscar proyectos que coincidan con los criterios
        const projects = await Project.findAll({
            where: whereConditions,
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: Task,
                    as: 'tasks',
                    attributes: ['id', 'title', 'status'],
                    limit: 5 // Mostrar solo las primeras 5 tareas para no sobrecargar
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        return res.formatResponse(200, projects, 'Proyectos obtenidos correctamente');
    } catch (error) {
        console.error('Error al obtener proyectos:', error);
        return res.formatResponse(500, null, 'Error al obtener proyectos');
    }
};

/**
 * Obtiene un proyecto específico por su ID
 * @param {Object} req - Objeto request de Express
 * @param {Object} res - Objeto response de Express
 */
const getProjectById = async (req, res) => {
    try {
        const { id } = req.params;

        // Buscar proyecto por ID
        const project = await Project.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: Task,
                    as: 'tasks',
                    include: [
                        {
                            model: User,
                            as: 'assignee',
                            attributes: ['id', 'name', 'email']
                        }
                    ]
                }
            ]
        });

        if (!project) {
            return res.formatResponse(404, null, 'Proyecto no encontrado');
        }

        // Verificar si el usuario tiene permisos para ver este proyecto
        // (solo el creador o administradores pueden verlo)
        if (project.createdBy !== req.user.id && req.user.role !== 'admin') {
            return res.formatResponse(403, null, 'No tiene permisos para ver este proyecto');
        }

        return res.formatResponse(200, project, 'Proyecto obtenido correctamente');
    } catch (error) {
        console.error('Error al obtener proyecto:', error);
        return res.formatResponse(500, null, 'Error al obtener proyecto');
    }
};

/**
 * Crea un nuevo proyecto
 * @param {Object} req - Objeto request de Express
 * @param {Object} res - Objeto response de Express
 */
const createProject = async (req, res) => {
    try {
        const { name, description, status, startDate, endDate } = req.body;
        
        // Validar campos requeridos
        if (!name) {
            return res.formatResponse(400, null, 'El nombre del proyecto es requerido');
        }

        // Crear nuevo proyecto
        const project = await Project.create({
            name,
            description,
            status: status || 'active',
            startDate: startDate || new Date(),
            endDate,
            createdBy: req.user.id // El creador es el usuario autenticado
        });

        return res.formatResponse(201, project, 'Proyecto creado correctamente');
    } catch (error) {
        console.error('Error al crear proyecto:', error);
        
        // Manejo de errores de validación
        if (error.name === 'SequelizeValidationError') {
            const messages = error.errors.map(e => e.message);
            return res.formatResponse(400, null, messages.join(', '));
        }
        
        return res.formatResponse(500, null, 'Error al crear proyecto');
    }
};

/**
 * Actualiza un proyecto existente
 * @param {Object} req - Objeto request de Express
 * @param {Object} res - Objeto response de Express
 */
const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, status, startDate, endDate } = req.body;

        // Buscar proyecto por ID
        const project = await Project.findByPk(id);
        
        if (!project) {
            return res.formatResponse(404, null, 'Proyecto no encontrado');
        }

        // Verificar si el usuario tiene permisos para modificar este proyecto
        if (project.createdBy !== req.user.id && req.user.role !== 'admin') {
            return res.formatResponse(403, null, 'No tiene permisos para modificar este proyecto');
        }

        // Actualizar propiedades del proyecto
        if (name) project.name = name;
        if (description !== undefined) project.description = description;
        if (status && ['active', 'completed', 'canceled'].includes(status)) project.status = status;
        if (startDate) project.startDate = startDate;
        if (endDate !== undefined) project.endDate = endDate;

        // Guardar cambios
        await project.save();

        return res.formatResponse(200, project, 'Proyecto actualizado correctamente');
    } catch (error) {
        console.error('Error al actualizar proyecto:', error);
        
        // Manejo de errores de validación
        if (error.name === 'SequelizeValidationError') {
            const messages = error.errors.map(e => e.message);
            return res.formatResponse(400, null, messages.join(', '));
        }
        
        return res.formatResponse(500, null, 'Error al actualizar proyecto');
    }
};

/**
 * Elimina un proyecto
 * @param {Object} req - Objeto request de Express
 * @param {Object} res - Objeto response de Express
 */
const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;

        // Buscar proyecto por ID
        const project = await Project.findByPk(id);
        
        if (!project) {
            return res.formatResponse(404, null, 'Proyecto no encontrado');
        }

        // Verificar si el usuario tiene permisos para eliminar este proyecto
        if (project.createdBy !== req.user.id && req.user.role !== 'admin') {
            return res.formatResponse(403, null, 'No tiene permisos para eliminar este proyecto');
        }

        // Eliminar proyecto (las tareas se eliminarán automáticamente por la configuración CASCADE en las relaciones)
        await project.destroy();

        return res.formatResponse(200, { id }, 'Proyecto eliminado correctamente');
    } catch (error) {
        console.error('Error al eliminar proyecto:', error);
        return res.formatResponse(500, null, 'Error al eliminar proyecto');
    }
};

module.exports = {
    getProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject
};