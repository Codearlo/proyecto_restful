const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const taskController = require('../controllers/taskController');
const { authenticate, authorize, isProjectOwnerOrAdmin } = require('../middlewares/auth');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas para proyectos
router.get('/', projectController.getProjects);
router.post('/', projectController.createProject);
router.get('/:id', projectController.getProjectById);
router.put('/:id', isProjectOwnerOrAdmin, projectController.updateProject);
router.delete('/:id', isProjectOwnerOrAdmin, projectController.deleteProject);

// Rutas para tareas dentro de proyectos
router.get('/:projectId/tareas', taskController.getProjectTasks);
router.post('/:projectId/tareas', taskController.createTask);

module.exports = router;