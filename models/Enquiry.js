const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema(
{
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
    required: true
  },

  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true
  },

  phone: {
    type: String,
    required: true
  },

  message: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ["unread", "read"],
    default: "unread"
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("Enquiry", enquirySchema);