export interface Task {
  _id: string;
  title: string;
  description: string;
  status: 'completed' | 'pending';
  priority: 'low' | 'medium' | 'high';
  order: number;
  createdDate: string;
  dueDate?: string;
  completedDate?: string;
  isGroupTask?: boolean;
  assignedUsers?: Array<{
    user: { _id: string; name: string; email: string };
    role: 'viewer' | 'editor';
  }>;
}
