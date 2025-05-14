const PaymentInOutModel = require("../models/payment-in-out");
const { uploadFile } = require("../helpers/avatar");
const { uploadDir } = require("../constant");

async function addPaymentInOut(req, res) {
    try {
        const { companyId } = req.params;
        const { branch } = req.query;

        const invoice = req.file && req.file.buffer
            ? await uploadFile(req.file.buffer, uploadDir.PAYMENT_IN_OUT, req.file.originalname)
            : '';

        const paymentInOut = await PaymentInOutModel.create({
            ...req.body,
            company: companyId,
            branch,
            invoice
        });

        return res.status(201).json({
            status: 201,
            message: "Payment In/Out created successfully",
            data: paymentInOut
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function getAllPaymentInOut(req, res) {
    const { companyId } = req.params;
    const { branch } = req.query;

    try {
        const query = { company: companyId };
        if (branch) query.branch = branch;

        const payments = await PaymentInOutModel.find(query)
            .populate('company')
            .populate('branch');

        return res.status(200).json({ status: 200, data: payments });
    } catch (err) {
        console.error("Error fetching payments:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function getSinglePaymentInOut(req, res) {
    const { paymentId } = req.params;

    try {
        const payment = await PaymentInOutModel.findById(paymentId)
            .populate('company')
            .populate('branch');

        if (!payment) {
            return res.status(404).json({ status: 404, message: "Payment not found" });
        }

        return res.status(200).json({ status: 200, data: payment });
    } catch (err) {
        console.error("Error fetching payment:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function updatePaymentInOut(req, res) {
    try {
        const { paymentId } = req.params;

        const invoice = req.file && req.file.buffer
            ? await uploadFile(req.file.buffer, uploadDir.PAYMENT_IN_OUT, req.file.originalname)
            : '';

        const payload = { ...req.body };
        if (invoice) payload.invoice = invoice;

        const updatedPayment = await PaymentInOutModel.findByIdAndUpdate(
            paymentId,
            payload,
            { new: true }
        );

        return res.status(200).json({
            status: 200,
            message: "Payment In/Out updated successfully",
            data: updatedPayment
        });
    } catch (err) {
        console.error("Error updating payment:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function deletePaymentInOut(req, res) {
    try {
        const { paymentId } = req.params;

        const payment = await PaymentInOutModel.findByIdAndDelete(paymentId);

        if (!payment) {
            return res.status(404).json({ status: 404, message: "Payment not found" });
        }

        return res.status(200).json({ status: 200, message: "Payment deleted successfully" });
    } catch (err) {
        console.error("Error deleting payment:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

module.exports = {
    addPaymentInOut,
    getAllPaymentInOut,
    updatePaymentInOut,
    getSinglePaymentInOut,
    deletePaymentInOut
};
