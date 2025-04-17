const { execSync } = require('child_process');

function getMacFromIp(ip) {
    try {
        const arpTable = execSync(`arp -a ${ip}`).toString();
        const regex = /(([a-fA-F\d]{1,2}[:-]){5}[a-fA-F\d]{1,2})/;
        const match = arpTable.match(regex);
        return match ? match[0].toUpperCase().replace(/-/g, ':') : null;
    } catch (err) {
        console.error('Error getting MAC from IP:', err.message);
        return null;
    }
}

function macWhitelistMiddleware(req, res, next) {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log('ip', ip)
    const mac = getMacFromIp(ip);
    const whitelist = ["4C-CC-6A-CA-4D-9C","AC-E2-D3-0C-E8-E5"]

    if (!mac) {
        return res.status(403).json({ message: 'Could not resolve MAC address' });
    }

    if (!whitelist.includes(mac)) {
        return res.status(403).json({ message: 'Device not authorized' });
    }

    // MAC is whitelisted
    next();
}

module.exports = macWhitelistMiddleware;
