const express = require('express');
const router = express.Router();
const { addProperty, getAllProperties,updateProperty,getSingleProperty, deleteMultipleProperties } = require('../controllers/property')

router.post('/:companyId/property', addProperty);
router.get('/:companyId/property', getAllProperties);
router.get('/:companyId/property/:propertyId', getSingleProperty);
router.put('/:companyId/property/:propertyId', updateProperty);
router.delete('/:companyId/property', deleteMultipleProperties);

module.exports = router;
