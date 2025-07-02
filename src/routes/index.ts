import type { Server } from 'socket.io'
import { setupAuthRoutes } from './auth'
import { setupWorkspaceRoutes } from './workspaces'
import { setupProjectRoutes } from './projects'
import { setupWorkflowRoutes } from './workflows'
import { setupWorkflowHistoryRoutes } from './workflowHistory'
import { setupSettingsRoutes } from './settings'
import { setupAdminRoutes } from './admin'
import { setupNodeRoutes } from './nodes'
import { verifyPermission } from '../middleware/permissions'
import type { AuthenticatedSocket } from '../middleware/socketAuth'
import { envs } from '../config/envs'

const router: Record<string, any> = {
	...setupAuthRoutes,
	...setupWorkspaceRoutes,
	...setupProjectRoutes,
	...setupWorkflowRoutes,
	...setupWorkflowHistoryRoutes,
	...setupSettingsRoutes,
	...setupAdminRoutes,
	...setupNodeRoutes
}

export interface SocketData {
	socket: Required<AuthenticatedSocket>
	data: any
	callback: (data: any) => void
}

export const setupSocketRoutes = (io: Server) => {
	// Setup all route handlers

	// Global connection handler for logging
	io.on('connection', (socket: AuthenticatedSocket) => {
		console.log('Cliente conectado:', socket.id)

		socket.use(([event, ...args], next) => {
			const data = args.length > 1 ? args[0] : {}
			const callback = args[args.length - 1]
			const ommitedPermissions = ['auth:me', 'auth:login']

			if (!socket.userId) {
				next(new Error('No se encontró el usuario'))
			}

			if (!verifyPermission(socket as Required<AuthenticatedSocket>, event, ommitedPermissions)) {
				next(new Error(`No cumple permisos para ejecutar el método ${event}`))
				callback({ success: false, message: `No cumple permisos para ejecutar el método ${event}` })
				return
			}

			if (!router[event]) {
				if (envs.TRACKING_ROUTE) console.log('[TRACKING_ROUTE]', 'No se encontró el método', event)
				console.error(`No se encontró el método ${event}`)
				next(new Error(`No se encontró el método ${event}`))
				return
			}
			if (envs.TRACKING_ROUTE) console.log('[TRACKING_ROUTE]', event, typeof data === 'object' ? JSON.stringify(data) : data)
			router[event]({ socket, data, callback })
			next()
		})

		socket.on('disconnect', () => {
			console.log('Cliente desconectado:', socket.id)
		})
	})
}
