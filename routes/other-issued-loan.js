const express = require('express');
const router = express.Router();
const { addOtherLoan, getAllOtherLoans} = require('../controllers/other-issued-loans')

router.post('/:companyId/other-loan-issue', addOtherLoan);
router.get('/:companyId/other-loans', getAllOtherLoans);

module.exports = router;
