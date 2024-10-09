import YachtModel from '../models/yacht.js'
import { validateYacht, validatePartialYacht } from '../schemas/yachtSchema.js'

class YachtController {
    static async getAllYachts(req, res) {
        try {
            const yachts = await YachtModel.getAll()
            res.status(200).json(yachts)
        } catch (error) {
            res.status(500).json({ error: error.message })
        }
    }

    static async getYachtById(req, res) {
        try {
            const { id } = req.params
            const yacht = await YachtModel.getYachtById(id)
            if (yacht) {
                res.status(200).json(yacht)
            } else {
                res.status(404).json({ message: 'Yacht not found' })
            }
        } catch (error) {
            res.status(500).json({ error: error.message })
        }
    }

    static async createYacht(req, res) {
        try {
            const result = validateYacht(req.body)

            if (!result.success) {
                return res.status(400).json({ error: JSON.parse(result.error.message) })
            }
            const newYacht = await YachtModel.createYacht(req.body)
            res.status(201).json(newYacht)
        } catch (error) {
            console.error('Error in createYacht:', error)
            res.status(500).json({ error: error.message || 'An error occurred while creating the yacht' })
        }
    }

    static async updateYacht(req, res) {
        try {
            const result = validatePartialYacht(req.body)

            if (!result.success) {
                return res.status(400).json({ error: JSON.parse(result.error.message) })
            }
            const { id } = req.params
            const updatedYacht = await YachtModel.updateYacht({ id, input: result.data })
            res.status(200).json(updatedYacht)
        } catch (error) {
            console.error('Error in updateYacht:', error)
            res.status(500).json({ error: error.message || 'An error occurred while updating the yacht' })
        }
    }

    static async deleteYacht(req, res) {
        try {
            const { id } = req.params
            const result = await YachtModel.deleteYacht(id)
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

export default YachtController