const User = require('./User');
const Project = require('./Project');
const Task = require('./Task');
const { sequelize } = require('../config/database');

// Definición de relaciones

// Un usuario puede crear muchos proyectos (hasMany)
User.hasMany(Project, { 
    foreignKey: 'createdBy',
    as: 'projects'
});
Project.belongsTo(User, { 
    foreignKey: 'createdBy',
    as: 'creator'
});

// Un proyecto puede tener muchas tareas (hasMany)
Project.hasMany(Task, { 
    foreignKey: 'projectId',
    as: 'tasks',
    onDelete: 'CASCADE' // Si se borra un proyecto, se borran todas sus tareas
});
Task.belongsTo(Project, { 
    foreignKey: 'projectId',
    as: 'project'
});

// Una tarea puede estar asignada a un usuario (belongsTo)
User.hasMany(Task, { 
    foreignKey: 'assignedTo',
    as: 'assignedTasks'
});
Task.belongsTo(User, { 
    foreignKey: 'assignedTo',
    as: 'assignee'
});

// Función para sincronizar los modelos con la base de datos
const syncModels = async (force = false) => {
    try {
        await sequelize.sync({ force });
        console.log('Modelos sincronizados correctamente con la base de datos.');
        return true;
    } catch (error) {
        console.error('Error al sincronizar modelos:', error);
        return false;
    }
};

module.exports = {
    User,
    Project,
    Task,
    syncModels
};