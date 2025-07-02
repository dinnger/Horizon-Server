import { Op } from 'sequelize'
import { Workflow, Project, Workspace, WorkflowExecution } from '../models'
import type { SocketData } from './index'
import { getNodeClass } from '@shared/store/node.store'
import * as fs from 'node:fs'
import * as path from 'node:path'

const nodeClass = getNodeClass()

export const setupWorkflowRoutes = {
	// List workflows - requires read permission
	'workflows:list': async ({ socket, data, callback }: SocketData) => {
		try {
			const { projectId } = data

			const workflows = await Workflow.findAll({
				where: {
					projectId,
					status: {
						[Op.ne]: 'archived'
					}
				},
				order: [['createdAt', 'DESC']]
			})

			callback({ success: true, workflows })
		} catch (error) {
			console.error('Error listando workflows:', error)
			callback({ success: false, message: 'Error al cargar workflows' })
		}
	},

	// Get workflow by ID - requires read permission
	'workflows:get': async ({ socket, data, callback }: SocketData) => {
		try {
			const { id } = data

			const workflow = await Workflow.findOne({
				where: {
					id,
					status: {
						[Op.ne]: 'archived'
					}
				}
			})

			// Hidratación de propiedades
			if (workflow?.workflowData?.nodes) {
				for (const nodes of Object.values(workflow.workflowData.nodes)) {
					// Si no existe el nodo, eliminarlo
					if (!nodeClass[nodes.type]) {
						delete workflow.workflowData.nodes[nodes.id]
						continue
					}
					const property = nodeClass[nodes.type].properties
					for (const [key, value] of Object.entries(nodes.properties)) {
						nodes.properties[key] = {
							...property[key],
							...(value as object)
						}
					}
				}
			}

			if (!workflow) {
				callback({ success: false, message: 'Workflow no encontrado' })
				return
			}

			callback({ success: true, workflow })
		} catch (error) {
			console.error('Error obteniendo workflow:', error)
			callback({ success: false, message: 'Error al obtener workflow' })
		}
	},

	// Create workflow - requires authentication and project access
	// Create workflow - requires create permission
	'workflows:create': async ({ socket, data, callback }: SocketData) => {
		try {
			const workflow = await Workflow.create(data)
			callback({ success: true, workflow })
			socket.broadcast.emit('workflows:created', workflow)
		} catch (error) {
			console.error('Error creando workflow:', error)
			callback({ success: false, message: 'Error al crear workflow' })
		}
	},

	// Update workflow - requires authentication and project access
	// Update workflow - requires update permission
	'workflows:update': async ({ socket, data, callback }: SocketData) => {
		try {
			const { id, connections, nodes } = data

			const updates = {
				workflowData: {
					nodes,
					connections
				},
				updatedAt: new Date()
			}

			const [updatedRows] = await Workflow.update(updates, { where: { id }, individualHooks: true })
			if (updatedRows > 0) {
				const updatedWorkflow = await Workflow.findByPk(id)
				callback({ success: true, workflow: updatedWorkflow })
				socket.broadcast.emit('workflows:updated', updatedWorkflow)
			} else {
				callback({ success: false, message: 'Error al actualizar workflow' })
			}
		} catch (error) {
			console.error('Error actualizando workflow:', error)
			callback({ success: false, message: 'Error al actualizar workflow' })
		}
	},

	// Delete workflow - requires authentication and project access
	// Delete workflow - requires delete permission
	'workflows:delete': async ({ socket, data, callback }: SocketData) => {
		try {
			const { id } = data
			await Workflow.update({ status: 'archived' }, { where: { id }, individualHooks: true })
			callback({ success: true })
			socket.broadcast.emit('workflows:deleted', { id })
		} catch (error) {
			console.error('Error eliminando workflow:', error)
			callback({ success: false, message: 'Error al eliminar workflow' })
		}
	},

	// Execute workflow - requires authentication and project access
	// Execute workflow - requires execute permission
	'workflows:execute': async ({ socket, data, callback }: SocketData) => {
		try {
			const { workflowId, trigger = 'manual' } = data

			// Get workflow data to save to file
			const workflow = await Workflow.findByPk(workflowId)
			if (!workflow) {
				callback({ success: false, message: 'Workflow no encontrado' })
				return
			}

			// Save workflow to file before execution
			try {
				const dataDir = path.join(process.cwd(), 'data', workflowId)

				// Create directory if it doesn't exist
				if (!fs.existsSync(dataDir)) {
					fs.mkdirSync(dataDir, { recursive: true })
				}

				// Save flow.json
				const flowPath = path.join(dataDir, 'flow.json')
				fs.writeFileSync(flowPath, JSON.stringify(workflow.workflowData, null, 2), 'utf8')

				console.log(`Flujo guardado en: ${flowPath}`)
			} catch (fileError) {
				console.error('Error guardando flujo en archivo:', fileError)
				// Continue with execution even if file save fails
			}

			// Create execution record
			const execution = await WorkflowExecution.create({
				workflowId,
				status: 'running',
				startTime: new Date(),
				trigger
			})

			// Update workflow status
			await Workflow.update(
				{
					status: 'running',
					lastRun: new Date()
				},
				{ where: { id: workflowId } }
			)

			// Simulate workflow execution (replace with actual execution logic)
			setTimeout(async () => {
				const endTime = new Date()
				const duration = `${Math.floor((endTime.getTime() - execution.startTime.getTime()) / 1000)}s`

				await execution.update({
					status: 'success',
					endTime,
					duration
				})

				await Workflow.update(
					{
						status: 'success',
						duration
					},
					{ where: { id: workflowId } }
				)

				socket.emit('workflows:execution-completed', {
					workflowId,
					executionId: execution.id,
					status: 'success'
				})
			}, 3000)

			callback({ success: true, executionId: execution.id })
		} catch (error) {
			console.error('Error ejecutando workflow:', error)
			callback({ success: false, message: 'Error al ejecutar workflow' })
		}
	},

	// Save workflow to JSON file - requires authentication and project access
	'workflows:save-to-json': async ({ socket, data, callback }: SocketData) => {
		try {
			const { id } = data

			const workflow = await Workflow.findOne({
				where: {
					id,
					status: {
						[Op.ne]: 'archived'
					}
				}
			})

			if (!workflow) {
				callback({ success: false, message: 'Workflow no encontrado' })
				return
			}

			// Define file path and name
			const filePath = path.join(__dirname, `../../uploads/workflow_${id}.json`)

			// Write workflow data to JSON file
			fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2))

			callback({ success: true, filePath })
		} catch (error) {
			console.error('Error guardando workflow a JSON:', error)
			callback({ success: false, message: 'Error al guardar workflow a JSON' })
		}
	},

	// Save workflow to file - requires update permission
	'workflows:saveToFile': async ({ socket, data, callback }: SocketData) => {
		try {
			const { workflowId } = data

			// Get workflow data
			const workflow = await Workflow.findByPk(workflowId)
			if (!workflow) {
				callback({ success: false, message: 'Workflow no encontrado' })
				return
			}

			// Create data directory
			const dataDir = path.join(process.cwd(), 'data', workflowId)

			if (!fs.existsSync(dataDir)) {
				fs.mkdirSync(dataDir, { recursive: true })
			}

			// Save flow.json
			const flowPath = path.join(dataDir, 'flow.json')
			fs.writeFileSync(flowPath, JSON.stringify(workflow.workflowData, null, 2), 'utf8')

			console.log(`Flujo guardado en: ${flowPath}`)

			callback({
				success: true,
				message: 'Flujo guardado exitosamente',
				path: flowPath
			})
		} catch (error) {
			console.error('Error guardando flujo en archivo:', error)
			callback({ success: false, message: 'Error al guardar flujo en archivo' })
		}
	}
}
