"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const Task_1 = require("../models/Task");
const router = (0, express_1.Router)();
// Zod schemas for task inputs
const createTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required').trim(),
    description: zod_1.z.string().optional().default(''),
    status: zod_1.z.enum(['completed', 'pending']).optional().default('pending'),
});
const updateTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required').optional(),
    description: zod_1.z.string().optional(),
    status: zod_1.z.enum(['completed', 'pending']).optional(),
});
// All task routes are authenticated
router.use(auth_1.authenticateToken);
// 1. GET /api/tasks - Retrieve user's tasks with search and status filtering
router.get('/', async (req, res, next) => {
    try {
        const { search, status } = req.query;
        const query = { userId: req.userId };
        if (status && (status === 'completed' || status === 'pending')) {
            query.status = status;
        }
        if (search && typeof search === 'string' && search.trim() !== '') {
            query.title = { $regex: search.trim(), $options: 'i' };
        }
        const tasks = await Task_1.Task.find(query).sort({ createdDate: -1 });
        res.status(200).json(tasks);
    }
    catch (error) {
        next(error);
    }
});
// 2. POST /api/tasks - Create a new task
router.post('/', async (req, res, next) => {
    try {
        const parseResult = createTaskSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ error: parseResult.error.issues[0].message });
            return;
        }
        const { title, description, status } = parseResult.data;
        const newTask = await Task_1.Task.create({
            title,
            description,
            status,
            userId: req.userId,
        });
        res.status(201).json(newTask);
    }
    catch (error) {
        next(error);
    }
});
// 3. PUT /api/tasks/:id - Update an existing task
router.put('/:id', async (req, res, next) => {
    try {
        const parseResult = updateTaskSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ error: parseResult.error.issues[0].message });
            return;
        }
        const { id } = req.params;
        const updateData = parseResult.data;
        const task = await Task_1.Task.findOneAndUpdate({ _id: id, userId: req.userId }, { $set: updateData }, { new: true, runValidators: true });
        if (!task) {
            res.status(404).json({ error: 'Task not found.' });
            return;
        }
        res.status(200).json(task);
    }
    catch (error) {
        next(error);
    }
});
// 4. DELETE /api/tasks/:id - Delete a task
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await Task_1.Task.findOneAndDelete({ _id: id, userId: req.userId });
        if (!result) {
            res.status(404).json({ error: 'Task not found.' });
            return;
        }
        res.status(200).json({ message: 'Task deleted successfully.' });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
