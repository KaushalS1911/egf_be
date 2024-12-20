const express = require('express');
const router = express.Router();
const { dailyReport } = require('../controllers/report')

router.post('/:companyId/daily-report', dailyReport);

module.exports = router;
