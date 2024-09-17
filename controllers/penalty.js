const PenaltyModel = require("../models/penalty")


async function addPenalty(req, res) {
    try {
        const {companyId} = req.params;

        const {afterDueDateFromDate, afterDueDateToDate,penaltyInterest,remark} = req.body

        const isPenaltyExist = await PenaltyModel.exists({
            company: companyId,
            afterDueDateFromDate, afterDueDateToDate,penaltyInterest,
            deleted_at: null
        })

        if(isPenaltyExist) return res.json({status: 400, message: "Penalty already exist"})

        const penaltyCount = await PenaltyModel.countDocuments({company: companyId, deleted_at: null});

        const nextPenaltySeq = penaltyCount + 1;

        const paddedSeq = nextPenaltySeq.toString().padStart(3, '0');

        const penaltyCode = `P${paddedSeq}`;

        const penalty = await PenaltyModel.create({
            company: companyId, afterDueDateFromDate, afterDueDateToDate,penaltyInterest, penaltyCode
        })

        return res.json({status: 200, data: penalty, message: "Penalty detail created successfully"})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function getAllPenalties(req, res) {
    try {
        const {companyId, penaltyId} = req.params;

        const penalties = await PenaltyModel.find({
            company: companyId,
            deleted_at: null
        }).populate("company")

        return res.json({status: 200, data: penalties})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}


async function updatePenalty(req, res) {
    try {
        const {companyId, penaltyId} = req.params;

        const updatedPenalty = await PenaltyModel.findByIdAndUpdate(penaltyId, req.body, {new: true})

        return res.json({status: 200, data: updatedPenalty, message: "Penalty updated successfully"})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function getSinglePenalty(req, res) {
    try {
        const {companyId, penaltyId} = req.params;

        const penalty = await PenaltyModel.findById(penaltyId).populate("company")

        return res.json({status: 200, data: penalty})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function deleteMultiplePenalties (req,res){
    try{
        const {ids} = req.body;
        await PenaltyModel.updateMany(
            { _id: { $in: ids } },
            { $set: { deleted_at: new Date() } }
        );
        return res.json({status: 200, message: "Penalty deleted successfully"});
    }catch (err){
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

module.exports = {addPenalty, getAllPenalties,updatePenalty,getSinglePenalty, deleteMultiplePenalties}