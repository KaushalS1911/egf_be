const express = require('express');
const multer = require('multer');
const router = express.Router();
const {issueLoan, getAllLoans, updateLoan,loanPartPayment, partRelease, getSingleLoan,updatePartReleaseDetail, updateInterestPayment ,deleteMultipleLoans, disburseLoan,interestPayment,GetInterestPayment,GetPartPaymentDetail,GetPartReleaseDetail} = require('../controllers/issue-loan')

const storage = multer.memoryStorage();
const upload = multer({storage: storage});

router.post('/:companyId/issue-loan',  upload.single('property-image'), issueLoan);
router.post('/disburse-loan', disburseLoan);
router.get('/:companyId/loans', getAllLoans);
router.delete('/:companyId/loans', deleteMultipleLoans);
router.get('/:companyId/loans/:loanId', getSingleLoan);
router.put('/:companyId/loans/:loanId', upload.single('property-image'), updateLoan);
router.post('/loans/:loanId/interest-payment', interestPayment);
router.get('/loans/:loanId/interest-payment', GetInterestPayment);
router.put('/loans/:loanId/interest-payment/:interestId', updateInterestPayment);
router.put('/loans/:loanId/part-release/:partId', updatePartReleaseDetail);
router.get('/loans/:loanId/loan-part-payment', GetPartPaymentDetail);
router.get('/loans/:loanId/part-release', GetPartReleaseDetail);
router.post('/loans/:loanId/part-release', partRelease);
router.post('/loans/:loanId/part-payment', loanPartPayment);

module.exports = router;
