const express = require('express');
const router = express.Router();

const {
    addTransfer,
    getAllTransfers,
    getTransferById,
    updateTransfer,
    deleteTransfer
} = require("../controllers/transfer");

router.post('/:companyId/transfer', addTransfer);
router.get('/:companyId/transfer', getAllTransfers);
router.get('/:companyId/transfer/:id', getTransferById);
router.put('/:companyId/transfer/:id', updateTransfer);
router.delete('/:companyId/transfer/:id', deleteTransfer);

module.exports = router;
