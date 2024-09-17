const express = require('express');
const router = express.Router();
const { addInquiry, updateInquiry, getAllInquiries, deleteMultipleInquiries, getSingleInquiry} = require('../controllers/inquiry')

router.post('/:companyId/branch/:branchId/inquiry', addInquiry);
router.get('/:companyId/branch/:branchId/inquiry', getAllInquiries);
router.get('/:companyId/branch/:branchId/inquiry/:schemeId', getSingleInquiry);
router.put('/:companyId/branch/:branchId/inquiry/:schemeId', updateInquiry);
router.delete('/:companyId/branch/:branchId/inquiry', deleteMultipleInquiries);

module.exports = router;
