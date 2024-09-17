const express = require('express');
const multer = require('multer');
const router = express.Router();
const {createEmployee, getAllEmployees, updateEmployee, getSingleEmployee ,deleteMultipleEmployees} = require('../controllers/employee')

const storage = multer.memoryStorage();
const upload = multer({storage: storage});

router.post('/:companyId/branch/:branchId/employee',  upload.single('profile-pic'),createEmployee);
router.get('/:companyId/branch/:branchId/employee', getAllEmployees);
router.delete('/:companyId/branch/:branchId/employee', deleteMultipleEmployees);
router.get('/:companyId/branch/:branchId/employee/:employeeId', getSingleEmployee);
router.put('/:companyId/branch/:branchId/employee/:employeeId', updateEmployee);

module.exports = router;
