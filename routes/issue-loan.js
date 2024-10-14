const express = require('express');
const multer = require('multer');
const router = express.Router();
const {issueLoan, getAllLoans, updateLoan,loanPartPayment, partRelease, uchakInterestPayment, getSingleLoan,updatePartReleaseDetail, updatePartPaymentDetail,updateInterestPayment ,deleteMultipleLoans, disburseLoan,interestPayment,GetInterestPayment,GetPartPaymentDetail,GetPartReleaseDetail} = require('../controllers/issue-loan')

const storage = multer.memoryStorage();
const upload = multer({storage});

router.post('/:companyId/issue-loan',  upload.single('property-image'), issueLoan);
router.post('/disburse-loan', disburseLoan);
router.get('/:companyId/loans', getAllLoans);
router.delete('/:companyId/loans', deleteMultipleLoans);
router.get('/:companyId/loans/:loanId', getSingleLoan);
router.put('/:companyId/loans/:loanId', upload.single('property-image'), updateLoan);
router.post('/loans/:loanId/interest-payment', interestPayment);
router.post('/loans/:loanId/uchak-interest-payment', uchakInterestPayment);
router.get('/loans/:loanId/interest-payment', GetInterestPayment);
router.put('/loans/:loanId/interest-payment/:interestId', updateInterestPayment);
router.put('/loans/:loanId/part-release/:partId', updatePartReleaseDetail);
router.get('/loans/:loanId/loan-part-payment', GetPartPaymentDetail);
router.get('/loans/:loanId/part-release', GetPartReleaseDetail);
router.post('/loans/:loanId/part-release', upload.single('property-image'), partRelease);
router.post('/loans/:loanId/part-payment', loanPartPayment);
router.put('/loans/:loanId/part-payment/:partId', updatePartPaymentDetail);

module.exports = router;
