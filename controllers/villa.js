import VillaModel from '../models/villa.js'
import { validateVilla, validatePartialVilla } from '../schemas/villaSchema.js'

class VillaController {
    static async getAllVillas(req, res) {
        try {
            const villas = await VillaModel.getAll()
            res.status(200).json(villas)
        } catch (error) {
            res.status(500).json({ error: error.message })
        }
    }

    static async getVillaById(req, res) {
        try {
            const { id } = req.params
            const villa = await VillaModel.getVillaById(id)
            if (villa) {
                res.status(200).json(villa)
            } else {
                res.status(404).json({ message: 'Villa not found' })
            }
        } catch (error) {
            res.status(500).json({ error: error.message })
        }
    }

    static async createVilla(req, res) {
        try {
            const result = validateVilla(req.body)

            if (!result.success) {
                return res.status(400).json({ error: JSON.parse(result.error.message) })
            }
            const newVilla = await VillaModel.createVilla(req.body)
            res.status(201).json(newVilla)
        } catch (error) {
            console.error('Error in createVilla:', error)
            res.status(500).json({ error: error.message || 'An error occurred while creating the villa' })
        }
    }

    static async updateVilla(req, res) {
        try {
            const result = validatePartialVilla(req.body)

            if (!result.success) {
                return res.status(400).json({ error: JSON.parse(result.error.message) })
            }
            const { id } = req.params
            const updatedVilla = await VillaModel.updateVilla({ id, input: result.data })
            res.status(200).json(updatedVilla)
        } catch (error) {
            console.error('Error in updateVilla:', error)
            res.status(500).json({ error: error.message || 'An error occurred while updating the villa' })
        }
    }

    static async deleteVilla(req, res) {
        try {
            const { id } = req.params
            const result = await VillaModel.deleteVilla(id)
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

export default VillaController