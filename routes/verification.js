
const express = require("express");
const axios = require("axios");
const router = express.Router()

router.post("/send-otp", async (req, res) => {
    try {
        const { aadhaar } = req.body;

        if (!aadhaar) {
            return res.status(400).json({ message: "Aadhaar number is required" });
        }

        const response = await axios.post(
            "https://api.cashfree.com/verification/offline-aadhaar/otp", // Replace with the correct URL
            { aadhaar_number: aadhaar },
            {
                headers: {
                    "x-client-id": process.env.CLIENT_ID,
                    "x-client-secret": process.env.CLIENT_SECRET,
                    "Content-Type": "application/json",
                },
            }
        );

        const refId = response.data.ref_id;
        return res.status(200).json({ data: refId, message: "OTP sent successfully" });
    } catch (error) {
        const status = error.response?.status || 500;
        const errorMessage = error.response?.data || { message: "An error occurred" };
        return res.status(status).json(errorMessage);
    }
});


router.post("/aadhaar-details", async (req, res) => {
    try {
        const { otp, refId } = req.body;

        if (!otp || !refId) {
            return res.status(400).json({ message: "OTP and refId are required" });
        }

        const response = await axios.post(
            "https://api.cashfree.com/verification/offline-aadhaar/verify",
            { otp: otp.toString(), ref_id: refId },
            {
                headers: {
                    "x-client-id": process.env.CLIENT_ID,
                    "x-client-secret": process.env.CLIENT_SECRET,
                    "Content-Type": "application/json",
                },
            }
        );

        return res.status(200).json({ data: response.data, status: 200 });
    } catch (error) {
        const status = error.response?.status || 500;
        const errorMessage = error.response?.data || { message: "An error occurred" };
        return res.status(status).json(errorMessage);
    }
});


module.exports = router