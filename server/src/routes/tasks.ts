import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Task } from '../models/Task';

const router = Router();

// Zod schemas for task inputs
const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  description: z.string().optional().default(''),
  status: z.enum(['completed', 'pending']).optional().default('pending'),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  dueDate: z.string().optional().nullable(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  status: z.enum(['completed', 'pending']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.string().optional().nullable(),
});

const reorderSchema = z.array(
  z.object({
    id: z.string(),
    order: z.number(),
  })
);

// All task routes are authenticated
router.use(authenticateToken);

interface TaskQuery {
  userId?: string;
  status?: 'completed' | 'pending';
  title?: { $regex: string; $options: string };
}

// 1. GET /api/tasks - Retrieve user's tasks with search and status filtering
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, status } = req.query;
    const query: TaskQuery = { userId: req.userId };

    if (status && (status === 'completed' || status === 'pending')) {
      query.status = status;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      query.title = { $regex: search.trim(), $options: 'i' };
    }

    const tasks = await Task.find(query).sort({ order: 1, createdDate: -1 });
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
});

// 2. POST /api/tasks - Create a new task
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = createTaskSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const { title, description, status, priority, dueDate } = parseResult.data;

    const maxOrderTask = await Task.findOne({ userId: req.userId }).sort('-order');
    const order = maxOrderTask ? maxOrderTask.order + 1 : 0;

    const newTask = await Task.create({
      title,
      description,
      status,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      completedDate: status === 'completed' ? new Date() : undefined,
      order,
      userId: req.userId,
    });

    res.status(201).json(newTask);
  } catch (error) {
    next(error);
  }
});

// 3. PUT /api/tasks/reorder - Bulk reorder tasks
router.put('/reorder', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = reorderSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid reorder payload.' });
      return;
    }

    const updates = parseResult.data.map(item => ({
      updateOne: {
        filter: { _id: item.id, userId: req.userId },
        update: { $set: { order: item.order } }
      }
    }));

    if (updates.length > 0) {
      await Task.bulkWrite(updates);
    }

    res.status(200).json({ message: 'Tasks reordered successfully.' });
  } catch (error) {
    next(error);
  }
});

// 4. PUT /api/tasks/:id - Update an existing task
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = updateTaskSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const { id } = req.params;
    const { dueDate, ...otherUpdates } = parseResult.data;

    const updateQuery: any = { $set: otherUpdates };
    if (dueDate) {
      updateQuery.$set.dueDate = new Date(dueDate);
    } else if (dueDate === null) {
      updateQuery.$unset = { dueDate: 1 };
    }

    if (otherUpdates.status === 'completed') {
      updateQuery.$set.completedDate = new Date();
    } else if (otherUpdates.status === 'pending') {
      updateQuery.$unset = updateQuery.$unset || {};
      updateQuery.$unset.completedDate = 1;
    }

    const task = await Task.findOneAndUpdate(
      { _id: id, userId: req.userId },
      updateQuery,
      { new: true, runValidators: true }
    );

    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    res.status(200).json(task);
  } catch (error) {
    next(error);
  }
});

// 5. DELETE /api/tasks/:id - Delete a task
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await Task.findOneAndDelete({ _id: id, userId: req.userId });

    if (!result) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    res.status(200).json({ message: 'Task deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
