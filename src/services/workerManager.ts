/**
 * Worker Manager Service
 *
 * Manages workflow execution workers, their lifecycle, and communication
 * between the main server and worker processes.
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import path from 'node:path'
import { v4 as uuidv4 } from 'uuid'

export interface WorkerInfo {
	id: string
	workflowId: string
	processId: number
	port: number
	status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error'
	startTime: Date
	lastActivity: Date
	executionId?: string
	version?: string
	memoryUsage?: {
		rss: number
		heapUsed: number
		heapTotal: number
		external: number
	}
	cpuUsage?: {
		user: number
		system: number
	}
}

export interface WorkerMessage {
	type: string
	data?: any
	requestId?: string
	workerId?: string
}

export interface WorkerRequest {
	route: string
	data: any
	callback: (response: any) => void
}

class WorkerManager extends EventEmitter {
	private workers: Map<
		string,
		{
			info: WorkerInfo
			process: ChildProcess
			pendingRequests: Map<string, (response: any) => void>
		}
	> = new Map()

	private portRange = { start: 3001, end: 4000 }
	private usedPorts: Set<number> = new Set()

	constructor() {
		super()
		this.setupCleanup()
	}

	/**
	 * Create and start a new worker for workflow execution
	 */
	async createWorker(options: {
		workflowId: string
		executionId?: string
		version?: string
	}): Promise<WorkerInfo> {
		const workerId = uuidv4()
		const port = this.getAvailablePort()

		if (!port) {
			throw new Error('No hay puertos disponibles para el worker')
		}

		const workerInfo: WorkerInfo = {
			id: workerId,
			workflowId: options.workflowId,
			processId: 0, // Will be set when process starts
			port,
			status: 'starting',
			startTime: new Date(),
			lastActivity: new Date(),
			executionId: options.executionId,
			version: options.version
		}

		try {
			const workerProcess = await this.spawnWorkerProcess(workerId, options.workflowId, port)

			if (workerProcess.pid) {
				workerInfo.processId = workerProcess.pid
			}
			workerInfo.status = 'running'

			this.workers.set(workerId, {
				info: workerInfo,
				process: workerProcess,
				pendingRequests: new Map()
			})

			this.usedPorts.add(port)
			this.emit('worker:created', workerInfo)

			console.log(`Worker ${workerId} creado para workflow ${options.workflowId} en puerto ${port}`)

			return workerInfo
		} catch (error) {
			this.usedPorts.delete(port)
			workerInfo.status = 'error'
			throw error
		}
	}

	/**
	 * Stop and remove a worker
	 */
	async stopWorker(workerId: string): Promise<boolean> {
		const worker = this.workers.get(workerId)
		if (!worker) {
			return false
		}

		worker.info.status = 'stopping'

		try {
			// Send shutdown signal
			worker.process.send?.({ type: 'shutdown' })

			// Give it time to shutdown gracefully
			await new Promise<void>((resolve) => {
				const timeout = setTimeout(() => {
					worker.process.kill('SIGKILL')
					resolve()
				}, 5000)

				worker.process.on('exit', () => {
					clearTimeout(timeout)
					resolve()
				})
			})

			this.cleanupWorker(workerId)
			this.emit('worker:stopped', worker.info)

			return true
		} catch (error) {
			console.error(`Error deteniendo worker ${workerId}:`, error)
			worker.process.kill('SIGKILL')
			this.cleanupWorker(workerId)
			return false
		}
	}

	/**
	 * Send a request to a specific worker
	 */
	async sendRequestToWorker(workerId: string, route: string, data: any = {}): Promise<any> {
		const worker = this.workers.get(workerId)
		if (!worker || worker.info.status !== 'running') {
			throw new Error(`Worker ${workerId} no está disponible`)
		}

		return new Promise((resolve, reject) => {
			const requestId = uuidv4()
			const timeout = setTimeout(() => {
				worker.pendingRequests.delete(requestId)
				reject(new Error('Timeout en la solicitud al worker'))
			}, 30000)

			worker.pendingRequests.set(requestId, (response) => {
				clearTimeout(timeout)
				if (response.success) {
					resolve(response.data)
				} else {
					reject(new Error(response.message || 'Error en la solicitud al worker'))
				}
			})

			worker.process.send?.({
				type: 'request',
				route,
				data,
				requestId
			})

			worker.info.lastActivity = new Date()
		})
	}

	/**
	 * Handle requests from workers to the main server
	 */
	async handleWorkerRequest(workerId: string, route: string, data: any, requestId: string): Promise<void> {
		const worker = this.workers.get(workerId)
		if (!worker) {
			return
		}

		try {
			let response: any = { success: false, message: 'Ruta no encontrada' }

			// Route the request to appropriate handler
			switch (route) {
				case 'nodes:list':
					response = await this.handleNodesListRequest(data)
					break
				case 'nodes:get':
					response = await this.handleNodesGetRequest(data)
					break
				case 'workflows:get':
					response = await this.handleWorkflowGetRequest(data)
					break
				case 'system:health':
					response = await this.handleSystemHealthRequest(data)
					break
				case 'worker:log':
					response = await this.handleWorkerLogRequest(data)
					break
				case 'worker:progress':
					response = await this.handleWorkerProgressRequest(data)
					break
				case 'worker:metrics':
					response = await this.handleWorkerMetricsRequest(data)
					break
				case 'database:operation':
					response = await this.handleDatabaseOperationRequest(data)
					break
				case 'external:api':
					response = await this.handleExternalAPIRequest(data)
					break
				case 'file:operation':
					response = await this.handleFileOperationRequest(data)
					break
				case 'credentials:get':
					response = await this.handleCredentialsRequest(data)
					break
				case 'environment:get':
					response = await this.handleEnvironmentRequest(data)
					break
				default:
					// Try to route to socket handlers if available
					response = await this.routeToSocketHandler(route, data)
			}

			worker.process.send?.({
				type: 'response',
				requestId,
				success: response.success,
				data: response.data || response,
				message: response.message
			})

			worker.info.lastActivity = new Date()
		} catch (error) {
			console.error(`Error manejando solicitud de worker ${workerId}:`, error)

			worker.process.send?.({
				type: 'response',
				requestId,
				success: false,
				message: error instanceof Error ? error.message : 'Error interno del servidor'
			})
		}
	}

	/**
	 * Get all active workers
	 */
	getActiveWorkers(): WorkerInfo[] {
		return Array.from(this.workers.values()).map((w) => w.info)
	}

	/**
	 * Get worker by ID
	 */
	getWorker(workerId: string): WorkerInfo | undefined {
		return this.workers.get(workerId)?.info
	}

	/**
	 * Get workers by workflow ID
	 */
	getWorkersByWorkflow(workflowId: string): WorkerInfo[] {
		return Array.from(this.workers.values())
			.filter((w) => w.info.workflowId === workflowId)
			.map((w) => w.info)
	}

	/**
	 * Update worker statistics
	 */
	updateWorkerStats(
		workerId: string,
		stats: {
			memoryUsage?: WorkerInfo['memoryUsage']
			cpuUsage?: WorkerInfo['cpuUsage']
		}
	): void {
		const worker = this.workers.get(workerId)
		if (worker) {
			if (stats.memoryUsage) {
				worker.info.memoryUsage = stats.memoryUsage
			}
			if (stats.cpuUsage) {
				worker.info.cpuUsage = stats.cpuUsage
			}
			worker.info.lastActivity = new Date()
		}
	}

	private async spawnWorkerProcess(workerId: string, workflowId: string, port: number): Promise<ChildProcess> {
		try {
			const workerProcess = await this.trySpawnWorker(workerId, workflowId, port)

			// Handle worker messages
			workerProcess.on('message', (message: WorkerMessage) => {
				this.handleWorkerMessage(workerId, message)
			})

			// Handle worker errors (after spawn)
			workerProcess.on('error', (error: any) => {
				console.error(`Error en worker ${workerId} después del spawn:`, error)
				this.handleWorkerError(workerId, error)
			})

			// Handle worker exit
			workerProcess.on('exit', (code, signal) => {
				console.log(`Worker ${workerId} terminó con código ${code}, señal ${signal}`)
				this.handleWorkerExit(workerId, code, signal)
			})

			// Capture worker output for debugging
			workerProcess.stdout?.on('data', (data) => {
				console.log(`[Worker ${workerId}] ${data.toString().trim()}`)
			})

			workerProcess.stderr?.on('data', (data) => {
				console.error(`[Worker ${workerId} Error] ${data.toString().trim()}`)
			})

			return workerProcess
		} catch (error) {
			console.error(`Error al crear worker ${workerId}:`, error)
			throw error
		}
	}

	/**
	 * Try different commands to spawn the worker process
	 */
	private async trySpawnWorker(workerId: string, workflowId: string, port: number, retryCount = 0): Promise<ChildProcess> {
		const workerPath = path.join(process.cwd(), 'worker', 'index.ts')
		const isWindows = process.platform === 'win32'
		const isDevelopment = process.env.NODE_ENV !== 'production'

		const commands = []

		if (isDevelopment) {
			// Try different development commands
			commands.push(
				{ cmd: isWindows ? 'npx.cmd' : 'npx', args: ['tsx', workerPath] },
				{ cmd: isWindows ? 'npx.cmd' : 'npx', args: ['ts-node', workerPath] },
				{ cmd: 'tsx', args: [workerPath] },
				{ cmd: 'ts-node', args: [workerPath] }
			)
		} else {
			// In production, use compiled JS
			const jsWorkerPath = path.join(process.cwd(), 'dist', 'worker', 'index.js')
			commands.push({ cmd: 'node', args: [jsWorkerPath] })
		}

		if (retryCount >= commands.length) {
			throw new Error('No se pudo encontrar un comando válido para ejecutar el worker')
		}

		const { cmd, args } = commands[retryCount]
		console.log(`Intentando ejecutar worker ${workerId} con: ${cmd} ${args.join(' ')}`)

		return new Promise((resolve, reject) => {
			const workerProcess = spawn(cmd, args, {
				stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
				env: {
					...process.env,
					WORKER_ID: workerId,
					FLOW: workflowId,
					PORT: port.toString(),
					SERVER_PORT: process.env.SERVER_PORT || '3000',
					NODE_ENV: process.env.NODE_ENV || 'development'
				},
				shell: isWindows
			})

			// If spawn fails immediately, try next command
			workerProcess.on('error', async (error: any) => {
				if (error.code === 'ENOENT' && retryCount < commands.length - 1) {
					console.log(`Comando ${cmd} no encontrado, intentando siguiente...`)
					try {
						const nextWorker = await this.trySpawnWorker(workerId, workflowId, port, retryCount + 1)
						resolve(nextWorker)
					} catch (nextError) {
						reject(nextError)
					}
				} else {
					reject(error)
				}
			})

			// If process starts successfully, resolve
			workerProcess.on('spawn', () => {
				console.log(`Worker ${workerId} iniciado exitosamente con ${cmd}`)
				resolve(workerProcess)
			})

			// Handle timeout
			setTimeout(() => {
				if (!workerProcess.pid) {
					reject(new Error(`Timeout al iniciar worker con ${cmd}`))
				}
			}, 5000)
		})
	}

	private handleWorkerMessage(workerId: string, message: WorkerMessage): void {
		const worker = this.workers.get(workerId)
		if (!worker) return

		switch (message.type) {
			case 'request':
				if (message.requestId) {
					this.handleWorkerRequest(workerId, message.data?.route, message.data?.data, message.requestId)
				}
				break
			case 'response':
				if (message.requestId) {
					const callback = worker.pendingRequests.get(message.requestId)
					if (callback) {
						callback(message)
						worker.pendingRequests.delete(message.requestId)
					}
				}
				break
			case 'stats':
				this.updateWorkerStats(workerId, message.data)
				break
			case 'ready':
				worker.info.status = 'running'
				this.emit('worker:ready', worker.info)
				break
			case 'error':
				this.handleWorkerError(workerId, new Error(message.data?.message || 'Worker error'))
				break
		}
	}

	private handleWorkerError(workerId: string, error: Error): void {
		const worker = this.workers.get(workerId)
		if (worker) {
			worker.info.status = 'error'
			this.emit('worker:error', { workerId, error: error.message })
		}
	}

	private handleWorkerExit(workerId: string, code: number | null, signal: NodeJS.Signals | null): void {
		this.cleanupWorker(workerId)
		this.emit('worker:exit', { workerId, code, signal })
	}

	private cleanupWorker(workerId: string): void {
		const worker = this.workers.get(workerId)
		if (worker) {
			this.usedPorts.delete(worker.info.port)
			worker.info.status = 'stopped'

			// Reject any pending requests
			for (const [requestId, callback] of worker.pendingRequests) {
				callback({ success: false, message: 'Worker stopped' })
			}
			worker.pendingRequests.clear()

			this.workers.delete(workerId)
		}
	}

	private getAvailablePort(): number | null {
		for (let port = this.portRange.start; port <= this.portRange.end; port++) {
			if (!this.usedPorts.has(port)) {
				return port
			}
		}
		return null
	}

	private setupCleanup(): void {
		const cleanup = () => {
			console.log('Deteniendo todos los workers...')
			const stopPromises = Array.from(this.workers.keys()).map((id) => this.stopWorker(id))
			Promise.all(stopPromises).then(() => {
				process.exit(0)
			})
		}

		process.on('SIGTERM', cleanup)
		process.on('SIGINT', cleanup)
		process.on('exit', cleanup)
	}

	// Request handlers for worker requests
	private async handleNodesListRequest(data: any): Promise<any> {
		try {
			const { getNodeClass } = await import('@shared/store/node.store')
			const nodeClasses = getNodeClass()
			return { success: true, data: nodeClasses }
		} catch (error) {
			return { success: false, message: 'Error obteniendo lista de nodos' }
		}
	}

	private async handleNodesGetRequest(data: any): Promise<any> {
		try {
			const { type } = data
			if (!type) {
				return { success: false, message: 'Tipo de nodo requerido' }
			}

			const { getNodeClass } = await import('@shared/store/node.store')
			const nodeClasses = getNodeClass()
			const nodeClass = nodeClasses[type]

			if (!nodeClass) {
				return { success: false, message: 'Tipo de nodo no encontrado' }
			}

			return { success: true, data: nodeClass }
		} catch (error) {
			return { success: false, message: 'Error obteniendo nodo' }
		}
	}

	private async handleWorkflowGetRequest(data: any): Promise<any> {
		try {
			// Import models dynamically to avoid circular dependencies
			const { Workflow } = await import('../models')
			const { id } = data

			const workflow = await Workflow.findByPk(id)
			if (!workflow) {
				return { success: false, message: 'Workflow no encontrado' }
			}

			return { success: true, data: workflow }
		} catch (error) {
			return { success: false, message: 'Error obteniendo workflow' }
		}
	}

	private async handleSystemHealthRequest(data: any): Promise<any> {
		return {
			success: true,
			data: {
				timestamp: new Date().toISOString(),
				uptime: process.uptime(),
				memory: process.memoryUsage(),
				activeWorkers: this.workers.size
			}
		}
	}

	private async routeToSocketHandler(route: string, data: any): Promise<any> {
		// This could be extended to route to actual socket handlers
		// For now, return a not found response
		return { success: false, message: `Ruta ${route} no implementada` }
	}

	// Additional request handlers for extended worker functionality
	private async handleWorkerLogRequest(data: any): Promise<any> {
		try {
			const { level, message, data: logData, timestamp } = data
			console.log(`[Worker Log ${level.toUpperCase()}] ${timestamp}: ${message}`, logData)
			return { success: true, message: 'Log recibido' }
		} catch (error) {
			return { success: false, message: 'Error procesando log' }
		}
	}

	private async handleWorkerProgressRequest(data: any): Promise<any> {
		try {
			const { nodeId, stepName, percentage, message, timestamp } = data
			// Here you could emit progress updates to connected clients
			// or store progress in database for dashboard
			console.log(`[Worker Progress] ${timestamp}: ${stepName} - ${percentage}% - ${message}`)
			return { success: true, message: 'Progreso actualizado' }
		} catch (error) {
			return { success: false, message: 'Error actualizando progreso' }
		}
	}

	private async handleWorkerMetricsRequest(data: any): Promise<any> {
		try {
			const { executionTime, memoryUsage, cpuUsage, nodesProcessed, errorsCount, customMetrics, timestamp } = data
			// Store metrics for monitoring and analytics
			console.log(`[Worker Metrics] ${timestamp}:`, {
				executionTime,
				memoryUsage,
				cpuUsage,
				nodesProcessed,
				errorsCount,
				customMetrics
			})
			return { success: true, message: 'Métricas recibidas' }
		} catch (error) {
			return { success: false, message: 'Error procesando métricas' }
		}
	}

	private async handleDatabaseOperationRequest(data: any): Promise<any> {
		try {
			const { operation, params } = data
			// Implement database operations proxy here
			// This allows workers to perform database operations through the main server
			console.log(`[Database Operation] ${operation}:`, params)
			return { success: false, message: 'Operaciones de base de datos no implementadas aún' }
		} catch (error) {
			return { success: false, message: 'Error en operación de base de datos' }
		}
	}

	private async handleExternalAPIRequest(data: any): Promise<any> {
		try {
			const { url, method = 'GET', headers, data: requestData, timeout = 30000 } = data
			// Implement external API proxy here for rate limiting, auth, etc.
			console.log(`[External API] ${method} ${url}`)
			return { success: false, message: 'Proxy de API externa no implementado aún' }
		} catch (error) {
			return { success: false, message: 'Error en solicitud de API externa' }
		}
	}

	private async handleFileOperationRequest(data: any): Promise<any> {
		try {
			const { operation, path, data: fileData, encoding = 'utf8' } = data
			// Implement file operations proxy here
			console.log(`[File Operation] ${operation}: ${path}`)
			return { success: false, message: 'Operaciones de archivo no implementadas aún' }
		} catch (error) {
			return { success: false, message: 'Error en operación de archivo' }
		}
	}

	private async handleCredentialsRequest(data: any): Promise<any> {
		try {
			const { id } = data
			// Implement secure credential retrieval here
			console.log(`[Credentials Request] ID: ${id}`)
			return { success: false, message: 'Sistema de credenciales no implementado aún' }
		} catch (error) {
			return { success: false, message: 'Error obteniendo credenciales' }
		}
	}

	private async handleEnvironmentRequest(data: any): Promise<any> {
		try {
			const { key } = data
			// Return environment variables (filtered for security)
			if (key) {
				const value = process.env[key]
				return {
					success: true,
					data: value ? { [key]: value } : null,
					message: value ? 'Variable encontrada' : 'Variable no encontrada'
				}
			}

			// Return safe environment variables
			const safeEnvs = {
				NODE_ENV: process.env.NODE_ENV,
				PORT: process.env.PORT,
				SERVER_PORT: process.env.SERVER_PORT
			}
			return { success: true, data: safeEnvs }
		} catch (error) {
			return { success: false, message: 'Error obteniendo variables de entorno' }
		}
	}
}

// Singleton instance
export const workerManager = new WorkerManager()
