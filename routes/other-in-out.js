const express = require('express');
const router = express.Router();

const {
    addOtherInOut,
    getAllOtherInOuts,
    getOtherInOutById,
    updateOtherInOut,
    deleteOtherInOut
} = require("../controllers/other-in-out");

router.post('/:companyId/other-in-out', addOtherInOut);
router.get('/:companyId/other-in-out', getAllOtherInOuts);
router.get('/:companyId/other-in-out/:id', getOtherInOutById);
router.put('/:companyId/other-in-out/:id', updateOtherInOut);
router.delete('/:companyId/other-in-out/:id', deleteOtherInOut);

module.exports = router;
