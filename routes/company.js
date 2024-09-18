
const express = require('express');
const router = express.Router();
const { updateCompany } = require('../controllers/company')

router.put('/:companyId', updateCompany);

module.exports = router;
