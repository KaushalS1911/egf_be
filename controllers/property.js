const PropertyModel = require("../models/property");

async function addProperty(req, res) {
    const { companyId } = req.params;
    const { propertyType, loanType, quantity, isQtyEdit, remark } = req.body;

    try {
        const isPropertyExist = await PropertyModel.exists({
            company: companyId,
            propertyType,
            loanType,
            deleted_at: null
        });

        if (isPropertyExist) {
            return res.status(400).json({ status: 400, message: "Property details already exist" });
        }

        const property = await PropertyModel.create({
            company: companyId,
            propertyType,
            loanType,
            quantity,
            isQtyEdit,
            remark
        });

        return res.status(201).json({ status: 201, data: property, message: "Property details created successfully" });
    } catch (err) {
        console.error("Error adding property:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function getAllProperties(req, res) {
    const { companyId } = req.params;

    try {
        const properties = await PropertyModel.find({
            company: companyId,
            deleted_at: null
        }).populate("company");

        return res.status(200).json({ status: 200, data: properties });
    } catch (err) {
        console.error("Error fetching properties:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function updateProperty(req, res) {
    const { propertyId } = req.params;

    try {
        const updatedProperty = await PropertyModel.findByIdAndUpdate(propertyId, req.body, { new: true });

        if (!updatedProperty) {
            return res.status(404).json({ status: 404, message: "Property not found" });
        }

        return res.status(200).json({ status: 200, data: updatedProperty, message: "Property detail updated successfully" });
    } catch (err) {
        console.error("Error updating property:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function getSingleProperty(req, res) {
    const { propertyId } = req.params;

    try {
        const property = await PropertyModel.findById(propertyId).populate("company");

        if (!property) {
            return res.status(404).json({ status: 404, message: "Property not found" });
        }

        return res.status(200).json({ status: 200, data: property });
    } catch (err) {
        console.error("Error fetching property:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function deleteMultipleProperties(req, res) {
    const { ids } = req.body;

    try {
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ status: 400, message: "No property IDs provided" });
        }

        const result = await PropertyModel.updateMany(
            { _id: { $in: ids } },
            { $set: { deleted_at: new Date() } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ status: 404, message: "No properties found for the provided IDs" });
        }

        return res.status(200).json({ status: 200, message: "Property details deleted successfully" });
    } catch (err) {
        console.error("Error deleting properties:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

module.exports = { addProperty, getAllProperties, updateProperty, getSingleProperty, deleteMultipleProperties };
