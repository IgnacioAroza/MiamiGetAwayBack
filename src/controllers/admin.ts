import { Request, Response } from 'express'
import AdminModel from '../models/admin.js'
import { validateAdmin, validatePartialAdmin } from '../schemas/adminSchema.js'
import { Admin, CreateAdminDTO, UpdateAdminDTO } from '../types/index.js'
import { ok, created, badRequest, notFound, serverError } from '../utils/response.js'

class AdminController {
    static async getAllAdmins(req: Request, res: Response): Promise<void> {
        try {
            const admins = await AdminModel.getAll()
            ok(res, admins)
        } catch (error: any) {
            serverError(res, error.message)
        }
    }

    static async getAdminById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const admin = await AdminModel.getAdminById(Number(id))
            if (admin) {
                ok(res, admin)
            } else {
                notFound(res, 'Admin not found')
            }
        } catch (error: any) {
            serverError(res, error.message)
        }
    }

    static async createAdmin(req: Request, res: Response): Promise<void> {
        try {
            const result = validateAdmin(req.body)

            if (!result.success) {
                badRequest(res, JSON.parse(result.error.message))
                return
            }

            const adminData = req.body as CreateAdminDTO
            const newAdmin = await AdminModel.createAdmin(adminData as unknown as Admin)
            created(res, newAdmin)
        } catch (error: any) {
            console.error('Error in createAdmin:', error)
            serverError(res, error.message || 'An error occurred while creating the admin')
        }
    }

    static async updateAdmin(req: Request, res: Response): Promise<void> {
        try {
            const result = validatePartialAdmin(req.body)

            if (!result.success) {
                badRequest(res, JSON.parse(result.error.message))
                return
            }

            const { id } = req.params
            const inputData = result.data as UpdateAdminDTO
            const updatedAdmin = await AdminModel.updateAdmin(Number(id), inputData)
            ok(res, updatedAdmin)
        } catch (error: any) {
            console.error('Error in updateAdmin:', error)
            serverError(res, error.message || 'An error occurred while updating the admin')
        }
    }

    static async deleteAdmin(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params
            const result = await AdminModel.deleteAdmin(Number(id))

            if (result && typeof result === 'object' && 'success' in result && result.success) {
                ok(res, { message: result.message })
            } else {
                notFound(res, result && typeof result === 'object' ? result.message : 'Admin not found')
            }
        } catch (error: any) {
            serverError(res, error.message)
        }
    }
}

export default AdminController 