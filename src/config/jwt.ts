import {env} from "./env";

export const jwtConfig = {
    secret: env.jwtSecret,
    expiration: env.jwtExpiresIn,
};