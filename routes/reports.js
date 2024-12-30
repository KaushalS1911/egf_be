const express = require('express');
const router = express.Router();
const { dailyReport, loanSummary, loanDetail } = require('../controllers/report')

router.get('/:companyId/daily-report', dailyReport);
router.get('/:companyId/loan-summary', loanSummary);
router.get('/:companyId/loan-detail/:loanId', loanDetail);

module.exports = router;
