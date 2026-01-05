import express from "express";
import { ensureConnection } from "../config/database.js";
import UserModel from "../models/User.js";
import InvoiceModel from "../models/Invoice.js";
import { calculateAndUpdateMemberBalance } from "../utils/balance.js";
import { sendAccountApprovalEmail } from "../utils/emailHelpers.js";
import { addOneYear, parseDateString, formatDateForInput } from "../utils/dateHelpers.js";

const router = express.Router();

// GET all members
router.get("/", async (req, res) => {
  try {
    await ensureConnection();
    const members = await UserModel.find({}).sort({ createdAt: -1 }).lean();
    res.json(members);
  } catch (error) {
    console.error("Error fetching members:", error);
    res.status(500).json({ error: error.message});
  }
});

// GET total members count
router.get("/count", async (req, res) => {
  try {
    await ensureConnection();
    const count = await UserModel.countDocuments();
    res.json({ total : count})
  } catch (error) {
    console.error("Error fetching members:", error);
    res.status(500).json({ error: error.message});
  }
});

// GET single member
router.get("/:id", async (req, res) => {
  try {
    await ensureConnection();
    const member = await UserModel.findOne({ id: req.params.id });
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }
    res.json(member);
  } catch (error) {
    console.error("Error fetching member:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST create new member
router.post("/", async (req, res) => {
  try {
    await ensureConnection();
    // Generate ID if not provided
    let memberId = req.body.id;
    if (!memberId) {
      memberId = `HK${Math.floor(1000 + Math.random() * 9000)}`;
    }
    
    // Check if ID already exists
    const existing = await UserModel.findOne({ id: memberId });
    if (existing) {
      return res.status(400).json({ message: "Member ID already exists" });
    }
    
    // Handle start_date - default to today if not provided
    let startDate = null;
    if (req.body.start_date) {
      startDate = parseDateString(req.body.start_date);
      if (!startDate) {
        return res.status(400).json({ message: "Invalid start_date format. Use YYYY-MM-DD" });
      }
    } else {
      // Default to today
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0); // Set to start of day
    }
    
    // For new members: payment_status = unpaid, next_due_date = null
    const newMember = new UserModel({
      id: memberId,
      name: req.body.name || '',
      email: (req.body.email || '').trim().toLowerCase(),
      phone: req.body.phone || '',
      password: req.body.password || '',
      status: req.body.status || 'Pending',
      balance: req.body.balance || '$0',
      nextDue: req.body.nextDue || '',  // Keep for backward compatibility
      lastPayment: req.body.lastPayment || '',  // Keep for backward compatibility
      start_date: startDate,
      last_payment_date: null,
      next_due_date: null, // Set to null for unpaid members
      payment_status: "unpaid", // Set to unpaid for new members
      payment_mode: null,
      payment_proof: null,
      subscriptionType: req.body.subscriptionType || 'Lifetime',
    });
    
    const savedMember = await newMember.save();

    // Check if invoice already exists for this member (prevent duplicates)
    const existingInvoice = await InvoiceModel.findOne({ 
      memberId: savedMember.id,
      status: { $in: ["Unpaid", "Pending Verification"] }
    });
    
    // Only create invoice if one doesn't already exist
    if (!existingInvoice) {
      // Create initial invoice based on subscription type
      const subscriptionType = req.body.subscriptionType || 'Lifetime';
      let invoiceAmount = '$250';
      let invoicePeriod = 'Lifetime Subscription';
      let dueDate = new Date();
      
      if (subscriptionType === 'Yearly + Janaza Fund') {
        invoiceAmount = '$500';
        invoicePeriod = 'Yearly Subscription + Janaza Fund';
      }
      // Both types are yearly, set due date to 1 year from now
      dueDate.setFullYear(dueDate.getFullYear() + 1);
      
      // Format due date as "DD MMM YYYY"
      const dueDateFormatted = dueDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).replace(',', '');
      
      // Create invoice
      const invoiceData = {
        id: `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        memberId: savedMember.id,
        memberName: savedMember.name,
        memberEmail: savedMember.email,
        period: invoicePeriod,
        amount: invoiceAmount,
        status: "Unpaid",
        due: dueDateFormatted,
        method: "",
        reference: "",
      };
      
      const newInvoice = new InvoiceModel(invoiceData);
      await newInvoice.save();
      console.log(`✓ Invoice created for new member ${savedMember.name} (${savedMember.id}): ${invoiceData.id}`);
    } else {
      console.log(`⚠ Invoice already exists for member ${savedMember.name} (${savedMember.id}), skipping duplicate creation`);
    }
    
    // Update member balance (this will also format it like "$250.00 Outstanding")
    await calculateAndUpdateMemberBalance(savedMember.id);

    // Fetch the updated member with the computed balance so frontend sees correct outstanding
    const updatedMember = await UserModel.findOne({ id: savedMember.id });
    
    res.status(201).json(updatedMember);
  } catch (error) {
    console.error("Error creating member:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email or ID already exists" });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT approve member account
router.put("/:id/approve", async (req, res) => {
  try {
    await ensureConnection();
    
    const member = await UserModel.findOne({ id: req.params.id });
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    // Update member status to Active
    member.status = "Active";
    await member.save();

    // Send approval email
    await sendAccountApprovalEmail(member);

    res.json({ success: true, member });
  } catch (error) {
    console.error("Error approving member:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT update member
router.put("/:id", async (req, res) => {
  try {
    await ensureConnection();
    // Ensure email is lowercase if being updated
    const updateData = { ...req.body };
    if (updateData.email) {
      updateData.email = updateData.email.trim().toLowerCase();
    }
    
    // Handle start_date update - if provided, recalculate next_due_date
    if (updateData.start_date) {
      const startDate = parseDateString(updateData.start_date);
      if (!startDate) {
        return res.status(400).json({ message: "Invalid start_date format. Use YYYY-MM-DD" });
      }
      updateData.start_date = startDate;
      // Only recalculate next_due_date if last_payment_date doesn't exist
      // (if there's a payment, next_due_date should be based on last_payment_date)
      const existingMember = await UserModel.findOne({ id: req.params.id });
      if (!existingMember || !existingMember.last_payment_date) {
        updateData.next_due_date = addOneYear(startDate);
      }
    }
    
    const member = await UserModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }
    
    res.json(member);
  } catch (error) {
    console.error("Error updating member:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email already exists" });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT mark payment as paid (legacy - kept for backward compatibility)
router.put("/:id/mark-paid", async (req, res) => {
  try {
    await ensureConnection();
    
    const member = await UserModel.findOne({ id: req.params.id });
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }
    
    // Set last_payment_date to current date
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Set to start of day
    
    // Calculate next_due_date as exactly 1 year after last_payment_date
    const nextDueDate = addOneYear(currentDate);
    
    // Update member
    member.last_payment_date = currentDate;
    member.next_due_date = nextDueDate;
    await member.save();
    
    res.json({ success: true, member });
  } catch (error) {
    console.error("Error marking payment as paid:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT confirm subscription payment (new endpoint for subscription management)
router.put("/:id/confirm-subscription-payment", async (req, res) => {
  try {
    await ensureConnection();
    
    const member = await UserModel.findOne({ id: req.params.id });
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }
    
    // Get payment details from request
    const { payment_mode, payment_proof } = req.body;
    
    if (!payment_mode || !['online', 'cash'].includes(payment_mode)) {
      return res.status(400).json({ message: "Invalid payment_mode. Must be 'online' or 'cash'" });
    }
    
    if (!payment_proof) {
      return res.status(400).json({ message: "Payment proof is required" });
    }
    
    // Set last_payment_date to exact date/time of confirmation
    const currentDate = new Date();
    
    // Calculate next_due_date as exactly 1 year after last_payment_date
    const nextDueDate = addOneYear(currentDate);
    
    // Update member with all payment information
    member.payment_status = "paid";
    member.payment_mode = payment_mode;
    member.payment_proof = payment_proof;
    member.last_payment_date = currentDate;
    member.next_due_date = nextDueDate;
    await member.save();
    
    res.json({ success: true, member });
  } catch (error) {
    console.error("Error confirming subscription payment:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE member
router.delete("/:id", async (req, res) => {
  try {
    await ensureConnection();
    const member = await UserModel.findOneAndDelete({ id: req.params.id });
    
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting member:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

