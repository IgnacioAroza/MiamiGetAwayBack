import { Request, Response } from 'express'
import UserModel from '../models/user.js'
import { validateUser, validateUserFilters } from '../schemas/userSchema.js'
import { Client } from '../types/index.js'
import type { UserFilters } from '../schemas/userSchema.js'
import { parsePagination, paginatedResponse } from '../utils/pagination.js'
import { ok, created, badRequest, notFound, serverError } from '../utils/response.js'

interface CreateUserData {
  name: string;
  lastname: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  notes: string;
}

class UserController {
    static async getAllUsers(req: Request, res: Response): Promise<void> {
        try {
            const filters: UserFilters = {}

            if (typeof req.query.name === 'string' && req.query.name.trim() !== '') {
                filters.name = req.query.name.trim()
            }
            if (typeof req.query.lastname === 'string' && req.query.lastname.trim() !== '') {
                filters.lastname = req.query.lastname.trim()
            }
            if (typeof req.query.email === 'string' && req.query.email.trim() !== '') {
                filters.email = req.query.email.trim()
            }
            if (typeof req.query.phone === 'string' && req.query.phone.trim() !== '') {
                filters.phone = req.query.phone.trim()
            }

            if (Object.keys(filters).length > 0) {
                const validationResult = validateUserFilters(filters)
                if (!validationResult.success) {
                    badRequest(res, 'Invalid filters', validationResult.error.flatten())
                    return
                }
            }

            const pagination = parsePagination(req.query);
            const { rows, total } = await UserModel.getAll(Object.keys(filters).length ? filters : undefined, pagination ?? undefined);
            if (pagination) {
                ok(res, paginatedResponse(rows, total, pagination));
            } else {
                ok(res, rows);
            }
        } catch (error: any) {
            serverError(res, error.message)
        }
    }

    static async getUserById(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);

            if (isNaN(id)) {
                badRequest(res, 'Invalid user ID');
                return;
            }

            const user = await UserModel.getUserById(id);

            if (!user) {
                notFound(res, 'User not found');
                return;
            }

            ok(res, user);
        } catch (error: any) {
            serverError(res, error.message || 'Error getting user');
        }
    }

    static async createUser(req: Request, res: Response): Promise<void> {
        try {
            const result = validateUser(req.body)

            if (!result.success) {
                badRequest(res, JSON.parse(result.error.message))
                return
            }

            const userData = req.body as CreateUserData

            const newUser = await UserModel.createUser(userData as unknown as Client)

            if (!newUser) {
                serverError(res, 'Internal error creating user')
                return
            }

            created(res, {
                id: newUser.id,
                name: newUser.name,
                lastname: newUser.lastname,
                email: newUser.email,
                phone: newUser.phone,
                address: newUser.address,
                city: newUser.city,
                country: newUser.country,
                notes: newUser.notes
            })
        } catch (error: any) {
            serverError(res, error.message || 'An error occurred while creating the user')
        }
    }

    static async updateUser(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);

            if (isNaN(id)) {
                badRequest(res, 'Invalid user ID');
                return;
            }

            const userData = req.body as Partial<Client>;

            if (Object.keys(userData).length === 0) {
                badRequest(res, 'No fields provided to update');
                return;
            }

            const updatedUser = await UserModel.updateUser(id, userData);

            ok(res, updatedUser);
        } catch (error: any) {
            if (error.message === 'User not found') {
                notFound(res, 'User not found');
            } else if (error.message === 'No valid fields to update') {
                badRequest(res, 'No valid fields to update');
            } else {
                serverError(res, error.message || 'Error updating user');
            }
        }
    }

    static async deleteUser(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);

            if (isNaN(id)) {
                badRequest(res, 'Invalid user ID');
                return;
            }

            await UserModel.deleteUser(id);

            ok(res, { message: 'User deleted successfully' });
        } catch (error: any) {
            if (error.message === 'User not found') {
                notFound(res, 'User not found');
            } else {
                serverError(res, error.message || 'Error deleting user');
            }
        }
    }
}

export default UserController 
