
const express = require("express");
const axios = require("axios");
const router = express.Router()

router.post("/send-otp", async (req, res) => {
    try{
        const {aadhaar} = req.body
        const options = {
            method: 'POST',
            headers: {
                'x-client-id': process.env.CLIENT_ID,
                'x-client-secret': process.env.CLIENT_SECRET,
                'Content-Type': 'application/json'
            },
            body: `{"aadhaar_number": ${aadhaar} }`
        };
        const refId = await axios(options)
        return res.status(200).json({data: refId, message: "Otp send successfully"})
    }catch (e){
        return res.json(e.response)
    }
})

router.post("/aadhaar-details", async (req, res) => {
    try{
        const {otp, refId} = req.body
        const options = {
            method: 'POST',
            headers: {
                'x-client-id': process.env.CLIENT_ID,
                'x-client-secret': process.env.CLIENT_SECRET,
                'Content-Type': 'application/json'
            },
            body: `{"otp": ${otp},"ref_id":${refId}`
        };
        const aadhaar = await axios(options)
        return res.status(200).json({data: aadhaar, status: 200})
    }catch (e){
        return res.json(e.response)
    }
})


module.exports = router