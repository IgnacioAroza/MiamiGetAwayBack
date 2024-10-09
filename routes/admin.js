import express from 'express'
import AdminController from '../controllers/admin.js'

const router = express.Router()

router.get('/', AdminController.getAllAdmins)
router.post('/', AdminController.createAdmin)
router.get('/:id', AdminController.getAdminById)
router.put('/:id', AdminController.updateAdmin)
router.delete('/:id', AdminController.deleteAdmin)

export default router