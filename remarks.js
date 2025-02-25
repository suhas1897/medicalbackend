const mongoose = require("mongoose");

const RemarkSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    remarks: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Remark = mongoose.model("Remark", RemarkSchema);

module.exports = Remark;
