
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { updateCompany,getSingleCompany,updateCompanyLogo } = require('../controllers/company')

const storage = multer.memoryStorage();
const upload = multer({storage: storage});

router.put('/:companyId', updateCompany);
router.get('/:companyId', getSingleCompany);
router.get('/:companyId/update-logo',upload.single("company-logo") ,updateCompanyLogo);

module.exports = router;
