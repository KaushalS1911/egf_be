const express = require('express');
const multer = require('multer');
const router = express.Router();
const {issueLoan, getAllLoans, updateLoan, getSingleLoan ,deleteMultipleLoans} = require('../controllers/issue-loan')

const storage = multer.memoryStorage();
const upload = multer({storage: storage});

router.post('/:companyId/issue-loan',  upload.single('property-image'),issueLoan);
router.get('/:companyId/loans', getAllLoans);
router.delete('/:companyId/loans', deleteMultipleLoans);
router.get('/:companyId/loans/:loanId', getSingleLoan);
router.put('/:companyId/loans/:loanId', updateLoan);

module.exports = router;
