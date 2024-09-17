const express = require('express');
const multer = require('multer');
const router = express.Router();
const {createCustomer, getAllCustomers, updateCustomerProfile, updateCustomer, getSingleCustomer ,deleteMultipleCustomers} = require('../controllers/customer')

const storage = multer.memoryStorage();
const upload = multer({storage: storage});

router.post('/:companyId/branch/:branchId/customer',  upload.single('profile-pic') ,createCustomer);
router.get('/:companyId/branch/:branchId/customer', getAllCustomers);
router.delete('/:companyId/branch/:branchId/customer', deleteMultipleCustomers);
router.get('/:companyId/branch/:branchId/customer/:customerId', getSingleCustomer);
router.put('/:companyId/branch/:branchId/customer/:customerId', updateCustomer);
router.put('/:companyId/branch/:branchId/customer/:customerId/profile', upload.single('profile-pic') , updateCustomerProfile);

module.exports = router;
