const express = require('express');
const router = express.Router();
const {
    addParty,
    getAllParties,
    updateParty,
    getSingleParty,
    deleteParty
} = require('../controllers/party');

router.post('/:companyId/party', addParty);
router.get('/:companyId/party', getAllParties);
router.get('/:companyId/party/:partyId', getSingleParty);
router.put('/:companyId/party/:partyId', updateParty);
router.delete('/:companyId/party/:partyId', deleteParty);

module.exports = router;
