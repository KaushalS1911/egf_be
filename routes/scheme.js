const express = require('express');
const router = express.Router();
const { addScheme, getAllSchemes, updateScheme, getSingleScheme,deleteMultipleSchemes } = require('../controllers/scheme')

router.post('/:companyId/scheme', addScheme);
router.get('/:companyId/scheme', getAllSchemes);
router.get('/:companyId/scheme/:schemeId', getSingleScheme);
router.put('/:companyId/scheme/:schemeId', updateScheme);
router.delete('/:companyId/scheme', deleteMultipleSchemes);

module.exports = router;
