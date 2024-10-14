const ReminderModel = require("../models/reminder");

async function addReminder(req, res) {
    const { companyId } = req.params;
    try {

        const reminder = await ReminderModel.create({...req.body, company: companyId});

        return res.status(201).json({ status: 201, data: reminder, message: "Reminder created successfully" });
    } catch (err) {
        console.error("Error adding reminder:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function getAllReminders(req, res) {
    const { companyId } = req.params;

    try {
        const reminders = await ReminderModel.find({
            company: companyId,
            deleted_at: null,
        }).populate("company").populate('loan');

        return res.status(200).json({ status: 200, data: reminders });
    } catch (err) {
        console.error("Error fetching reminders:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function updateReminder(req, res) {
    const { reminderId } = req.params;

    try {
        const updatedReminder = await ReminderModel.findByIdAndUpdate(reminderId, req.body, { new: true });

        if (!updatedReminder) {
            return res.status(404).json({ status: 404, message: "Reminder not found" });
        }

        return res.status(200).json({ status: 200, data: updatedReminder, message: "Reminder updated successfully" });
    } catch (err) {
        console.error("Error updating reminder:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function getSingleReminder(req, res) {
    const { reminderId } = req.params;

    try {
        const reminder = await ReminderModel.findById(reminderId).populate("company").populate('loan');

        if (!reminder) {
            return res.status(404).json({ status: 404, message: "Reminder not found" });
        }

        return res.status(200).json({ status: 200, data: reminder });
    } catch (err) {
        console.error("Error fetching reminder:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

async function deleteMultipleReminders(req, res) {
    try {
        const { ids } = req.body;

        if (!ids || !ids.length) {
            return res.status(400).json({ status: 400, message: "No IDs provided" });
        }

        await ReminderModel.updateMany(
            { _id: { $in: ids } },
            { $set: { deleted_at: new Date() } }
        );

        return res.status(200).json({ status: 200, message: "Reminders deleted successfully" });
    } catch (err) {
        console.error("Error deleting reminders:", err.message);
        return res.status(500).json({ status: 500, message: "Internal server error" });
    }
}

module.exports = { addReminder, getAllReminders, updateReminder, getSingleReminder, deleteMultipleReminders };
