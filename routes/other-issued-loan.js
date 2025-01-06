const express = require('express');
const router = express.Router();
const { addOtherLoan, getAllOtherLoans, updateOtherLoan, getSingleOtherLoan, deleteMultipleOtherLoans} = require('../controllers/other-issued-loans')

router.post('/:companyId/other-loan-issue', addOtherLoan);
router.get('/:companyId/other-loans', getAllOtherLoans);
router.delete('/:companyId/other-loans', deleteMultipleOtherLoans);
router.get('/:companyId/other-loans/:loanId', getSingleOtherLoan);
router.put('/:companyId/other-loans/:loanId', updateOtherLoan);

module.exports = router;
