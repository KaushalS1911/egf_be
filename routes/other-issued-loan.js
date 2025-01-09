const express = require('express');
const router = express.Router();
const { addOtherLoan, getAllOtherLoans, updateOtherLoan, getSingleOtherLoan, deleteMultipleOtherLoans,otherLoanInterestPayment, getAllInterestsOfOtherLoan, deleteOtherLoanInterest, otherLoanClose, getClosedOtherLoan, deleteOtherLoanClosingDetails} = require('../controllers/other-issued-loans')

router.post('/:companyId/other-loan-issue', addOtherLoan);
router.get('/:companyId/other-loans', getAllOtherLoans);
router.delete('/:companyId/other-loans', deleteMultipleOtherLoans);
router.get('/:companyId/other-loans/:loanId', getSingleOtherLoan);
router.put('/:companyId/other-loans/:loanId', updateOtherLoan);

// Interest details of other loans
router.post('/:companyId/other-loans/:loanId/interest', otherLoanInterestPayment);
router.get('/:companyId/other-loans/:loanId/interest', getAllInterestsOfOtherLoan);
router.delete('/:companyId/other-loans/:loanId/interest/:id', deleteOtherLoanInterest);

// Closeing details of other loans
router.post('/:companyId/other-loans/:loanId/loan-close', otherLoanClose);
router.get('/:companyId/other-loans/:loanId/loan-close', getClosedOtherLoan);
router.delete('/:companyId/other-loans/:loanId/loan-close/:id', deleteOtherLoanClosingDetails);

module.exports = router;
