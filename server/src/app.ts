import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRouter from './controllers/auth.controller';
import gameAccountRouter from './controllers/game-account.controller';
import userRouter from './controllers/user.controller';
import { errorMiddleware } from './middleware/error.middleware';

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/game-accounts', gameAccountRouter);
app.use('/api/users', userRouter);

app.use(errorMiddleware);

export default app;
