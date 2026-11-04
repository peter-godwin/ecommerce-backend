import { IProduct, Product } from './product.model';
import { CreateProductDTO, UpdateProductDTO, ProductQueryDTO } from './product.dto';
import mongoose from 'mongoose';

export class ProductService {
    static async getAllProducts(query: ProductQueryDTO = {}): Promise<{
        products: IProduct[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }> {
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
        const skip = (page - 1) * limit;

        const filter: {
            isActive?: boolean;
            category?: string;
            price?: { $gte?: number; $lte?: number };
            stock?: { $gt: number };
            $text?: { $search: string };
        } = { isActive: true };

        if (query.category) {
            filter.category = query.category.toLowerCase();
        }

        if (query.minPrice !== undefined || query.maxPrice !== undefined) {
            filter.price = {};
            if (query.minPrice !== undefined) {
                filter.price.$gte = Number(query.minPrice);
            }
            if (query.maxPrice !== undefined) {
                filter.price.$lte = Number(query.maxPrice);
            }
        }

        if (query.inStock) {
            filter.stock = { $gt: 0 };
        }

        if (query.search) {
            filter.$text = { $search: query.search };
        }

        const sortField = query.sortBy || 'createdAt';
        const sortOrder = query.order === 'asc' ? 1 : -1;
        const sort: { [key: string]: 1 | -1 } = { [sortField]: sortOrder };

        const [products, total] = await Promise.all([
            Product.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Product.countDocuments(filter),
        ]);

        return {
            products: products as IProduct[],
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    static async getProductById(id: string): Promise<IProduct | null> {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new Error('Invalid product ID');
        }

        return await Product.findById(id);
    }

    static async createProduct(dto: CreateProductDTO): Promise<IProduct> {
        if (dto.sku) {
            const existing = await Product.findOne({ sku: dto.sku });
            if (existing) {
                throw new Error(`Product with SKU "${dto.sku}" already exists`);
            }
        }

        const product = new Product(dto);
        return await product.save();
    }

    static async updateProduct(id: string, dto: UpdateProductDTO): Promise<IProduct | null> {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new Error('Invalid product ID');
        }

        if (dto.sku) {
            const existing = await Product.findOne({
                sku: dto.sku,
                _id: { $ne: id }
            });
            if (existing) {
                throw new Error(`Product with SKU "${dto.sku}" already exists`);
            }
        }

        return await Product.findByIdAndUpdate(
            id,
            { $set: dto },
            { new: true, runValidators: true }
        );
    }

    static async deleteProduct(id: string): Promise<void> {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new Error('Invalid product ID');
        }

        await Product.findByIdAndUpdate(id, { isActive: false });
    }

    static async hardDeleteProduct(id: string): Promise<void> {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new Error('Invalid product ID');
        }

        await Product.findByIdAndDelete(id);
    }

    static async getCategories(): Promise<string[]> {
        const categories = await Product.distinct('category', { isActive: true });
        return categories.sort();
    }

    static async updateStock(productId: string, quantity: number): Promise<IProduct | null> {
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            throw new Error('Invalid product ID');
        }

        const product = await Product.findById(productId);
        if (!product) {
            throw new Error('Product not found');
        }

        product.stock += quantity;
        if (product.stock < 0) {
            throw new Error('Insufficient stock');
        }

        return await product.save();
    }

    static async getLowStockProducts(threshold: number = 10): Promise<IProduct[]> {
        return await Product.find({
            isActive: true,
            stock: { $lt: threshold, $gt: 0 }
        }).sort({ stock: 1 });
    }

    static async getProductStats(): Promise<Record<string, unknown>> {
        const stats = await Product.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    totalStock: { $sum: '$stock' },
                    avgPrice: { $avg: '$price' },
                    categories: { $addToSet: '$category' },
                },
            },
        ]);

        const lowStock = await Product.countDocuments({
            isActive: true,
            stock: { $lt: 10, $gt: 0 }
        });

        const outOfStock = await Product.countDocuments({
            isActive: true,
            stock: 0
        });

        return {
            ...stats[0],
            lowStock,
            outOfStock,
        };
    }
}