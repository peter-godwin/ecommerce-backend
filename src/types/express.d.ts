import { IUser } from '../modules/user/user.model';

declare module 'express-serve-static-core' {
    interface Request {
        user?: IUser;
    }
}