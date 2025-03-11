import { Request, Response } from 'express'
import UserModel from '../models/user.js'
import { validateUser } from '../schemas/userSchema.js'
import { Client } from '../types/index.js'

interface CreateUserData {
  name: string;
  lastname: string;
  email: string;
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

    static async createUser(req: Request, res: Response): Promise<void> {
        try {
            const result = validateUser(req.body)

            if (!result.success) {
                res.status(400).json({ error: JSON.parse(result.error.message) })
                return
            }
            
            const userData = req.body as CreateUserData
            const newUser = await UserModel.createUser(userData as unknown as Client)
            res.status(201).json(newUser)
        } catch (error: any) {
            console.error('Error in createUser:', error)
            res.status(500).json({ error: error.message || 'An error occurred while creating the user' })
        }
    }
}

export default UserController 