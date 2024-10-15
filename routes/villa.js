import express from 'express'
import VillaController from '../controllers/villa.js'
import upload from '../middleware/uploadMiddleware.js'

const router = express.Router()

router.get('/', VillaController.getAllVillas)
router.post('/', upload.array('images', 30), VillaController.createVilla)
router.get('/:id', VillaController.getVillaById)
router.put('/:id', upload.array('images', 30), VillaController.updateVilla)
router.delete('/:id', VillaController.deleteVilla)

export default router