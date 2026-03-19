const express = require('express');
const router = express.Router();
const userController = require('../controllers/users');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.post('/', userController.createUser);
router.post('/login', userController.login);
router.get('/', requireAuth, requireAdmin, userController.getAllUsers);
router.get('/:id', requireAuth, userController.getUserById);
router.put('/:id', requireAuth, userController.updateUser);
router.delete('/:id', requireAuth, requireAdmin, userController.deleteUser);

module.exports = router;
