import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  id: String,
  name: String,
  email: String,
  phone: String,
  password: String,  // Add password field for member login
  status: String,
  balance: String,
  nextDue: String,  // Keep for backward compatibility
  lastPayment: String,  // Keep for backward compatibility
  // New date fields for payment tracking
  start_date: { type: Date, default: null },
  last_payment_date: { type: Date, default: null },
  next_due_date: { type: Date, default: null },
  // Subscription payment fields
  payment_status: { type: String, default: "unpaid" }, // "unpaid" or "paid"
  payment_mode: { type: String, default: null }, // "online" or "cash"
  payment_proof: { type: String, default: null }, // URL to payment proof image
  subscriptionType: { type: String, default: "Lifetime" },
  // Account lockout fields
  failedLoginAttempts: { type: Number, default: 0 },
  lockoutUntil: { type: Date, default: null },
}, {
  timestamps: true  // Automatically adds createdAt and updatedAt fields
});

const UserModel = mongoose.model("members", UserSchema);

export default UserModel;

