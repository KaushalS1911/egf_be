const express = require('express');
const multer = require('multer');
const router = express.Router();
const {createEmployee, getAllEmployees, updateEmployee, getSingleEmployee ,deleteMultipleEmployees} = require('../controllers/employee')

const storage = multer.memoryStorage();
const upload = multer({storage: storage});

router.post('/:companyId/employee',  upload.single('profile-pic'),createEmployee);
router.get('/:companyId/employee', getAllEmployees);
router.delete('/:companyId/employee', deleteMultipleEmployees);
router.get('/:companyId/employee/:employeeId', getSingleEmployee);
router.put('/:companyId/employee/:employeeId', updateEmployee);

module.exports = router;
