import { Schema, model, Document, Types } from 'mongoose';

export interface ITask extends Document {
  title: string;
  description?: string;
  status: 'completed' | 'pending';
  priority: 'low' | 'medium' | 'high';
  order: number;
  createdDate: Date;
  dueDate?: Date;
  completedDate?: Date;
  userId: Types.ObjectId;
}

const TaskSchema = new Schema<ITask>({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['completed', 'pending'],
    default: 'pending',
    required: true,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
    required: true,
  },
  order: {
    type: Number,
    default: 0,
    required: true,
  },
  createdDate: {
    type: Date,
    default: Date.now,
    required: true,
  },
  dueDate: {
    type: Date,
  },
  completedDate: {
    type: Date,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
});

export const Task = model<ITask>('Task', TaskSchema);
