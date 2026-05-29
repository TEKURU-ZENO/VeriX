import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger';

// Interface Definitions
export interface IUser {
  _id: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
  createdAt: Date;
}

export interface IRecord {
  _id: string;
  name: string;
  email: string;
  status: 'Created' | 'Documents Submitted' | 'Background Check' | 'Under Review' | 'Verified';
  riskScore: number;
  updatedAt: Date;
}

export interface IAuditLog {
  _id: string;
  timestamp: Date;
  user: string;
  action: string;
  details: string;
}

// Global state indicators
export let isFallbackDb = false;

// Mock database storage in memory
let mockUsers: IUser[] = [];
let mockRecords: IRecord[] = [];
let mockAuditLogs: IAuditLog[] = [];

// Seed Data helper
async function generateSeeds() {
  const adminHash = await bcrypt.hash('admin123', 10);
  const userHash = await bcrypt.hash('user123', 10);

  const initialUsers: IUser[] = [
    {
      _id: 'u1',
      email: 'admin@verix.com',
      passwordHash: adminHash,
      role: 'admin',
      status: 'active',
      createdAt: new Date()
    },
    {
      _id: 'u2',
      email: 'user@verix.com',
      passwordHash: userHash,
      role: 'user',
      status: 'active',
      createdAt: new Date()
    }
  ];

  const initialRecords: IRecord[] = [
    {
      _id: 'r1',
      name: 'Alice Vance',
      email: 'alice.vance@example.com',
      status: 'Created',
      riskScore: 12,
      updatedAt: new Date(Date.now() - 4 * 3600 * 1000)
    },
    {
      _id: 'r2',
      name: 'Bob Miller',
      email: 'bob.miller@example.com',
      status: 'Documents Submitted',
      riskScore: 28,
      updatedAt: new Date(Date.now() - 3 * 3600 * 1000)
    },
    {
      _id: 'r3',
      name: 'Charlie Davis',
      email: 'charlie.davis@example.com',
      status: 'Background Check',
      riskScore: 85,
      updatedAt: new Date(Date.now() - 2 * 3600 * 1000)
    },
    {
      _id: 'r4',
      name: 'Diana Prince',
      email: 'diana.prince@example.com',
      status: 'Under Review',
      riskScore: 5,
      updatedAt: new Date(Date.now() - 1 * 3600 * 1000)
    },
    {
      _id: 'r5',
      name: 'Evan Wright',
      email: 'evan.wright@example.com',
      status: 'Verified',
      riskScore: 15,
      updatedAt: new Date()
    }
  ];

  const initialAudits: IAuditLog[] = [
    {
      _id: 'a1',
      timestamp: new Date(Date.now() - 5 * 3600 * 1000),
      user: 'system@verix.com',
      action: 'SYSTEM_BOOT',
      details: 'VeriX Server initialized successfully.'
    },
    {
      _id: 'a2',
      timestamp: new Date(Date.now() - 4 * 3600 * 1000),
      user: 'admin@verix.com',
      action: 'LOGIN_SUCCESS',
      details: 'Admin user logged in.'
    }
  ];

  return { initialUsers, initialRecords, initialAudits };
}

// Mongoose Models definition (in case Mongo is available)
const UserSchema = new mongoose.Schema<IUser>({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

const RecordSchema = new mongoose.Schema<IRecord>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  status: { type: String, enum: ['Created', 'Documents Submitted', 'Background Check', 'Under Review', 'Verified'], default: 'Created' },
  riskScore: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

const AuditSchema = new mongoose.Schema<IAuditLog>({
  timestamp: { type: Date, default: Date.now },
  user: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: String }
});

export const UserModel = mongoose.model<IUser>('User', UserSchema);
export const RecordModel = mongoose.model<IRecord>('Record', RecordSchema);
export const AuditModel = mongoose.model<IAuditLog>('AuditLog', AuditSchema);

// Database Initialization Functions
export async function connectDb() {
  const seeds = await generateSeeds();
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/verix';
  
  logger.info(`Attempting database connection to MongoDB...`);
  
  try {
    // Attempt Mongoose connection with a short 2-second timeout
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2000
    });
    
    logger.info(`Database successfully connected to MongoDB.`);

    // Seed database if empty
    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      logger.info('MongoDB database is empty. Seeding initial records...');
      await UserModel.insertMany(seeds.initialUsers);
      await RecordModel.insertMany(seeds.initialRecords);
      await AuditModel.insertMany(seeds.initialAudits);
      logger.info('MongoDB seed files uploaded.');
    }
  } catch (error: any) {
    logger.warn(`Failed to connect to MongoDB: ${error.message}. Enabling in-memory JSON fallback DB.`);
    isFallbackDb = true;

    // Load initial seeds into memory storage
    mockUsers = seeds.initialUsers;
    mockRecords = seeds.initialRecords;
    mockAuditLogs = seeds.initialAudits;
  }
}

// Unified DAO interface functions to query either Mongoose or In-Memory
export const db = {
  // --- USERS SECTION ---
  async getUsers(): Promise<IUser[]> {
    if (!isFallbackDb) {
      return await UserModel.find().exec();
    }
    return [...mockUsers];
  },

  async getUserByEmail(email: string): Promise<IUser | null> {
    if (!isFallbackDb) {
      return await UserModel.findOne({ email }).exec();
    }
    return mockUsers.find(u => u.email === email) || null;
  },

  async getUserById(id: string): Promise<IUser | null> {
    if (!isFallbackDb) {
      return await UserModel.findById(id).exec();
    }
    return mockUsers.find(u => u._id === id) || null;
  },

  async createUser(userData: Omit<IUser, '_id' | 'createdAt'>): Promise<IUser> {
    if (!isFallbackDb) {
      const newUser = new UserModel(userData);
      return await newUser.save();
    }
    const created: IUser = {
      _id: 'u_' + Math.random().toString(36).substring(2, 9),
      ...userData,
      createdAt: new Date()
    };
    mockUsers.push(created);
    return created;
  },

  async updateUser(id: string, update: Partial<IUser>): Promise<IUser | null> {
    if (!isFallbackDb) {
      return await UserModel.findByIdAndUpdate(id, update, { new: true }).exec();
    }
    const index = mockUsers.findIndex(u => u._id === id);
    if (index === -1) return null;
    mockUsers[index] = { ...mockUsers[index], ...update };
    return mockUsers[index];
  },

  async deleteUser(id: string): Promise<boolean> {
    if (!isFallbackDb) {
      const res = await UserModel.findByIdAndDelete(id).exec();
      return res !== null;
    }
    const index = mockUsers.findIndex(u => u._id === id);
    if (index === -1) return false;
    mockUsers.splice(index, 1);
    return true;
  },

  // --- RECORDS (CANDIDATES) SECTION ---
  async getRecords(): Promise<IRecord[]> {
    if (!isFallbackDb) {
      return await RecordModel.find().exec();
    }
    return [...mockRecords];
  },

  async getRecordById(id: string): Promise<IRecord | null> {
    if (!isFallbackDb) {
      return await RecordModel.findById(id).exec();
    }
    return mockRecords.find(r => r._id === id) || null;
  },

  async createRecord(recordData: Omit<IRecord, '_id' | 'updatedAt'>): Promise<IRecord> {
    if (!isFallbackDb) {
      const newRec = new RecordModel(recordData);
      return await newRec.save();
    }
    const created: IRecord = {
      _id: 'r_' + Math.random().toString(36).substring(2, 9),
      ...recordData,
      updatedAt: new Date()
    };
    mockRecords.push(created);
    return created;
  },

  async updateRecord(id: string, update: Partial<IRecord>): Promise<IRecord | null> {
    if (!isFallbackDb) {
      return await RecordModel.findByIdAndUpdate(id, { ...update, updatedAt: new Date() }, { new: true }).exec();
    }
    const index = mockRecords.findIndex(r => r._id === id);
    if (index === -1) return null;
    mockRecords[index] = { ...mockRecords[index], ...update, updatedAt: new Date() };
    return mockRecords[index];
  },

  async deleteRecord(id: string): Promise<boolean> {
    if (!isFallbackDb) {
      const res = await RecordModel.findByIdAndDelete(id).exec();
      return res !== null;
    }
    const index = mockRecords.findIndex(r => r._id === id);
    if (index === -1) return false;
    mockRecords.splice(index, 1);
    return true;
  },

  // --- AUDIT LOGS SECTION ---
  async getAuditLogs(): Promise<IAuditLog[]> {
    if (!isFallbackDb) {
      return await AuditModel.find().sort({ timestamp: -1 }).exec();
    }
    return [...mockAuditLogs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  },

  async createAuditLog(user: string, action: string, details: string): Promise<IAuditLog> {
    if (!isFallbackDb) {
      const newLog = new AuditModel({ user, action, details });
      return await newLog.save();
    }
    const created: IAuditLog = {
      _id: 'a_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date(),
      user,
      action,
      details
    };
    mockAuditLogs.push(created);
    return created;
  }
};
