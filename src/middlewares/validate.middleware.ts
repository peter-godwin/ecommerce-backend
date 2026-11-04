import { Request, Response, NextFunction } from "express";
import {AnyZodObject} from "zod/v3";

export const validate =
    (schema: AnyZodObject) =>
        (req: Request, _res: Response, next: NextFunction) => {
            schema.parse({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        };
