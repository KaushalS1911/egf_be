const ConfigModel = require("../models/config");

async function getConfigs(req, res) {
    try {
        const { companyId } = req.params;

        const configs = await ConfigModel.find({ company: companyId }).populate("company");

        if (!configs.length) {
            return res.status(404).json({ status: 404, message: "No configurations found for this company." });
        }

        return res.status(200).json({ status: 200, data: configs });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function updateConfig(req, res) {
    try {
        const { configId } = req.params;

        const updatedConfig = await ConfigModel.findByIdAndUpdate(configId, req.body, { new: true });

        if (!updatedConfig) {
            return res.status(404).json({ status: 404, message: "Configuration not found." });
        }

        return res.status(200).json({ status: 200, data: updatedConfig, message: "Configs updated successfully" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

module.exports = { getConfigs, updateConfig };
