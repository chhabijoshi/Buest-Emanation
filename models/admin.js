const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  password: {
    type: String,
    required: true
  },

  role: {
    type: String,
    enum: ["admin", "superadmin"],
    default: "admin"
  },

  isActive: {
    type: Boolean,
    default: true
  },

  mustChangePassword: {
    type: Boolean,
    default: true
  },

  lastLogin: {
    type: Date
  }

}, { timestamps: true });


// 🔐 Hash password before saving
adminSchema.pre("save", async function() {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 10);
});

// 🔑 Compare password during login
adminSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("Admin", adminSchema);