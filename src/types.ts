export interface ReadingLog {
  id: string;
  taskId: string;
  date: string;
  pagesRead: number;
  absolutePage: number;
  note?: string;
}

export interface HatimTask {
  id: string;
  name: string;
  startPage: number;
  endPage: number;
  currentPage: number;
  isCompleted: boolean;
  createdAt: string;
}

export interface HatimData {
  activeTaskId: string;
  tasks: HatimTask[];
  logs: ReadingLog[];
  mfaEnabled?: boolean;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 'zikir_invite' | 'new_follower' | 'system_announcement';
  senderId?: string;
  senderName?: string;
  sessionId?: string;
  sessionName?: string;
  title?: string;
  message?: string;
  createdAt: string;
  read: boolean;
  status?: 'pending' | 'accepted' | 'declined';
}
