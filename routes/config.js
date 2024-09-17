const express = require('express');
const router = express.Router();
const { getConfigs, updateConfig } = require('../controllers/config')

router.get('/:companyId/config', getConfigs);
router.get('/:companyId/config/:configId', updateConfig);

module.exports = router;
