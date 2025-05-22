const PartyModel = require("../models/party");
const PaymentInOutModel = require("../models/payment-in-out");

async function addParty(req, res) {
    try {
        const { companyId } = req.params;

        const party = await PartyModel.create({...req.body, company: companyId});

        return res.status(201).json({ status: 201, message: "Party created successfully", data: party });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function getAllParties(req, res) {
    const { companyId } = req.params;
    const {branchId} = req.query;

    try {
        const query = { company: companyId };
        if (branchId) query.branch = branchId;

        let parties = await PartyModel.find(query)
            .populate('company')
            .populate('branch');

        for (let party of parties) {
            const payments = await PaymentInOutModel.find({party: party._id, deleted_at: null});

            let balance = 0;
            for (const payment of payments) {
                const cashAmount = Number(payment.paymentDetails?.cashAmount || 0);
                const bankAmount = Number(payment.paymentDetails?.bankAmount || 0);
                const totalAmount = cashAmount + bankAmount;

                if (payment.status === "Payment In") {
                    balance -= totalAmount;
                } else if (payment.status === "Payment Out") {
                    balance += totalAmount;
                }
            }

            party.amount = balance;
            await PartyModel.findByIdAndUpdate(party._id, {amount: balance});
        }

        return res.status(200).json({ status: 200, data: parties });
    } catch (err) {
        console.error("Error fetching parties:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function updateParty(req, res) {
    try {
        const { partyId } = req.params;

        const updatedParty = await PartyModel.findByIdAndUpdate(partyId, req.body, { new: true });

        return res.status(200).json({ status: 200, message: "Party updated successfully", data: updatedParty });
    } catch (err) {
        console.error("Error updating party:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function getSingleParty(req, res) {
    const { partyId } = req.params;

    try {
        const party = await PartyModel.findById(partyId)
            .populate('company')
            .populate('branch');

        return res.status(200).json({ status: 200, data: party });
    } catch (err) {
        console.error("Error fetching party:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function deleteParty(req, res) {
    try {
        const { partyId } = req.params;

        await PartyModel.findByIdAndDelete(partyId);

        return res.status(200).json({ status: 200, message: "Party deleted successfully." });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

module.exports = {
    addParty,
    getAllParties,
    updateParty,
    getSingleParty,
    deleteParty
};
