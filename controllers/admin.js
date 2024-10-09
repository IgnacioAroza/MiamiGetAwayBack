import AdminModel from '../models/admin.js'
import { validateAdmin, validatePartialAdmin } from '../schemas/adminSchema.js'

class AdminController {
    static async getAllAdmins(req, res) {
        try {
            const admins = await AdminModel.getAll()
            res.status(200).json(admins)
        } catch (error) {
            res.status(500).json({ error: error.message })
        }
    }

    static async getAdminById(req, res) {
        try {
            const { id } = req.params
            const admin = await AdminModel.getAdminById(id)
            if (admin) {
                res.status(200).json(admin)
            } else {
                res.status(404).json({ message: 'Admin not found' })
            }
        } catch (error) {
            res.status(500).json({ error: error.message })
        }
    }

    static async createAdmin(req, res) {
        try {
            const result = validateAdmin(req.body)

            if (!result.success) {
                return res.status(400).json({ error: JSON.parse(result.error.message) })
            }
            const newAdmin = await AdminModel.createAdmin(req.body)
            res.status(201).json(newAdmin)
        } catch (error) {
            console.error('Error in createAdmin:', error)
            res.status(500).json({ error: error.message || 'An error occurred while creating the admin' })
        }
    }

    static async updateAdmin(req, res) {
        try {
            const result = validatePartialAdmin(req.body)

            if (!result.success) {
                return res.status(400).json({ error: JSON.parse(result.error.message) })
            }
            const { id } = req.params
            const updatedAdmin = await AdminModel.updateAdmin({ id, input: result.data })
            res.status(200).json(updatedAdmin)
        } catch (error) {
            console.error('Error in updateAdmin:', error)
            res.status(500).json({ error: error.message || 'An error occurred while updating the admin' })
        }
    }

    static async deleteAdmin(req, res) {
        try {
            const { id } = req.params
            const result = await AdminModel.deleteAdmin(id)
            if (result.success) {
                res.status(200).json({ message: result.message })
            } else {
                res.status(404).json({ message: result.message })
            }
        } catch (error) {
            res.status(500).json({ error: error.message })
        }
    }
}

export default AdminController