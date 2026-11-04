import { Schema, model, Document } from 'mongoose';

export interface IProduct extends Document {
    name: string;
    description: string;
    price: number;
    category: string;
    stock: number;
    sku?: string;
    images?: string[];
    isActive: boolean;
    discount?: number;
    tags?: string[];
    rating?: number;
    numReviews?: number;
    createdAt: Date;
    updatedAt: Date;
}

const productSchema = new Schema<IProduct>({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        minlength: [3, 'Name must be at least 3 characters'],
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        minlength: [10, 'Description must be at least 10 characters'],
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        trim: true,
        lowercase: true
    },
    stock: {
        type: Number,
        required: [true, 'Stock is required'],
        default: 0,
        min: [0, 'Stock cannot be negative']
    },
    sku: {
        type: String,
        unique: true,
        sparse: true,
        uppercase: true,
        trim: true
    },
    images: {
        type: [String],
        default: []
    },
    isActive: {
        type: Boolean,
        default: true
    },
    discount: {
        type: Number,
        default: 0,
        min: [0, 'Discount cannot be negative'],
        max: [100, 'Discount cannot exceed 100%']
    },
    tags: {
        type: [String],
        default: []
    },
    rating: {
        type: Number,
        default: 0,
        min: [0, 'Rating cannot be negative'],
        max: [5, 'Rating cannot exceed 5']
    },
    numReviews: {
        type: Number,
        default: 0,
        min: [0, 'Number of review cannot be negative']
    }
}, {
    timestamps: true,
});

productSchema.index(
    {
        name: 'text',
        description: 'text',
        tags: 'text',
        category: 'text',
    },
    {
        weights: {
            name: 10,
            tags: 5,
            category: 3,
            description: 1,
        },
        name: 'product_text_search',
    }
);

productSchema.index({ name: 1 });

productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ createdAt: -1 });

productSchema.virtual('discountedPrice').get(function() {
    if (this.discount && this.discount > 0) {
        return this.price - (this.price * this.discount / 100);
    }
    return this.price;
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

export const Product = model<IProduct>('Product', productSchema);