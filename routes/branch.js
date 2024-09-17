const express = require('express');
const router = express.Router();
const { addBranch, getAllBranches, updateBranch, getSingleBranch,deleteMultipleBranches } = require('../controllers/branch')

router.post('/:companyId/branch', addBranch);
router.get('/:companyId/branch', getAllBranches);
router.get('/:companyId/branch/:branchId', getSingleBranch);
router.put('/:companyId/branch/:branchId', updateBranch);
router.delete('/:companyId/branch', deleteMultipleBranches);

module.exports = router;
