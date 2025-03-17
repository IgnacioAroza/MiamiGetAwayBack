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
            console.log('GET /users - Enviando respuesta:', users)
            res.status(200).json(users)
        } catch (error: any) {
            console.error('Error en getAllUsers:', error)
            res.status(500).json({ error: error.message })
        }
    }

    static async createUser(req: Request, res: Response): Promise<void> {
        try {
            const result = validateUser(req.body)

            if (!result.success) {
                console.log('Validación fallida:', result.error.message)
                res.status(400).json({ error: JSON.parse(result.error.message) })
                return
            }
            
            const userData = req.body as CreateUserData
            console.log('Creando usuario con datos:', userData)
            
            const newUser = await UserModel.createUser(userData as unknown as Client)
            console.log('Usuario creado:', newUser)
            
            // Asegurarnos de que newUser no sea undefined
            if (!newUser) {
                console.error('createUser devolvió undefined')
                res.status(500).json({ error: 'Error interno al crear usuario' })
                return
            }
            
            // Enviar explícitamente el objeto como JSON
            res.status(201).json({
                id: newUser.id,
                name: newUser.name,
                lastname: newUser.lastname,
                email: newUser.email
            })
        } catch (error: any) {
            console.error('Error in createUser:', error)
            res.status(500).json({ error: error.message || 'An error occurred while creating the user' })
        }
    }
}

export default UserController 