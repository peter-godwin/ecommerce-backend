import { Router } from 'express';
import {
    searchProducts,
    autocomplete,
    getTrendingSearches,
    getSimilarProducts,
} from './search.controller';

const router = Router();

router.get('/', searchProducts);
router.get('/autocomplete', autocomplete);
router.get('/trending', getTrendingSearches);
router.get('/similar/:productId', getSimilarProducts);

export default router;