import express from "express";
import { ensureConnection } from "../config/database.js";
import ExpenseModel from "../models/Expense.js";

const router = express.Router();

// GET all expenses
router.get("/", async (req, res) => {
  try {
    await ensureConnection();
    const expenses = await ExpenseModel.find().sort({ createdAt: -1 });
    res.json(expenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET expenses by organization_id
router.get("/organization/:organizationId", async (req, res) => {
  try {
    await ensureConnection();
    const expenses = await ExpenseModel.find({ 
      organization_id: req.params.organizationId 
    }).sort({ createdAt: -1 });
    res.json(expenses);
  } catch (error) {
    console.error("Error fetching expenses by organization:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST create expense
router.post("/", async (req, res) => {
  try {
    await ensureConnection();
    
    const expenseData = {
      ...req.body,
      amount: typeof req.body.amount === 'string' ? parseFloat(req.body.amount) : req.body.amount,
    };
    
    const newExpense = new ExpenseModel(expenseData);
    await newExpense.save();
    
    res.status(201).json(newExpense);
  } catch (error) {
    console.error("Error creating expense:", error);
    res.status(500).json({ error: error.message });
  }
});

// PUT update expense
router.put("/:id", async (req, res) => {
  try {
    await ensureConnection();
    
    const updateData = {
      ...req.body,
      amount: typeof req.body.amount === 'string' ? parseFloat(req.body.amount) : req.body.amount,
    };
    
    const expense = await ExpenseModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }
    
    res.json(expense);
  } catch (error) {
    console.error("Error updating expense:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE expense
router.delete("/:id", async (req, res) => {
  try {
    await ensureConnection();
    const expense = await ExpenseModel.findByIdAndDelete(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting expense:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;




