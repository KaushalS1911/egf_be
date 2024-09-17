const ConfigModel = require("../models/config")

async function getConfigs(req, res) {
    try {
        const { companyId } = req.params;

        const configs = await ConfigModel.find({company: companyId});

        return res.json({ status: 200, data: configs });

    } catch (err) {
        console.log(err);
        return res.json({ status: 500, message: "Internal server error" });
    }
}

async function updateConfig(req, res) {
    try {
        const {configId} = req.params;

        const updatedConfigs = await ConfigModel.findByIdAndUpdate(configId, req.body, {new: true})

        return res.json({status: 200, data: updatedConfigs, message: "Configs updated successfully"})

    } catch (err) {
        console.log(err)
        return res.json({status: 500, message: "Internal server error"})
    }
}

module.exports = {getConfigs, updateConfig}