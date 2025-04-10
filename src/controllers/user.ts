import { Request, Response } from 'express'
import UserModel from '../models/user.js'
import { validateUser } from '../schemas/userSchema.js'
import { Client } from '../types/index.js'

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
            const users = await UserModel.getAll()
            res.status(200).json(users)
        } catch (error: any) {
            res.status(500).json({ error: error.message })
        }
    }

    static async getUserById(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            
            if (isNaN(id)) {
                res.status(400).json({ error: 'Invalid user ID' });
                return;
            }
            
            const user = await UserModel.getUserById(id);
            
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            
            res.status(200).json(user);
        } catch (error: any) {
            res.status(500).json({ error: error.message || 'Error getting user' });
        }
    }

    static async createUser(req: Request, res: Response): Promise<void> {
        try {
            const result = validateUser(req.body)

            if (!result.success) {
                res.status(400).json({ error: JSON.parse(result.error.message) })
                return
            }
            
            const userData = req.body as CreateUserData
            
            const newUser = await UserModel.createUser(userData as unknown as Client)
            
            if (!newUser) {
                res.status(500).json({ error: 'Internal error creating user' })
                return
            }
            
            res.status(201).json({
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
            res.status(500).json({ error: error.message || 'An error occurred while creating the user' })
        }
    }

    static async updateUser(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            
            if (isNaN(id)) {
                res.status(400).json({ error: 'Invalid user ID' });
                return;
            }
            
            const userData = req.body as Partial<Client>;
            
            // Validar que al menos un campo se está actualizando
            if (Object.keys(userData).length === 0) {
                res.status(400).json({ error: 'No fields provided to update' });
                return;
            }
            
            const updatedUser = await UserModel.updateUser(id, userData);
            
            res.status(200).json(updatedUser);
        } catch (error: any) {
            if (error.message === 'User not found') {
                res.status(404).json({ error: 'User not found' });
            } else if (error.message === 'No valid fields to update') {
                res.status(400).json({ error: 'No valid fields to update' });
            } else {
                res.status(500).json({ error: error.message || 'Error updating user' });
            }
        }
    }

    static async deleteUser(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id);
            
            if (isNaN(id)) {
                res.status(400).json({ error: 'Invalid user ID' });
                return;
            }
            
            const result = await UserModel.deleteUser(id);
            
            res.status(200).json(result);
        } catch (error: any) {
            if (error.message === 'User not found') {
                res.status(404).json({ error: 'User not found' });
            } else {
                res.status(500).json({ error: error.message || 'Error deleting user' });
            }
        }
    }
}

export default UserController 