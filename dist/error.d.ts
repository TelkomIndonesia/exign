import { NextFunction, Request, Response } from 'express';
export declare function errorMW(err: Error, _: Request, res: Response, next: NextFunction): void;
