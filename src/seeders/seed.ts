import bcrypt from 'bcrypt'
import { User, Role, Permission, RolePermission, Workspace, Project, Workflow, UserSettings, initDatabase } from '../models'

export const seedDatabase = async () => {
	try {
		// Initialize database first
		await initDatabase()

		// Create roles first
		const superAdminRole = await Role.findOrCreate({
			where: { name: 'SuperAdmin' },
			defaults: {
				name: 'SuperAdmin',
				description: 'Acceso total al sistema',
				level: 0,
				status: 'active'
			}
		})

		const adminRole = await Role.findOrCreate({
			where: { name: 'Admin' },
			defaults: {
				name: 'Admin',
				description: 'Administrador con acceso completo a funcionalidades',
				level: 1,
				status: 'active'
			}
		})

		const managerRole = await Role.findOrCreate({
			where: { name: 'Manager' },
			defaults: {
				name: 'Manager',
				description: 'Gestor de proyectos y workflows',
				level: 2,
				status: 'active'
			}
		})

		const userRole = await Role.findOrCreate({
			where: { name: 'User' },
			defaults: {
				name: 'User',
				description: 'Usuario básico con acceso limitado',
				level: 3,
				status: 'active'
			}
		})

		const viewerRole = await Role.findOrCreate({
			where: { name: 'Viewer' },
			defaults: {
				name: 'Viewer',
				description: 'Solo lectura',
				level: 4,
				status: 'active'
			}
		})

		// Create permissions with new structure
		const permissionConfigs = [
			// Usuario básico - solo sus propios recursos
			{
				module: 'workspaces',
				action: 'create',
				scope: 'own' as const,
				priority: 10,
				description: 'Crear sus propios workspaces',
				status: 'active' as const
			},
			{
				module: 'workspaces',
				action: 'list',
				scope: 'own' as const,
				priority: 10,
				description: 'Ver sus propios workspaces',
				status: 'active' as const
			},
			{
				module: 'workspaces',
				action: 'update',
				scope: 'own' as const,
				priority: 10,
				description: 'Modificar sus propios workspaces',
				status: 'active' as const
			},
			{
				module: 'workspaces',
				action: 'delete',
				scope: 'own' as const,
				priority: 10,
				description: 'Eliminar sus propios workspaces',
				status: 'active' as const
			},

			{
				module: 'projects',
				action: 'create',
				scope: 'workspace' as const,
				priority: 20,
				description: 'Crear proyectos en sus workspaces',
				status: 'active' as const
			},
			{
				module: 'projects',
				action: 'list',
				scope: 'workspace' as const,
				priority: 20,
				description: 'Ver proyectos en sus workspaces',
				status: 'active' as const
			},
			{
				module: 'projects',
				action: 'get',
				scope: 'workspace' as const,
				priority: 20,
				description: 'Obtener un proyecto en sus workspaces',
				status: 'active' as const
			},
			{
				module: 'projects',
				action: 'update',
				scope: 'workspace' as const,
				priority: 20,
				description: 'Modificar proyectos en sus workspaces',
				status: 'active' as const
			},
			{
				module: 'projects',
				action: 'delete',
				scope: 'workspace' as const,
				priority: 20,
				description: 'Eliminar proyectos en sus workspaces',
				status: 'active' as const
			},

			{
				module: 'workflows',
				action: 'create',
				scope: 'project' as const,
				priority: 30,
				description: 'Crear workflows en sus proyectos',
				status: 'active' as const
			},
			{
				module: 'workflows',
				action: 'list',
				scope: 'project' as const,
				priority: 30,
				description: 'Ver workflows en sus proyectos',
				status: 'active' as const
			},
			{
				module: 'workflows',
				action: 'update',
				scope: 'project' as const,
				priority: 30,
				description: 'Modificar workflows en sus proyectos',
				status: 'active' as const
			},
			{
				module: 'workflows',
				action: 'delete',
				scope: 'project' as const,
				priority: 30,
				description: 'Eliminar workflows en sus proyectos',
				status: 'active' as const
			},
			{
				module: 'workflows',
				action: 'execute',
				scope: 'project' as const,
				priority: 30,
				description: 'Ejecutar workflows en sus proyectos',
				status: 'active' as const
			},
			{
				module: 'workflows',
				action: 'get',
				scope: 'project' as const,
				priority: 30,
				description: 'Obtener un workflow en sus proyectos',
				status: 'active' as const
			},
			{
				module: 'settings',
				action: 'list',
				scope: 'own' as const,
				priority: 10,
				description: 'Ver sus propias configuraciones',
				status: 'active' as const
			},
			{
				module: 'settings',
				action: 'update',
				scope: 'own' as const,
				priority: 10,
				description: 'Modificar sus propias configuraciones',
				status: 'active' as const
			},

			// Permisos para nodos
			{
				module: 'nodes',
				action: 'list',
				scope: 'global' as const,
				priority: 15,
				description: 'Ver todos los nodos disponibles',
				status: 'active' as const
			},
			{
				module: 'nodes',
				action: 'get',
				scope: 'global' as const,
				priority: 15,
				description: 'Obtener información de nodos específicos',
				status: 'active' as const
			},
			{
				module: 'nodes',
				action: 'search',
				scope: 'global' as const,
				priority: 15,
				description: 'Buscar nodos disponibles',
				status: 'active' as const
			},
			{
				module: 'nodes',
				action: 'groups',
				scope: 'global' as const,
				priority: 15,
				description: 'Ver grupos de nodos',
				status: 'active' as const
			},
			{
				module: 'nodes',
				action: 'info',
				scope: 'global' as const,
				priority: 15,
				description: 'Obtener información detallada de nodos',
				status: 'active' as const
			},
			{
				module: 'nodes',
				action: 'stats',
				scope: 'global' as const,
				priority: 15,
				description: 'Ver estadísticas de nodos',
				status: 'active' as const
			},

			// Permisos para workers
			{
				module: 'workers',
				action: 'list',
				scope: 'global' as const,
				priority: 50,
				description: 'Ver todos los workers activos',
				status: 'active' as const
			},
			{
				module: 'workers',
				action: 'dashboard',
				scope: 'global' as const,
				priority: 50,
				description: 'Acceder al dashboard de workers',
				status: 'active' as const
			},
			{
				module: 'workers',
				action: 'stop',
				scope: 'global' as const,
				priority: 80,
				description: 'Detener workers',
				status: 'active' as const
			},
			{
				module: 'workers',
				action: 'restart',
				scope: 'global' as const,
				priority: 80,
				description: 'Reiniciar workers',
				status: 'active' as const
			},
			{
				module: 'workers',
				action: 'message',
				scope: 'global' as const,
				priority: 70,
				description: 'Enviar mensajes a workers',
				status: 'active' as const
			},

			// Permisos administrativos (scope global)
			{
				module: 'users',
				action: 'list',
				scope: 'global' as const,
				priority: 100,
				description: 'Ver todos los usuarios',
				status: 'active' as const
			},
			{
				module: 'users',
				action: 'create',
				scope: 'global' as const,
				priority: 100,
				description: 'Crear usuarios',
				status: 'active' as const
			},
			{
				module: 'users',
				action: 'update',
				scope: 'global' as const,
				priority: 100,
				description: 'Modificar usuarios',
				status: 'active' as const
			},
			{
				module: 'users',
				action: 'delete',
				scope: 'global' as const,
				priority: 100,
				description: 'Eliminar usuarios',
				status: 'active' as const
			},

			{ module: 'roles', action: 'list', scope: 'global' as const, priority: 100, description: 'Ver roles', status: 'active' as const },
			{ module: 'roles', action: 'create', scope: 'global' as const, priority: 100, description: 'Crear roles', status: 'active' as const },
			{
				module: 'roles',
				action: 'update',
				scope: 'global' as const,
				priority: 100,
				description: 'Modificar roles',
				status: 'active' as const
			},
			{
				module: 'roles',
				action: 'delete',
				scope: 'global' as const,
				priority: 100,
				description: 'Eliminar roles',
				status: 'active' as const
			},

			{
				module: 'permissions',
				action: 'list',
				scope: 'global' as const,
				priority: 100,
				description: 'Ver permisos',
				status: 'active' as const
			},
			{
				module: 'permissions',
				action: 'assign',
				scope: 'global' as const,
				priority: 100,
				description: 'Asignar permisos',
				status: 'active' as const
			},

			// Permisos de solo lectura para viewers
			{
				module: 'workspaces',
				action: 'list',
				scope: 'global' as const,
				priority: 5,
				description: 'Ver todos los workspaces',
				status: 'active' as const
			},
			{
				module: 'projects',
				action: 'list',
				scope: 'global' as const,
				priority: 5,
				description: 'Ver todos los proyectos',
				status: 'active' as const
			},
			{
				module: 'workflows',
				action: 'list',
				scope: 'global' as const,
				priority: 5,
				description: 'Ver todos los workflows',
				status: 'active' as const
			}
		]

		const permissions = []
		for (const config of permissionConfigs) {
			const permission = await Permission.findOrCreate({
				where: {
					module: config.module,
					action: config.action,
					scope: config.scope
				},
				defaults: config
			})
			permissions.push(permission[0])
		}

		// Assign permissions to roles
		// SuperAdmin: All permissions
		for (const permission of permissions) {
			await RolePermission.findOrCreate({
				where: {
					roleId: superAdminRole[0].id,
					permissionId: permission.id
				},
				defaults: {
					roleId: superAdminRole[0].id,
					permissionId: permission.id,
					granted: true
				}
			})
		}

		// Admin: All except user and role management
		const adminPermissions = permissions.filter(
			(p) => !((p.module === 'users' || p.module === 'roles') && ['create', 'delete', 'admin'].includes(p.action))
		)

		for (const permission of adminPermissions) {
			await RolePermission.findOrCreate({
				where: {
					roleId: adminRole[0].id,
					permissionId: permission.id
				},
				defaults: {
					roleId: adminRole[0].id,
					permissionId: permission.id,
					granted: true
				}
			})
		}

		// Manager: Project and workflow management
		const managerPermissions = permissions.filter(
			(p) =>
				['workspaces', 'projects', 'workflows', 'executions', 'dashboard', 'nodes', 'workers'].includes(p.module) &&
				['create', 'list', 'update', 'execute', 'get', 'search', 'groups', 'info', 'stats', 'dashboard', 'message'].includes(p.action)
		)

		for (const permission of managerPermissions) {
			await RolePermission.findOrCreate({
				where: {
					roleId: managerRole[0].id,
					permissionId: permission.id
				},
				defaults: {
					roleId: managerRole[0].id,
					permissionId: permission.id,
					granted: true
				}
			})
		}

		// User: Basic access
		const userPermissions = permissions.filter(
			(p) =>
				['workspaces', 'projects', 'workflows', 'executions', 'dashboard', 'settings', 'nodes', 'workers'].includes(p.module) &&
				['list', 'execute', 'get', 'search', 'groups', 'info', 'stats', 'dashboard'].includes(p.action)
		)

		for (const permission of userPermissions) {
			await RolePermission.findOrCreate({
				where: {
					roleId: userRole[0].id,
					permissionId: permission.id
				},
				defaults: {
					roleId: userRole[0].id,
					permissionId: permission.id,
					granted: true
				}
			})
		}

		// Viewer: Only read access
		const viewerPermissions = permissions.filter(
			(p) =>
				p.action === 'list' ||
				p.action === 'dashboard' ||
				(p.module === 'nodes' && ['get', 'search', 'groups', 'info', 'stats'].includes(p.action))
		)

		for (const permission of viewerPermissions) {
			await RolePermission.findOrCreate({
				where: {
					roleId: viewerRole[0].id,
					permissionId: permission.id
				},
				defaults: {
					roleId: viewerRole[0].id,
					permissionId: permission.id,
					granted: true
				}
			})
		}

		// Create admin user
		const adminPasswordHash = await bcrypt.hash('admin123', 10)
		const adminUser = await User.findOrCreate({
			where: { email: 'admin@horizon.com' },
			defaults: {
				email: 'admin@horizon.com',
				name: 'Administrator',
				password: adminPasswordHash,
				avatar: 'https://ui-avatars.com/api/?name=Administrator&background=3b82f6&color=fff',
				roleId: superAdminRole[0].id,
				status: 'active'
			}
		})

		// Create manager user
		const managerPasswordHash = await bcrypt.hash('manager123', 10)
		const managerUser = await User.findOrCreate({
			where: { email: 'manager@horizon.com' },
			defaults: {
				email: 'manager@horizon.com',
				name: 'Project Manager',
				password: managerPasswordHash,
				avatar: 'https://ui-avatars.com/api/?name=Project+Manager&background=f59e0b&color=fff',
				roleId: managerRole[0].id,
				status: 'active'
			}
		})

		// Create regular user
		const userPasswordHash = await bcrypt.hash('user123', 10)
		const regularUser = await User.findOrCreate({
			where: { email: 'user@horizon.com' },
			defaults: {
				email: 'user@horizon.com',
				name: 'John Doe',
				password: userPasswordHash,
				avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=8b5cf6&color=fff',
				roleId: userRole[0].id,
				status: 'active'
			}
		})

		// Create viewer user
		const viewerPasswordHash = await bcrypt.hash('viewer123', 10)
		const viewerUser = await User.findOrCreate({
			where: { email: 'viewer@horizon.com' },
			defaults: {
				email: 'viewer@horizon.com',
				name: 'Viewer User',
				password: viewerPasswordHash,
				avatar: 'https://ui-avatars.com/api/?name=Viewer+User&background=6b7280&color=fff',
				roleId: viewerRole[0].id,
				status: 'active'
			}
		})

		// Create user settings for all users
		const defaultSettings = {
			theme: 'crystal',
			fontSize: 16,
			canvasRefreshRate: 33,
			language: 'es',
			notifications: {
				general: true,
				workflowExecution: true,
				errors: true,
				systemUpdates: false,
				projectReminders: true
			},
			performance: {
				reducedAnimations: false,
				autoSave: true
			},
			privacy: {
				telemetry: false,
				localCache: true
			}
		}

		// Admin settings (with system updates enabled)
		await UserSettings.findOrCreate({
			where: { userId: adminUser[0].id },
			defaults: {
				userId: adminUser[0].id,
				...defaultSettings,
				notifications: {
					...defaultSettings.notifications,
					systemUpdates: true
				}
			}
		})

		// Manager settings
		await UserSettings.findOrCreate({
			where: { userId: managerUser[0].id },
			defaults: {
				userId: managerUser[0].id,
				...defaultSettings
			}
		})

		// Regular user settings
		await UserSettings.findOrCreate({
			where: { userId: regularUser[0].id },
			defaults: {
				userId: regularUser[0].id,
				...defaultSettings
			}
		})

		// Viewer settings
		await UserSettings.findOrCreate({
			where: { userId: viewerUser[0].id },
			defaults: {
				userId: viewerUser[0].id,
				...defaultSettings
			}
		})

		// Create default workspaces
		const adminWorkspace = await Workspace.findOrCreate({
			where: {
				userId: adminUser[0].id,
				isDefault: true
			},
			defaults: {
				name: 'Admin Workspace',
				description: 'Workspace principal del administrador',
				color: '#3b82f6',
				icon: 'mdi-briefcase',
				userId: adminUser[0].id,
				isDefault: true,
				status: 'active'
			}
		})

		const userWorkspace = await Workspace.findOrCreate({
			where: {
				userId: regularUser[0].id,
				isDefault: true
			},
			defaults: {
				name: 'Default Workspace',
				description: 'Workspace principal para tus proyectos',
				color: '#8b5cf6',
				icon: 'mdi-briefcase',
				userId: regularUser[0].id,
				isDefault: true,
				status: 'active'
			}
		})

		// // Create sample projects
		// const webAppProject = await Project.findOrCreate({
		// 	where: {
		// 		workspaceId: userWorkspace[0].id,
		// 		name: 'Web Application'
		// 	},
		// 	defaults: {
		// 		name: 'Web Application',
		// 		description: 'Una aplicación web moderna con Vue.js y TypeScript',
		// 		workspaceId: userWorkspace[0].id,
		// 		status: 'active'
		// 	}
		// })

		// const mobileAppProject = await Project.findOrCreate({
		// 	where: {
		// 		workspaceId: userWorkspace[0].id,
		// 		name: 'Mobile App'
		// 	},
		// 	defaults: {
		// 		name: 'Mobile App',
		// 		description: 'Aplicación móvil para iOS y Android',
		// 		workspaceId: userWorkspace[0].id,
		// 		status: 'inactive'
		// 	}
		// })

		// const apiProject = await Project.findOrCreate({
		// 	where: {
		// 		workspaceId: userWorkspace[0].id,
		// 		name: 'API Backend'
		// 	},
		// 	defaults: {
		// 		name: 'API Backend',
		// 		description: 'API REST con Node.js y Express',
		// 		workspaceId: userWorkspace[0].id,
		// 		status: 'active'
		// 	}
		// })

		// // Create sample workflows
		// const sampleWorkflows = [
		// 	{
		// 		name: 'Procesamiento de Datos',
		// 		description: 'Workflow para procesamiento automático de datos',
		// 		projectId: webAppProject[0].id,
		// 		status: 'success' as const,
		// 		lastRun: new Date('2024-12-25T10:30:00Z'),
		// 		duration: '2m 15s',
		// 		version: '1.0.0',
		// 		isPublished: true
		// 	},
		// 	{
		// 		name: 'Validación de Usuario',
		// 		description: 'Workflow para validar y autenticar usuarios',
		// 		projectId: webAppProject[0].id,
		// 		status: 'running' as const,
		// 		lastRun: new Date('2024-12-25T11:45:00Z'),
		// 		duration: '45s',
		// 		version: '0.8.3',
		// 		isPublished: false
		// 	},
		// 	{
		// 		name: 'Generación de Reportes',
		// 		description: 'Workflow automático para generar reportes diarios',
		// 		projectId: apiProject[0].id,
		// 		status: 'failed' as const,
		// 		lastRun: new Date('2024-12-25T09:15:00Z'),
		// 		duration: '1m 30s',
		// 		version: '1.2.1',
		// 		isPublished: true
		// 	},
		// 	{
		// 		name: 'Backup de Datos',
		// 		description: 'Workflow para backup automático de la base de datos',
		// 		projectId: apiProject[0].id,
		// 		status: 'pending' as const,
		// 		version: '0.5.0',
		// 		isPublished: false
		// 	}
		// ]

		// for (const workflowData of sampleWorkflows) {
		// 	await Workflow.findOrCreate({
		// 		where: {
		// 			projectId: workflowData.projectId,
		// 			name: workflowData.name
		// 		},
		// 		defaults: workflowData
		// 	})
		// }

		console.log('Database seeded successfully!')
	} catch (error) {
		console.error('Error seeding database:', error)
		throw error
	}
}
