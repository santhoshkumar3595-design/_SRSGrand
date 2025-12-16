import { User, UserRole } from '../types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY_USERS = 'nexus_users';
const STORAGE_KEY_SESSION = 'nexus_session';

// Seed default users if none exist
const seedUsers = () => {
  const existing = localStorage.getItem(STORAGE_KEY_USERS);
  if (!existing) {
    const defaultUsers: User[] = [
      { id: '1', username: 'admin', passwordHash: 'admin123', role: 'Admin', fullName: 'System Administrator', isActive: true },
      { id: '2', username: 'frontdesk', passwordHash: 'hotel123', role: 'Receptionist', fullName: 'Jessica Frontdesk', isActive: true },
    ];
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(defaultUsers));
  }
};

seedUsers();

export const getUsers = (): User[] => {
  return JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
};

export const createUser = (user: Omit<User, 'id'>): User => {
  const users = getUsers();
  if (users.find(u => u.username === user.username)) {
    throw new Error('Username already exists');
  }
  const newUser = { ...user, id: uuidv4(), isActive: true };
  users.push(newUser);
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  return newUser;
};

export const login = (username: string, password: string): User | null => {
  const users = getUsers();
  // Simple password check (In real app, use bcrypt)
  const user = users.find(u => u.username === username && u.passwordHash === password);
  if (user && user.isActive) {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
    return user;
  }
  return null;
};

export const logout = () => {
  localStorage.removeItem(STORAGE_KEY_SESSION);
};

export const getCurrentUser = (): User | null => {
  const session = localStorage.getItem(STORAGE_KEY_SESSION);
  return session ? JSON.parse(session) : null;
};

export const toggleUserAccess = (userId: string) => {
  const users = getUsers();
  const updated = users.map(u => u.id === userId && u.role !== 'Admin' ? { ...u, isActive: !u.isActive } : u);
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updated));
};