const express = require('express');
const router = express.Router();
const { dailyReport } = require('../controllers/report')

router.get('/:companyId/daily-report', dailyReport);

module.exports = router;
