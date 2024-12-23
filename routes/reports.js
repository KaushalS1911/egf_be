const express = require('express');
const router = express.Router();
const { dailyReport, loanSummary } = require('../controllers/report')

router.get('/:companyId/daily-report', dailyReport);
router.get('/:companyId/loan-summary', loanSummary);

module.exports = router;
