const express = require('express');
const router = express.Router();
const {
    addPaymentInOut,
    getAllPaymentInOut,
    getSinglePaymentInOut,
    updatePaymentInOut,
    deletePaymentInOut
} = require('../controllers/payment-in-out');

router.post('/:companyId/payment', addPaymentInOut);
router.get('/:companyId/payment', getAllPaymentInOut);
router.get('/:companyId/payment/:paymentId', getSinglePaymentInOut);
router.put('/:companyId/payment/:paymentId', updatePaymentInOut);
router.delete('/:companyId/payment/:paymentId', deletePaymentInOut);

module.exports = router;
