import mongoose from 'mongoose';

const emailAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  provider: {
    type: String,
    enum: ['gmail', 'outlook', 'yahoo'],
    default: 'gmail'
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  tokenExpiry: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  lastSyncAt: Date,
  syncSettings: {
    autoSync: {
      type: Boolean,
      default: true
    },
    syncInterval: {
      type: Number,
      default: 300000 // 5 minutes in milliseconds
    },
    maxEmails: {
      type: Number,
      default: 1000
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
emailAccountSchema.index({ userId: 1, email: 1 }, { unique: true });
emailAccountSchema.index({ userId: 1, isActive: 1 });

export default mongoose.model('EmailAccount', emailAccountSchema);
