import { Router } from 'express'
import UserController from '../controllers/user.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

router.get('/', authMiddleware, UserController.getAllUsers)
router.get('/:id', authMiddleware, UserController.getUserById)
router.post('/', authMiddleware, UserController.createUser)
router.put('/:id', authMiddleware, UserController.updateUser)
router.delete('/:id', authMiddleware, UserController.deleteUser)

export default router 