import mongoose from "mongoose";

const ReminderLogSchema = new mongoose.Schema({
  memberId: String,
  memberEmail: String,
  sentAt: Date,
  reminderType: String, // "overdue" or "upcoming"
  amount: String,
  invoiceCount: Number,
  status: { type: String, default: "Delivered" }, // "Delivered" or "Failed"
}, {
  timestamps: true
});

const ReminderLogModel = mongoose.model("reminder-logs", ReminderLogSchema);

export default ReminderLogModel;

