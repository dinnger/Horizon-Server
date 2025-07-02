// Initialize module aliases
import 'module-alias/register'

import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import cors from 'cors'

import { initDatabase } from './models'
import { seedDatabase } from './seeders/seed'
import { socketAuthMiddleware } from './middleware/socketAuth'
import { setupSocketRoutes } from './routes'
import { envs } from './config/envs'


const app = express()
const server = createServer(app)
const io = new Server(server, {
	cors: {
		origin: envs.CLIENT_URL || 'http://localhost:5173',
		methods: ['GET', 'POST']
	}
})

const PORT = envs.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Socket.IO authentication middleware
io.use(socketAuthMiddleware)

// Setup all socket routes
setupSocketRoutes(io)

// Health check endpoint
app.get('/health', (req, res) => {
	res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Initialize database and start server
const startServer = async () => {
	try {
		await initDatabase()

		// Seed database if needed
		if (envs.SEED_DATABASE) {
			await seedDatabase()
		}

		server.listen(PORT, () => {
			console.log(`Servidor corriendo en puerto ${PORT}`)
			console.log('Socket.IO listo para conexiones')
		})
	} catch (error) {
		console.error('Error iniciando servidor:', error)
		process.exit(1)
	}
}

startServer()
