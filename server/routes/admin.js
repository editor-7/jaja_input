const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const catalogStats = require('../controllers/catalogStats');

router.get('/catalog-summary', requireAuth, requireAdmin, catalogStats.getSummary);

module.exports = router;
