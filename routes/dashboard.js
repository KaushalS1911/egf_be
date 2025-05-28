const express = require('express');
const router = express.Router();

const {
    getAreaAndReferenceStats,
    getInquiryStatusSummary,
    getLoanAmountPerScheme,
    getAllLoanStatsWithCharges,
    getCompanyPortfolioSummary,
    getOtherLoanChart,
    getLoanChartData,
    getPaymentInOutSummary,
    getTotalInOutAmount,
} = require("../controllers/dashboard");

router.get('/:companyId/dashboard/reference-area-summary', getAreaAndReferenceStats);
router.get('/:companyId/dashboard/inquiry-summary', getInquiryStatusSummary);
router.get('/:companyId/dashboard/scheme-loan-summary', getLoanAmountPerScheme);
router.get('/:companyId/dashboard/combined-loan-stats', getAllLoanStatsWithCharges);
router.get("/:companyId/dashboard/portfolio-summary", getCompanyPortfolioSummary);
router.get("/:companyId/dashboard/other-loan-chart", getOtherLoanChart);
router.get("/:companyId/dashboard/loan-chart", getLoanChartData);
router.get("/:companyId/dashboard/payment-in-out-summary", getPaymentInOutSummary);
router.get("/:companyId/dashboard/total-in-out", getTotalInOutAmount);

module.exports = router;
