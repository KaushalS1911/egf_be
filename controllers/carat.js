const CaratModel = require("../models/carat")


async function addCarat(req, res) {
    try {
        const {companyId} = req.params;

        const {name,caratPercentage,remark} = req.body

        const isCaratExist = await CaratModel.exists({
            company: companyId,
            name,
            deleted_at: null
        })

        if(isCaratExist) return res.json({status: 400, message: "Carat details already exist"})

        const carat = await CaratModel.create({
            company: companyId, name, caratPercentage,remark
        })

        return res.json({status: 200, data: carat, message: "Carat details created successfully"})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function getAllCarats(req, res) {
    try {
        const {companyId} = req.params;

        const carats = await CaratModel.find({
            company: companyId,
            deleted_at: null
        }).populate("company")

        return res.json({status: 200, data: carats})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}


async function updateCarat(req, res) {
    try {
        const {companyId, caratId} = req.params;

        const updatedCarat = await CaratModel.findByIdAndUpdate(caratId, req.body, {new: true})

        return res.json({status: 200, data: updatedCarat, message: "Carat updated successfully"})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function getSingleCarat(req, res) {
    try {
        const {companyId, caratId} = req.params;

        const carat = await CaratModel.findById(caratId).populate("company")

        return res.json({status: 200, data: carat})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function deleteMultipleCarats (req,res){
    try{
        const {ids} = req.body;
        await CaratModel.updateMany(
            { _id: { $in: ids } },
            { $set: { deleted_at: new Date() } }
        );
        return res.json({status: 200, message: "Carat detail deleted successfully"});
    }catch (err){
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

module.exports = {addCarat, getAllCarats,updateCarat,getSingleCarat, deleteMultipleCarats}