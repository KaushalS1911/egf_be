const express = require('express');
const multer = require('multer');
const router = express.Router();
const {addOtherIncome, getAllOtherIncomes, updateOtherIncome, getSingleOtherIncome ,deleteOtherIncome} = require('../controllers/other-income')

const storage = multer.memoryStorage();
const upload = multer({storage: storage});

router.post('/:companyId/other-income',  upload.single('income-file'), addOtherIncome);
router.get('/:companyId/other-income', getAllOtherIncomes);
router.get('/:companyId/other-income/:incomeId', getSingleOtherIncome);
router.put('/:companyId/other-income/:incomeId', upload.single('income-file'), updateOtherIncome);
router.delete('/:companyId/other-income/:incomeId', deleteOtherIncome);

module.exports = router;
