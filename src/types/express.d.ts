import multer from 'multer';
import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      files?: any;
      user?: {
        id: number;
        username: string;
      };
    }
  }
}

export {}; 