const express = require('express');
const multer = require('multer');
const router = express.Router();
const {issueLoan, getAllLoans, updateLoan,loanPartPayment, partRelease, getSingleLoan ,deleteMultipleLoans, disburseLoan,interestPayment} = require('../controllers/issue-loan')

const storage = multer.memoryStorage();
const upload = multer({storage: storage});

router.post('/:companyId/issue-loan',  upload.single('property-image'), issueLoan);
router.post('/disburse-loan', disburseLoan);
router.get('/:companyId/loans', getAllLoans);
router.delete('/:companyId/loans', deleteMultipleLoans);
router.get('/:companyId/loans/:loanId', getSingleLoan);
router.put('/:companyId/loans/:loanId', updateLoan);
router.post('/loans/:loanId/interest-payment', interestPayment);
router.post('/loans/:loanId/part-release', partRelease);
router.post('/loans/:loanId/part-payment', loanPartPayment);

module.exports = router;
