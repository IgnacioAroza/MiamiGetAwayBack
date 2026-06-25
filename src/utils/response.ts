import { Response } from 'express';

export const ok = (res: Response, data: unknown) =>
  res.status(200).json(data);

export const created = (res: Response, data: unknown) =>
  res.status(201).json(data);

export const badRequest = (res: Response, message: string, details?: unknown) =>
  res.status(400).json(details !== undefined ? { error: message, details } : { error: message });

export const unauthorized = (res: Response, message: string) =>
  res.status(401).json({ error: message });

export const forbidden = (res: Response, message: string) =>
  res.status(403).json({ error: message });

export const notFound = (res: Response, message: string) =>
  res.status(404).json({ error: message });

export const conflict = (res: Response, message: string, details?: unknown) =>
  res.status(409).json(details !== undefined ? { error: message, details } : { error: message });

export const serverError = (res: Response, message: string, details?: unknown) =>
  res.status(500).json(details !== undefined ? { error: message, details } : { error: message });

export const sendError = (res: Response, status: number, message: string) =>
  res.status(status).json({ error: message });
