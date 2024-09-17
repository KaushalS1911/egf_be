const express = require('express');
const router = express.Router();
const { addPenalty, getAllPenalties,updatePenalty,getSinglePenalty, deleteMultiplePenalties } = require('../controllers/penalty')

router.post('/:companyId/penalty', addPenalty);
router.get('/:companyId/penalty', getAllPenalties);
router.get('/:companyId/penalty/:penaltyId', getSinglePenalty);
router.put('/:companyId/penalty/:penaltyId', updatePenalty);
router.delete('/:companyId/penalty', deleteMultiplePenalties);

module.exports = router;
