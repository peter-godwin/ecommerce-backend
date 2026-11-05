import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod/v3";

export const validate =
    (schema: AnyZodObject) =>
        (req: Request, _res: Response, next: NextFunction) => {
            try {
                const parsed = schema.parse({
                    body: req.body,
                    query: req.query,
                    params: req.params,
                });

                req.body = (parsed as { body?: unknown }).body ?? req.body;

                next();
            } catch (error) {
                if (error instanceof ZodError) {
                    const err = new Error(error.message) as Error & { statusCode?: number };
                    err.statusCode = 400;
                    next(err);
                    return;
                }
                next(error);
            }
        };
