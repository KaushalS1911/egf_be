const PropertyModel = require("../models/property")


async function addProperty(req, res) {
    try {
        const {companyId} = req.params;

        const {propertyType, loanType, quantity, isQtyEdit, remark} = req.body

        const isPropertyExist = await PropertyModel.exists({
            company: companyId,
            propertyType,
            loanType,
            deleted_at: null
        })

        if(isPropertyExist) return res.json({status: 400, message: "Property details already exist"})

        const property = await PropertyModel.create({
            company: companyId, propertyType, loanType, quantity,isQtyEdit, remark
        })

        return res.json({status: 200, data: property, message: "Property details created successfully"})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function getAllProperties(req, res) {
    try {
        const {companyId} = req.params;

        const properties = await PropertyModel.find({
            company: companyId,
            deleted_at: null
        }).populate("company")

        return res.json({status: 200, data: properties})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}


async function updateProperty(req, res) {
    try {
        const {companyId, propertyId} = req.params;

        const updatedProperty = await PropertyModel.findByIdAndUpdate(propertyId, req.body, {new: true})

        return res.json({status: 200, data: updatedProperty, message: "Property detail updated successfully"})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function getSingleProperty(req, res) {
    try {
        const {companyId, propertyId} = req.params;

        const property = await PropertyModel.findById(propertyId).populate("company")

        return res.json({status: 200, data: property})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

async function deleteMultipleProperties (req,res){
    try{
        const {ids} = req.body;
        await PropertyModel.updateMany(
            { _id: { $in: ids } },
            { $set: { deleted_at: new Date() } }
        );
        return res.json({status: 200, message: "Property detail deleted successfully"});
    }catch (err){
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

module.exports = {addProperty, getAllProperties,updateProperty,getSingleProperty, deleteMultipleProperties}