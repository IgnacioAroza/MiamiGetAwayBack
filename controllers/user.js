import UserModel from '../models/user.js'
import { validateUser } from '../schemas/userSchema.js'

class UserController {
    static async getAllUsers(req, res) {
        try {
            const users = await UserModel.getAll()
            res.status(200).json(users)
        } catch (error) {
            res.status(500).json({ error: error.message })
        }
    }

    static async createUser(req, res) {
        try {
            const result = validateUser(req.body)

            if (!result.success) {
                return res.status(400).json({ error: JSON.parse(result.error.message) })
            }
            const newUser = await UserModel.createUser(req.body)
            res.status(201).json(newUser)
        } catch (error) {
            console.error('Error in createUser:', error)
            res.status(500).json({ error: error.message || 'An error occurred while creating the user' })
        }
    }
}

export default UserController