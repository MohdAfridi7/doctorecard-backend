const mongoose = require("mongoose");

const adminEnquirySchema = new mongoose.Schema(
{
  name: String,
  email: String,
  phone: String,
  message: String,
  status: {
    type: String,
    enum: ["read", "unread"],
    default: "unread"
  }
},
{ timestamps: true }
);

module.exports = mongoose.model("AdminEnquiry", adminEnquirySchema);