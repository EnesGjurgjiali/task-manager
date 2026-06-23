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
  isGroupTask: z.boolean().optional().default(false),
  assignedUsers: z.array(z.object({
    user: z.string(),
    role: z.enum(['viewer', 'editor'])
  })).optional().default([]),
});

const updateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  status: z.enum(['completed', 'pending']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.string().optional().nullable(),
  isGroupTask: z.boolean().optional(),
  assignedUsers: z.array(z.object({
    user: z.string(),
    role: z.enum(['viewer', 'editor'])
  })).optional(),
});

const reorderSchema = z.array(
  z.object({
    id: z.string(),
    order: z.number(),
  })
);

// All task routes are authenticated
router.use(authenticateToken);

// 1. GET /api/tasks - Retrieve user's tasks with search and status filtering
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, status, type } = req.query;
    
    // Base query handles permissions
    let query: any = {};
    
    if (type === 'group') {
      // Group tasks: where isGroupTask is true AND user is either creator or assigned
      query.isGroupTask = true;
      query.$or = [
        { userId: req.userId },
        { 'assignedUsers.user': req.userId }
      ];
    } else {
      // Personal tasks: where isGroupTask is not true AND user is creator
      query.isGroupTask = { $ne: true };
      query.userId = req.userId;
    }

    if (status && (status === 'completed' || status === 'pending')) {
      query.status = status;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      query.title = { $regex: search.trim(), $options: 'i' };
    }

    const tasks = await Task.find(query)
      .sort({ order: 1, createdDate: -1 })
      .populate('assignedUsers.user', 'name email _id'); // Populate user data for group tasks
      
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

    const { title, description, status, priority, dueDate, isGroupTask, assignedUsers } = parseResult.data;

    const maxOrderTask = await Task.findOne({ userId: req.userId, isGroupTask }).sort('-order');
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
      isGroupTask,
      assignedUsers
    });

    // Populate user details before returning
    await newTask.populate('assignedUsers.user', 'name email _id');

    res.status(201).json(newTask);
  } catch (error) {
    next(error);
  }
});

// Helper to check edit/delete permissions
const checkTaskPermission = (task: any, userId: string): boolean => {
  if (task.userId.toString() === userId) return true; // Creator has full access
  if (!task.isGroupTask) return false; // Not a group task, only creator
  
  // Check if assigned as editor
  const assigned = task.assignedUsers.find((au: any) => au.user.toString() === userId);
  if (assigned && assigned.role === 'editor') return true;
  
  return false;
}

// 3. PUT /api/tasks/reorder - Bulk reorder tasks
router.put('/reorder', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = reorderSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid reorder payload.' });
      return;
    }

    // Only allow reordering tasks user has permission for
    // For simplicity, we just filter by userId for now since bulk permission check is complex
    const updates = parseResult.data.map(item => ({
      updateOne: {
        filter: { _id: item.id, userId: req.userId }, // Currently limits reorder to creator
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
    
    // First fetch the task to check permissions
    const task = await Task.findById(id);
    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }
    
    if (!checkTaskPermission(task, req.userId as string)) {
      // Check if they are a viewer who is ONLY trying to update status
      const isViewer = task.assignedUsers.some((au: any) => au.user.toString() === req.userId && au.role === 'viewer');
      const onlyUpdatingStatus = Object.keys(parseResult.data).length === 1 && parseResult.data.status !== undefined;
      
      if (!(isViewer && onlyUpdatingStatus)) {
        res.status(403).json({ error: 'You do not have permission to edit this task.' });
        return;
      }
    }

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

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      updateQuery,
      { new: true, runValidators: true }
    ).populate('assignedUsers.user', 'name email _id');

    res.status(200).json(updatedTask);
  } catch (error) {
    next(error);
  }
});

// 5. DELETE /api/tasks/:id - Delete a task
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);
    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    if (!checkTaskPermission(task, req.userId as string)) {
      res.status(403).json({ error: 'You do not have permission to delete this task.' });
      return;
    }

    await Task.findByIdAndDelete(id);

    res.status(200).json({ message: 'Task deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
