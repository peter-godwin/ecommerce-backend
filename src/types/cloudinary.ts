import {TransformationOptions} from "cloudinary";

export interface UploadOptions {
    folder?: string;
    transformation?: TransformationOptions;
    publicId?: string;
}

export interface UploadResult {
    url: string;
    publicId: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
}
