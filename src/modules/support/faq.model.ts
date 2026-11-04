import { Schema, model, Document } from 'mongoose';

export type FAQCategory =
    | 'orders'
    | 'shipping'
    | 'returns'
    | 'payments'
    | 'account'
    | 'products'
    | 'general';

export interface IFAQ extends Document {
    question: string;
    answer: string;
    category: FAQCategory;
    tags: string[];
    isPublished: boolean;
    viewCount: number;
    helpfulCount: number;
    notHelpfulCount: number;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

const faqSchema = new Schema<IFAQ>({
    question: {
        type: String,
        required: [true, 'Question is required'],
        trim: true,
        maxlength: 300,
    },
    answer: {
        type: String,
        required: [true, 'Answer is required'],
        trim: true,
        maxlength: 3000,
    },
    category: {
        type: String,
        enum: ['orders', 'shipping', 'returns', 'payments', 'account', 'products', 'general'],
        required: true,
        index: true,
    },
    tags: {
        type: [String],
        default: [],
    },
    isPublished: {
        type: Boolean,
        default: true,
        index: true,
    },
    viewCount: {
        type: Number,
        default: 0,
    },
    helpfulCount: {
        type: Number,
        default: 0,
    },
    notHelpfulCount: {
        type: Number,
        default: 0,
    },
    order: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});

faqSchema.index({ question: 'text', answer: 'text', tags: 'text' });
faqSchema.index({ category: 1, order: 1 });

export const FAQ = model<IFAQ>('FAQ', faqSchema);