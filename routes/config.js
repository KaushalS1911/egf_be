const express = require('express');
const router = express.Router();
const { getConfigs, updateConfig } = require('../controllers/config')

router.get('/:companyId/config', getConfigs);
router.put('/:companyId/config/:configId', updateConfig);

module.exports = router;
