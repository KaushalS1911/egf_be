const express = require('express');
const multer = require('multer');
const router = express.Router();
const {addExpense, getAllExpenses, updateExpense, getSingleExpense ,deleteExpense} = require('../controllers/expense')

const storage = multer.memoryStorage();
const upload = multer({storage: storage});

router.post('/:companyId/expense',  upload.single('invoice'), addExpense);
router.get('/:companyId/expense', getAllExpenses);
router.get('/:companyId/expense/:expenseId', getSingleExpense);
router.put('/:companyId/expense/:expenseId', upload.single('invoice'), updateExpense);
router.delete('/:companyId/expense/:expenseId', deleteExpense);

module.exports = router;
