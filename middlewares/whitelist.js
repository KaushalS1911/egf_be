const os = require('os');
const ConfigModel = require('../models/config');

async function macWhitelistMiddleware(req, res, next) {
    const mac = os.networkInterfaces().Ethernet.filter(e => e.family === 'IPv4')[0].mac.toUpperCase()
    const whitelistedDevices = await ConfigModel.find()
    const whitelist = ["4C:CC:6A:CA:4D:9C", "AC:E2:D3:0C:E8:E5"]
    if (!mac) {
        return res.status(403).json({ message: 'Could not resolve MAC address' });
    }

    if (!whitelist.includes(mac)) {
        return res.status(403).json({ message: 'Device not authorized' });
    }

    next();
}

module.exports = macWhitelistMiddleware;
