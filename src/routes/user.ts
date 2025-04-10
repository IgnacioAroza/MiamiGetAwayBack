import { Router } from 'express'
import UserController from '../controllers/user.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

router.get('/', UserController.getAllUsers)
router.get('/:id', UserController.getUserById)
router.post('/', UserController.createUser)
router.put('/:id', authMiddleware, UserController.updateUser)
router.delete('/:id', authMiddleware, UserController.deleteUser)

export default router 