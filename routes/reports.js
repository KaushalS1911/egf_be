const express = require('express');
const router = express.Router();
const { dailyReport, loanSummary, loanDetail, customerStatement, initialLoanDetail, otherLoanSummary, allInOutReport} = require('../controllers/report')

router.get('/:companyId/daily-report', dailyReport);
router.get('/:companyId/loan-summary', loanSummary);
router.get('/:companyId/other-loan-summary', otherLoanSummary);
router.get('/:companyId/loan-detail/:loanId', loanDetail);
router.get('/:companyId/customer-statement/:customerId', customerStatement);
router.get('/:companyId/issued-loan-detail', initialLoanDetail);
router.get('/:companyId/all-in-out-report', allInOutReport);

module.exports = router;
