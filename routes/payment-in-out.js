const express = require('express');
const router = express.Router();
const {
    addPaymentInOut,
    getAllPaymentInOut,
    getSinglePaymentInOut,
    updatePaymentInOut,
    deletePaymentInOut
} = require('../controllers/payment-in-out');
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({storage: storage});


router.post('/:companyId/payment',upload.single('invoice'), addPaymentInOut);
router.get('/:companyId/payment', getAllPaymentInOut);
router.get('/:companyId/payment/:paymentId', getSinglePaymentInOut);
router.put('/:companyId/payment/:paymentId',upload.single('invoice'), updatePaymentInOut);
router.delete('/:companyId/payment/:paymentId', deletePaymentInOut);

module.exports = router;
