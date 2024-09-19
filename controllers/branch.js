const BranchModel = require("../models/branch")


async function addBranch(req, res) {
    try {
        const {companyId} = req.params;

        const {name, email,contact, address} = req.body

        const isBranchExist = await BranchModel.exists({
            company: companyId,
            name,
            email,
            contact,
            deleted_at: null
        })

        if(isBranchExist) return res.json({status: 400, message: "Branch already exist"})

        const branchCount = await BranchModel.countDocuments({company: companyId, deleted_at: null});

        const nextBranchSeq = branchCount + 1;

        const paddedSeq = nextBranchSeq.toString().padStart(3, '0');

        const branchCode = `${paddedSeq}`;

        const branch = await BranchModel.create({
            company: companyId, name, email, contact, branchCode, address
        })

        return res.json({status: 200, data: branch, message: "Branch created successfully"})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function getAllBranches(req, res) {
    try {
        const {companyId, branchId} = req.params;

        const branches = await BranchModel.find({
            company: companyId,
            deleted_at: null
        }).populate("company")

        return res.json({status: 200, data: branches})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}


async function updateBranch(req, res) {
    try {
        const {branchId} = req.params;

        const updatedBranch = await BranchModel.findByIdAndUpdate(branchId, req.body, {new: true})

        return res.json({status: 200, data: updatedBranch, message: "Branch updated successfully"})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function getSingleBranch(req, res) {
    try {
        const {branchId} = req.params;

        const branch = await BranchModel.findById(branchId).populate("company")

        return res.json({status: 200, data: branch})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function deleteMultipleBranches (req,res){
    try{
        const {ids} = req.body;
        await BranchModel.updateMany(
            { _id: { $in: ids } },
            { $set: { deleted_at: new Date() } }
        );
        return res.json({status: 200, message: "Branch deleted successfully"});
    }catch (err){
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

module.exports = {addBranch, getAllBranches,updateBranch,getSingleBranch, deleteMultipleBranches}