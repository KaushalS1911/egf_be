const express = require('express');
const router = express.Router();
const { addScheme, getAllSchemes, updateScheme, getSingleScheme,deleteMultipleSchemes } = require('../controllers/scheme')

router.post('/', addScheme);
router.get('/', getAllSchemes);
router.get('/:schemeId', getSingleScheme);
router.put('/:schemeId', updateScheme);
router.delete('/', deleteMultipleSchemes);

module.exports = router;
