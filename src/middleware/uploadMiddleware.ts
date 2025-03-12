import multer from 'multer'

// Configurar el almacenamiento en memoria para Multer
const storage = multer.memoryStorage()

// Crear middleware de carga
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
    fileFilter: (req, file, cb) => {
        // Aceptar solo imágenes
        if (file.mimetype.startsWith('image/')) {
            cb(null, true)
        } else {
            cb(new Error('Solo se permiten imágenes') as any)
        }
    }
})

export default upload 