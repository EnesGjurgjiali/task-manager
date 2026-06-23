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
}
