import mongoose from "mongoose";

const ExpenseSchema = new mongoose.Schema({
  categoryId: String,
  categoryName: { type: String, required: true },
  description: String,
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  paymentMode: { type: String, required: true },
  attachment: String,
  attachmentFileName: String,
  organization_id: String,
}, {
  timestamps: true
});

const ExpenseModel = mongoose.model("expenses", ExpenseSchema);

export default ExpenseModel;

