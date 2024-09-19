const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
    },
});

async function sendMail(htmlContent,data){

    await transporter.sendMail({
        from: process.env.EMAIL,
        to: data.email,
        subject: data.subject,
        html: htmlContent,
        attachments: [
            {
                filename: 'logo.png',
                path: data.logo,
                cid: 'logo@company.com'
            }
        ]
    });
}

module.exports = {sendMail}