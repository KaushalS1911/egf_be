const express = require('express');
const router = express.Router();
const { addScheme, getAllSchemes, updateScheme, getSingleScheme,deleteMultipleSchemes } = require('../controllers/scheme')

router.post('/:companyId/branch/:branchId/scheme', addScheme);
router.get('/:companyId/branch/:branchId/scheme', getAllSchemes);
router.get('/:companyId/branch/:branchId/scheme/:schemeId', getSingleScheme);
router.put('/:companyId/branch/:branchId/scheme/:schemeId', updateScheme);
router.delete('/:companyId/branch/:branchId/scheme', deleteMultipleSchemes);

module.exports = router;
