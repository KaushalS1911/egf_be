const express = require('express');
const multer = require('multer');
const router = express.Router();
const {createCustomer, getAllCustomers, updateCustomerProfile, updateCustomer, getSingleCustomer ,deleteMultipleCustomers} = require('../controllers/customer')

const storage = multer.memoryStorage();
const upload = multer({storage: storage});

router.post('/:companyId/customer',  upload.single('profile-pic') ,createCustomer);
router.get('/:companyId/customer', getAllCustomers);
router.delete('/:companyId/customer', deleteMultipleCustomers);
router.get('/:companyId/customer/:customerId', getSingleCustomer);
router.put('/:companyId/customer/:customerId', updateCustomer);
router.put('/:companyId/customer/:customerId/profile', upload.single('profile-pic') , updateCustomerProfile);

module.exports = router;
