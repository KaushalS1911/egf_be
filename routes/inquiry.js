const express = require('express');
const router = express.Router();
const { addInquiry, updateInquiry, getAllInquiries, deleteMultipleInquiries, getSingleInquiry} = require('../controllers/inquiry')

router.post('/:companyId/inquiry', addInquiry);
router.get('/:companyId/inquiry', getAllInquiries);
router.get('/:companyId/inquiry/:schemeId', getSingleInquiry);
router.put('/:companyId/inquiry/:schemeId', updateInquiry);
router.delete('/:companyId/inquiry', deleteMultipleInquiries);

module.exports = router;
