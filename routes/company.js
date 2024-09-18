
const express = require('express');
const router = express.Router();
const { updateCompany,getSingleCompany } = require('../controllers/company')

router.put('/:companyId', updateCompany);
router.get('/:companyId', getSingleCompany);

module.exports = router;
