import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

if (env.cloudinary) {
    cloudinary.config({
        cloud_name: env.cloudinary.cloudName,
        api_key: env.cloudinary.apiKey,
        api_secret: env.cloudinary.apiSecret,
    });
    console.log('Cloudinary configured');
} else {
    console.warn('Cloudinary credentials not found. Image upload will not work.');
}

export default cloudinary;