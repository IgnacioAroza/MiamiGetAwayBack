import { Request, Response } from 'express'
import AdminModel from '../models/admin.js'
import { validateAdmin, validatePartialAdmin } from '../schemas/adminSchema.js'
import { Admin, CreateAdminDTO, UpdateAdminDTO } from '../types/index.js'

class AdminController {
    static async getAllAdmins(req: Request, res: Response): Promise<void> {
        try {
            const admins = await AdminModel.getAll()
            res.status(200).json(admins)
        } catch (error: any) {
            res.status(500).json({ error: error.message })
        }
    }

    static async getAdminById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const admin = await AdminModel.getAdminById(Number(id))
            if (admin) {
                res.status(200).json(admin)
            } else {
                res.status(404).json({ message: 'Admin not found' })
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message })
        }
    }

    static async createAdmin(req: Request, res: Response): Promise<void> {
        try {
            const result = validateAdmin(req.body)

            if (!result.success) {
                res.status(400).json({ error: JSON.parse(result.error.message) })
                return
            }
            
            const adminData = req.body as CreateAdminDTO
            const newAdmin = await AdminModel.createAdmin(adminData as unknown as Admin)
            res.status(201).json(newAdmin)
        } catch (error: any) {
            console.error('Error in createAdmin:', error)
            res.status(500).json({ error: error.message || 'An error occurred while creating the admin' })
        }
    }

    static async updateAdmin(req: Request, res: Response): Promise<void> {
        try {
            const result = validatePartialAdmin(req.body)

            if (!result.success) {
                res.status(400).json({ error: JSON.parse(result.error.message) })
                return
            }
            
            const { id } = req.params
            const inputData = result.data as UpdateAdminDTO
            const updatedAdmin = await AdminModel.updateAdmin(Number(id), inputData)
            res.status(200).json(updatedAdmin)
        } catch (error: any) {
            console.error('Error in updateAdmin:', error)
            res.status(500).json({ error: error.message || 'An error occurred while updating the admin' })
        }
    }

    static async deleteAdmin(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const result = await AdminModel.deleteAdmin(Number(id))
            
            if (result && typeof result === 'object' && 'success' in result && result.success) {
                res.status(200).json({ message: result.message })
            } else {
                res.status(404).json({ message: result && typeof result === 'object' ? result.message : 'Admin not found' })
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message })
        }
    }
}

export default AdminController 