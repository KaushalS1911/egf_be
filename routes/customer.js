const express = require('express');
const multer = require('multer');
const router = express.Router();
const {createCustomer, getAllCustomers, updateCustomerProfile, updateCustomer, getSingleCustomer ,deleteMultipleCustomers} = require('../controllers/customer')

const storage = multer.memoryStorage();
const upload = multer({storage: storage});

router.post('/',  upload.single('profile-pic') ,createCustomer);
router.get('/', getAllCustomers);
router.delete('/', deleteMultipleCustomers);
router.get('/:customerId', getSingleCustomer);
router.put('/:customerId', updateCustomer);
router.put('/:customerId/profile', upload.single('profile-pic') , updateCustomerProfile);

module.exports = router;
