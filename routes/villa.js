import express from 'express'
import VillaController from '../controllers/villa.js'

const router = express.Router()

router.get('/', VillaController.getAllVillas)
router.post('/', VillaController.createVilla)
router.get('/:id', VillaController.getVillaById)
router.put('/:id', VillaController.updateVilla)
router.delete('/:id', VillaController.deleteVilla)

export default router