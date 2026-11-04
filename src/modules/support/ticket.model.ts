import { Schema, model, Document, Types } from 'mongoose';

export type TicketStatus = 'open' | 'in_progress' | 'awaiting_customer' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketCategory =
    | 'order_issue'
    | 'payment_issue'
    | 'shipping_issue'
    | 'product_question'
    | 'return_refund'
    | 'account_issue'
    | 'technical_issue'
    | 'other';

interface ITicketMessage {
    sender: Types.ObjectId;
    senderRole: 'customer' | 'admin';
    message: string;
    attachments?: string[];
    isInternal: boolean;
    createdAt: Date;
}

export interface ITicket extends Document {
    ticketNumber: string;
    user: Types.ObjectId;
    subject: string;
    category: TicketCategory;
    priority: TicketPriority;
    status: TicketStatus;
    relatedOrder?: Types.ObjectId;
    relatedProduct?: Types.ObjectId;
    assignedTo?: Types.ObjectId;
    messages: ITicketMessage[];
    lastResponseBy?: 'customer' | 'admin';
    lastResponseAt?: Date;
    resolvedAt?: Date;
    closedAt?: Date;
    satisfactionRating?: number;
    satisfactionFeedback?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ticketMessageSchema = new Schema<ITicketMessage>({
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['customer', 'admin'], required: true },
    message: { type: String, required: true, maxlength: 5000 },
    attachments: { type: [String], default: [] },
    isInternal: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
}, { _id: true });

const ticketSchema = new Schema<ITicket>({
    ticketNumber: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    subject: {
        type: String,
        required: [true, 'Subject is required'],
        trim: true,
        minlength: 5,
        maxlength: 150,
    },
    category: {
        type: String,
        enum: [
            'order_issue',
            'payment_issue',
            'shipping_issue',
            'product_question',
            'return_refund',
            'account_issue',
            'technical_issue',
            'other',
        ],
        required: true,
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
    },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'awaiting_customer', 'resolved', 'closed'],
        default: 'open',
        index: true,
    },
    relatedOrder: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
    },
    relatedProduct: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
    },
    assignedTo: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true,
    },
    messages: {
        type: [ticketMessageSchema],
        default: [],
        validate: {
            validator: (msgs: ITicketMessage[]) => msgs.length > 0,
            message: 'Ticket must have at least one message',
        },
    },
    lastResponseBy: {
        type: String,
        enum: ['customer', 'admin'],
    },
    lastResponseAt: Date,
    resolvedAt: Date,
    closedAt: Date,
    satisfactionRating: {
        type: Number,
        min: 1,
        max: 5,
    },
    satisfactionFeedback: {
        type: String,
        maxlength: 500,
    },
}, {
    timestamps: true,
});

ticketSchema.index({ user: 1, createdAt: -1 });
ticketSchema.index({ status: 1, priority: -1 });
ticketSchema.index({ assignedTo: 1, status: 1 });

export function generateTicketNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TKT-${timestamp}-${random}`;
}

export const Ticket = model<ITicket>('Ticket', ticketSchema);