const express = require('express');
const router = express.Router();
const { dailyReport, loanSummary, loanDetail, customerStatement, initialLoanDetail} = require('../controllers/report')

router.get('/:companyId/daily-report', dailyReport);
router.get('/:companyId/loan-summary', loanSummary);
router.get('/:companyId/loan-detail/:loanId', loanDetail);
router.get('/:companyId/customer-statement/:customerId', customerStatement);
router.get('/:companyId/issued-loan-detail', initialLoanDetail);

module.exports = router;
