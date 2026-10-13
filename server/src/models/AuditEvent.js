import mongoose from 'mongoose';
import crypto from 'crypto';

const GENESIS_PREVIOUS_HASH = 'GENESIS_SCHEDULIX_DFIS_2026_AUDIT_TRAIL';

const auditEventSchema = new mongoose.Schema(
  {
    sequenceNumber: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    previousHash: {
      type: String,
      required: true,
    },
    hash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actorEmail: {
      type: String,
      required: true,
      default: 'system',
    },
    actorRole: {
      type: String,
      required: true,
      default: 'system',
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      required: true,
      index: true,
    },
    resourceId: {
      type: String,
      default: null,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    userAgent: {
      type: String,
      default: 'system',
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'DENIED'],
      default: 'SUCCESS',
    },
  },
  {
    timestamps: false, // We use explicit immutable UTC timestamp
  }
);

/**
 * Calculates SHA-256 hash for an audit record payload
 */
export function calculateAuditHash(data) {
  const payload = [
    data.sequenceNumber,
    data.previousHash,
    new Date(data.timestamp).toISOString(),
    data.actorEmail || 'system',
    data.actorRole || 'system',
    data.action,
    data.resourceType,
    data.resourceId || '',
    JSON.stringify(data.details || {}),
    data.status || 'SUCCESS',
  ].join('|');

  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Static method to securely append a new chained audit event
 */
auditEventSchema.statics.createChainedEvent = async function (eventData) {
  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Find latest audit event to establish the chain link
      const lastEvent = await this.findOne().sort({ sequenceNumber: -1 }).lean();

      const sequenceNumber = lastEvent ? lastEvent.sequenceNumber + 1 : 1;
      const previousHash = lastEvent ? lastEvent.hash : GENESIS_PREVIOUS_HASH;
      const timestamp = eventData.timestamp || new Date();

      const recordToHash = {
        sequenceNumber,
        previousHash,
        timestamp,
        actorEmail: eventData.actorEmail || 'system',
        actorRole: eventData.actorRole || 'system',
        action: eventData.action,
        resourceType: eventData.resourceType,
        resourceId: eventData.resourceId || null,
        details: eventData.details || {},
        status: eventData.status || 'SUCCESS',
      };

      const hash = calculateAuditHash(recordToHash);

      const newAuditEvent = new this({
        ...eventData,
        sequenceNumber,
        previousHash,
        hash,
        timestamp,
      });

      return await newAuditEvent.save();
    } catch (err) {
      if (err.code === 11000 && attempt < maxRetries - 1) {
        // Concurrency conflict on sequenceNumber; wait briefly and retry with latest sequence
        await new Promise((r) => setTimeout(r, 20 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
};

/**
 * Static method to verify the integrity of the entire audit chain
 * Returns { isIntact: boolean, totalChecked: number, brokenAtSequence: number | null, reason: string | null }
 */
auditEventSchema.statics.verifyChainIntegrity = async function () {
  const events = await this.find().sort({ sequenceNumber: 1 }).lean();

  if (events.length === 0) {
    return { isIntact: true, totalChecked: 0, brokenAtSequence: null, reason: 'Empty chain' };
  }

  let expectedPreviousHash = GENESIS_PREVIOUS_HASH;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const expectedSeq = i + 1;

    // Check sequence continuity
    if (event.sequenceNumber !== expectedSeq) {
      return {
        isIntact: false,
        totalChecked: i,
        brokenAtSequence: event.sequenceNumber,
        reason: `Sequence break: expected ${expectedSeq}, found ${event.sequenceNumber}`,
      };
    }

    // Check chain link to previous hash
    if (event.previousHash !== expectedPreviousHash) {
      return {
        isIntact: false,
        totalChecked: i,
        brokenAtSequence: event.sequenceNumber,
        reason: `Previous hash mismatch at sequence ${event.sequenceNumber}`,
      };
    }

    // Recompute and verify current hash
    const recomputedHash = calculateAuditHash(event);
    if (recomputedHash !== event.hash) {
      return {
        isIntact: false,
        totalChecked: i,
        brokenAtSequence: event.sequenceNumber,
        reason: `Hash integrity failure at sequence ${event.sequenceNumber}. Data may have been tampered.`,
      };
    }

    expectedPreviousHash = event.hash;
  }

  return {
    isIntact: true,
    totalChecked: events.length,
    brokenAtSequence: null,
    reason: 'All audit events mathematically verified',
  };
};

export const AuditEvent = mongoose.model('AuditEvent', auditEventSchema);
