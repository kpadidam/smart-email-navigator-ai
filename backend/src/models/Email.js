import mongoose from 'mongoose';

const emailSchema = new mongoose.Schema({
  emailAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailAccount',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messageId: {
    type: String,
    required: true,
    unique: true
  },
  threadId: String,
  subject: {
    type: String,
    required: true
  },
  from: {
    name: String,
    email: {
      type: String,
      required: true
    }
  },
  to: [{
    name: String,
    email: {
      type: String,
      required: true
    }
  }],
  cc: [{
    name: String,
    email: String
  }],
  bcc: [{
    name: String,
    email: String
  }],
  body: {
    text: String,
    html: String
  },
  attachments: [{
    filename: String,
    mimeType: String,
    size: Number,
    attachmentId: String
  }],
  labels: [String],
  isRead: {
    type: Boolean,
    default: false
  },
  isStarred: {
    type: Boolean,
    default: false
  },
  isImportant: {
    type: Boolean,
    default: false
  },
  receivedAt: {
    type: Date,
    required: true
  },
  aiAnalysis: {
    category: {
      type: String,
      enum: ['work', 'personal', 'promotional', 'social', 'updates', 'forums', 'spam', 'other']
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low']
    },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative']
    },
    summary: String,
    actionItems: [String],
    confidence: Number,
    processedAt: Date
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
emailSchema.index({ userId: 1, receivedAt: -1 });
emailSchema.index({ emailAccountId: 1, receivedAt: -1 });
emailSchema.index({ 'from.email': 1 });
emailSchema.index({ 'aiAnalysis.category': 1 });
emailSchema.index({ 'aiAnalysis.priority': 1 });

export default mongoose.model('Email', emailSchema);
