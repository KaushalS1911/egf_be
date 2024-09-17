const express = require('express');
const router = express.Router();
const { addLoan, getAllLoans,updateLoan,getSingleLoan, deleteMultipleLoans } = require('../controllers/loan_type')

router.post('/:companyId/loan', addLoan);
router.get('/:companyId/loan', getAllLoans);
router.get('/:companyId/loan/:loanId', getSingleLoan);
router.put('/:companyId/loan/:loanId', updateLoan);
router.delete('/:companyId/loan', deleteMultipleLoans);

module.exports = router;
