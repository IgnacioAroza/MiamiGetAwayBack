import { Router } from 'express'
import AdminController from '../controllers/admin.js'
import authMiddleware from '../middleware/authMiddleware.js'

const router = Router()

router.use(authMiddleware)

router.get('/', AdminController.getAllAdmins)
router.post('/', AdminController.createAdmin)
router.get('/:id', AdminController.getAdminById)
router.put('/:id', AdminController.updateAdmin)
router.delete('/:id', AdminController.deleteAdmin)

export default router