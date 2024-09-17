const jwt = require("jsonwebtoken");

async function verifyToken(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return reject(err);
            }
            return resolve(decoded);
        });
    });
}

async function verifyRefreshToken(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
            if (err) {
                return reject(err);
            }
            return resolve(decoded);
        });
    });
}

function signLoginToken(userId) {
    return jwt.sign(
        {
            id: userId,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN,
        }
    );
}

function signRefreshToken(userId) {
    return jwt.sign(
        {
            id: userId,
        },
        process.env.JWT_REFRESH_SECRET,
        {
            expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
        }
    );
}
const appJwt = {
    verifyToken,
    signLoginToken,
    signRefreshToken,
    verifyRefreshToken,
};

module.exports = appJwt;
