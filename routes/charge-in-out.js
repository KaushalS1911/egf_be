const express = require('express');
const router = express.Router();
const { addChargeInOut, getAllChargesInOut, getSingleChargeInOut, updateChargeInOut, deleteChargeInOut} = require('../controllers/charge-in-out');

router.post('/:companyId/charge', addChargeInOut);
router.get('/:companyId/charge', getAllChargesInOut);
router.get('/:companyId/charge/:chargeId', getSingleChargeInOut);
router.put('/:companyId/charge/:chargeId', updateChargeInOut);
router.delete('/:companyId/charge/:chargeId', deleteChargeInOut);

module.exports = router;
