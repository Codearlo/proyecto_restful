const { Task, Project, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Obtiene todas las tareas de un proyecto
 * @param {Object} req - Objeto request de Express
 * @param {Object} res - Objeto response de Express
 */
const getProjectTasks = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { status, priority, assignedTo } = req.query;

        // Verificar que el proyecto existe
        const project = await Project.findByPk(projectId);
        if (!project) {
            return res.formatResponse(404, null, 'Proyecto no encontrado');
        }

        // Verificar si el usuario tiene acceso al proyecto
        if (project.createdBy !== req.user.id && req.user.role !== 'admin') {
            return res.formatResponse(403, null, 'No tiene permisos para ver las tareas de este proyecto');
        }

        // Construir condiciones de búsqueda
        const whereConditions = {
            projectId
        };

        // Aplicar filtros opcionales
        if (status && ['pending', 'in_progress', 'completed', 'canceled'].includes(status)) {
            whereConditions.status = status;
        }

        if (priority && ['low', 'medium', 'high'].includes(priority)) {
            whereConditions.priority = priority;
        }

        if (assignedTo) {
            whereConditions.assignedTo = assignedTo;
        }

        // Buscar tareas que coincidan con los criterios
        const tasks = await Task.findAll({
            where: whereConditions,
            include: [
                {
                    model: User,
                    as: 'assignee',
                    attributes: ['id', 'name', 'email']
                }
            ],
            order: [
                ['priority', 'DESC'],
                ['createdAt', 'DESC']
            ]
        });

        return res.formatResponse(200, tasks, 'Tareas obtenidas correctamente');
    } catch (error) {
        console.error('Error al obtener tareas:', error);
        return res.formatResponse(500, null, 'Error al obtener tareas');
    }
};

/**
 * Obtiene una tarea específica por su ID
 * @param {Object} req - Objeto request de Express
 * @param {Object} res - Objeto response de Express
 */
const getTaskById = async (req, res) => {
    try {
        const { id } = req.params;

        // Buscar tarea por ID
        const task = await Task.findByPk(id, {
            include: [
                {
                    model: Project,
                    as: 'project'
                },
                {
                    model: User,
                    as: 'assignee',
                    attributes: ['id', 'name', 'email']
                }
            ]
        });

        if (!task) {
            return res.formatResponse(404, null, 'Tarea no encontrada');
        }

        // Verificar si el usuario tiene permisos para ver esta tarea
        const project = await Project.findByPk(task.projectId);
        if (project.createdBy !== req.user.id && req.user.role !== 'admin') {
            return res.formatResponse(403, null, 'No tiene permisos para ver esta tarea');
        }

        return res.formatResponse(200, task, 'Tarea obtenida correctamente');
    } catch (error) {
        console.error('Error al obtener tarea:', error);
        return res.formatResponse(500, null, 'Error al obtener tarea');
    }
};

/**
 * Crea una nueva tarea en un proyecto
 * @param {Object} req - Objeto request de Express
 * @param {Object} res - Objeto response de Express
 */
const createTask = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { title, description, status, priority, dueDate, assignedTo } = req.body;
        
        // Validar campos requeridos
        if (!title) {
            return res.formatResponse(400, null, 'El título de la tarea es requerido');
        }

        // Verificar que el proyecto existe
        const project = await Project.findByPk(projectId);
        if (!project) {
            return res.formatResponse(404, null, 'Proyecto no encontrado');
        }

        // Verificar si el usuario tiene permisos para añadir tareas al proyecto
        if (project.createdBy !== req.user.id && req.user.role !== 'admin') {
            return res.formatResponse(403, null, 'No tiene permisos para añadir tareas a este proyecto');
        }

        // Si se asigna a un usuario, verificar que existe
        if (assignedTo) {
            const assignee = await User.findByPk(assignedTo);
            if (!assignee) {
                return res.formatResponse(404, null, 'Usuario asignado no encontrado');
            }
        }

        // Crear nueva tarea
        const task = await Task.create({
            title,
            description,
            status: status || 'pending',
            priority: priority || 'medium',
            dueDate,
            projectId,
            assignedTo
        });

        // Cargar el usuario asignado para la respuesta
        if (assignedTo) {
            await task.reload({
                include: [
                    {
                        model: User,
                        as: 'assignee',
                        attributes: ['id', 'name', 'email']
                    }
                ]
            });
        }

        return res.formatResponse(201, task, 'Tarea creada correctamente');
    } catch (error) {
        console.error('Error al crear tarea:', error);
        
        // Manejo de errores de validación
        if (error.name === 'SequelizeValidationError') {
            const messages = error.errors.map(e => e.message);
            return res.formatResponse(400, null, messages.join(', '));
        }
        
        return res.formatResponse(500, null, 'Error al crear tarea');
    }
};

/**
 * Actualiza una tarea existente
 * @param {Object} req - Objeto request de Express
 * @param {Object} res - Objeto response de Express
 */
const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, status, priority, dueDate, assignedTo } = req.body;

        // Buscar tarea por ID
        const task = await Task.findByPk(id);
        
        if (!task) {
            return res.formatResponse(404, null, 'Tarea no encontrada');
        }

        // Verificar si el usuario tiene permisos para modificar esta tarea
        const project = await Project.findByPk(task.projectId);
        if (project.createdBy !== req.user.id && req.user.role !== 'admin') {
            return res.formatResponse(403, null, 'No tiene permisos para modificar esta tarea');
        }

        // Si se asigna a un usuario, verificar que existe
        if (assignedTo && assignedTo !== task.assignedTo) {
            const assignee = await User.findByPk(assignedTo);
            if (!assignee) {
                return res.formatResponse(404, null, 'Usuario asignado no encontrado');
            }
        }

        // Actualizar propiedades de la tarea
        if (title) task.title = title;
        if (description !== undefined) task.description = description;
        if (status && ['pending', 'in_progress', 'completed', 'canceled'].includes(status)) {
            task.status = status;
        }
        if (priority && ['low', 'medium', 'high'].includes(priority)) {
            task.priority = priority;
        }
        if (dueDate !== undefined) task.dueDate = dueDate;
        if (assignedTo !== undefined) task.assignedTo = assignedTo;

        // Guardar cambios
        await task.save();

        // Cargar el usuario asignado para la respuesta
        if (task.assignedTo) {
            await task.reload({
                include: [
                    {
                        model: User,
                        as: 'assignee',
                        attributes: ['id', 'name', 'email']
                    }
                ]
            });
        }

        return res.formatResponse(200, task, 'Tarea actualizada correctamente');
    } catch (error) {
        console.error('Error al actualizar tarea:', error);
        
        // Manejo de errores de validación
        if (error.name === 'SequelizeValidationError') {
            const messages = error.errors.map(e => e.message);
            return res.formatResponse(400, null, messages.join(', '));
        }
        
        return res.formatResponse(500, null, 'Error al actualizar tarea');
    }
};

/**
 * Elimina una tarea
 * @param {Object} req - Objeto request de Express
 * @param {Object} res - Objeto response de Express
 */
const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;

        // Buscar tarea por ID
        const task = await Task.findByPk(id);
        
        if (!task) {
            return res.formatResponse(404, null, 'Tarea no encontrada');
        }

        // Verificar si el usuario tiene permisos para eliminar esta tarea
        const project = await Project.findByPk(task.projectId);
        if (project.createdBy !== req.user.id && req.user.role !== 'admin') {
            return res.formatResponse(403, null, 'No tiene permisos para eliminar esta tarea');
        }

        // Eliminar tarea
        await task.destroy();

        return res.formatResponse(200, { id }, 'Tarea eliminada correctamente');
    } catch (error) {
        console.error('Error al eliminar tarea:', error);
        return res.formatResponse(500, null, 'Error al eliminar tarea');
    }
};

module.exports = {
    getProjectTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask
};