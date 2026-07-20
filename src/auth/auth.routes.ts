import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler';
import { loginSchema, registerSchema } from './auth.schemas';
import * as service from './auth.service';

export const authRouter = Router();

authRouter.post('/register', asyncHandler(async (req, res) => {
  res.status(201).json(await service.register(registerSchema.parse(req.body)));
}));

authRouter.post('/login', asyncHandler(async (req, res) => {
  res.json(await service.login(loginSchema.parse(req.body)));
}));
