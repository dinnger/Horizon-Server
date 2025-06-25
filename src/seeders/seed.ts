import bcrypt from "bcrypt";
import {
	User,
	Role,
	Permission,
	RolePermission,
	Workspace,
	Project,
	Workflow,
	UserSettings,
	initDatabase,
} from "../models";

export const seedDatabase = async () => {
	try {
		// Initialize database first
		await initDatabase();

		// Create roles first
		const superAdminRole = await Role.findOrCreate({
			where: { name: "SuperAdmin" },
			defaults: {
				name: "SuperAdmin",
				description: "Acceso total al sistema",
				level: 0,
				status: "active",
			},
		});

		const adminRole = await Role.findOrCreate({
			where: { name: "Admin" },
			defaults: {
				name: "Admin",
				description: "Administrador con acceso completo a funcionalidades",
				level: 1,
				status: "active",
			},
		});

		const managerRole = await Role.findOrCreate({
			where: { name: "Manager" },
			defaults: {
				name: "Manager",
				description: "Gestor de proyectos y workflows",
				level: 2,
				status: "active",
			},
		});

		const userRole = await Role.findOrCreate({
			where: { name: "User" },
			defaults: {
				name: "User",
				description: "Usuario básico con acceso limitado",
				level: 3,
				status: "active",
			},
		});

		const viewerRole = await Role.findOrCreate({
			where: { name: "Viewer" },
			defaults: {
				name: "Viewer",
				description: "Solo lectura",
				level: 4,
				status: "active",
			},
		});

		// Create permissions
		const modules = [
			"users",
			"roles",
			"workspaces",
			"projects",
			"workflows",
			"executions",
			"settings",
			"logs",
			"dashboard",
		];
		const actions = ["create", "read", "update", "delete", "execute", "admin"];

		const permissions = [];
		for (const module of modules) {
			for (const action of actions) {
				const permission = await Permission.findOrCreate({
					where: { module, action },
					defaults: {
						module,
						action,
						description: `${action.charAt(0).toUpperCase() + action.slice(1)} access to ${module}`,
						status: "active",
					},
				});
				permissions.push(permission[0]);
			}
		}

		// Assign permissions to roles
		// SuperAdmin: All permissions
		for (const permission of permissions) {
			await RolePermission.findOrCreate({
				where: {
					roleId: superAdminRole[0].id,
					permissionId: permission.id,
				},
				defaults: {
					roleId: superAdminRole[0].id,
					permissionId: permission.id,
					granted: true,
				},
			});
		}

		// Admin: All except user and role management
		const adminPermissions = permissions.filter(
			(p) =>
				!(
					(p.module === "users" || p.module === "roles") &&
					["create", "delete", "admin"].includes(p.action)
				),
		);

		for (const permission of adminPermissions) {
			await RolePermission.findOrCreate({
				where: {
					roleId: adminRole[0].id,
					permissionId: permission.id,
				},
				defaults: {
					roleId: adminRole[0].id,
					permissionId: permission.id,
					granted: true,
				},
			});
		}

		// Manager: Project and workflow management
		const managerPermissions = permissions.filter(
			(p) =>
				[
					"workspaces",
					"projects",
					"workflows",
					"executions",
					"dashboard",
				].includes(p.module) &&
				["create", "read", "update", "execute"].includes(p.action),
		);

		for (const permission of managerPermissions) {
			await RolePermission.findOrCreate({
				where: {
					roleId: managerRole[0].id,
					permissionId: permission.id,
				},
				defaults: {
					roleId: managerRole[0].id,
					permissionId: permission.id,
					granted: true,
				},
			});
		}

		// User: Basic access
		const userPermissions = permissions.filter(
			(p) =>
				[
					"workspaces",
					"projects",
					"workflows",
					"executions",
					"dashboard",
					"settings",
				].includes(p.module) && ["read", "execute"].includes(p.action),
		);

		for (const permission of userPermissions) {
			await RolePermission.findOrCreate({
				where: {
					roleId: userRole[0].id,
					permissionId: permission.id,
				},
				defaults: {
					roleId: userRole[0].id,
					permissionId: permission.id,
					granted: true,
				},
			});
		}

		// Viewer: Only read access
		const viewerPermissions = permissions.filter((p) => p.action === "read");

		for (const permission of viewerPermissions) {
			await RolePermission.findOrCreate({
				where: {
					roleId: viewerRole[0].id,
					permissionId: permission.id,
				},
				defaults: {
					roleId: viewerRole[0].id,
					permissionId: permission.id,
					granted: true,
				},
			});
		}

		// Create admin user
		const adminPasswordHash = await bcrypt.hash("admin123", 10);
		const adminUser = await User.findOrCreate({
			where: { email: "admin@horizon.com" },
			defaults: {
				email: "admin@horizon.com",
				name: "Administrator",
				password: adminPasswordHash,
				avatar:
					"https://ui-avatars.com/api/?name=Administrator&background=3b82f6&color=fff",
				roleId: superAdminRole[0].id,
				status: "active",
			},
		});

		// Create manager user
		const managerPasswordHash = await bcrypt.hash("manager123", 10);
		const managerUser = await User.findOrCreate({
			where: { email: "manager@horizon.com" },
			defaults: {
				email: "manager@horizon.com",
				name: "Project Manager",
				password: managerPasswordHash,
				avatar:
					"https://ui-avatars.com/api/?name=Project+Manager&background=f59e0b&color=fff",
				roleId: managerRole[0].id,
				status: "active",
			},
		});

		// Create regular user
		const userPasswordHash = await bcrypt.hash("user123", 10);
		const regularUser = await User.findOrCreate({
			where: { email: "user@horizon.com" },
			defaults: {
				email: "user@horizon.com",
				name: "John Doe",
				password: userPasswordHash,
				avatar:
					"https://ui-avatars.com/api/?name=John+Doe&background=8b5cf6&color=fff",
				roleId: userRole[0].id,
				status: "active",
			},
		});

		// Create viewer user
		const viewerPasswordHash = await bcrypt.hash("viewer123", 10);
		const viewerUser = await User.findOrCreate({
			where: { email: "viewer@horizon.com" },
			defaults: {
				email: "viewer@horizon.com",
				name: "Viewer User",
				password: viewerPasswordHash,
				avatar:
					"https://ui-avatars.com/api/?name=Viewer+User&background=6b7280&color=fff",
				roleId: viewerRole[0].id,
				status: "active",
			},
		});

		// Create user settings for all users
		const defaultSettings = {
			theme: "crystal",
			fontSize: 16,
			canvasRefreshRate: 33,
			language: "es",
			notifications: {
				general: true,
				workflowExecution: true,
				errors: true,
				systemUpdates: false,
				projectReminders: true,
			},
			performance: {
				reducedAnimations: false,
				autoSave: true,
			},
			privacy: {
				telemetry: false,
				localCache: true,
			},
		};

		// Admin settings (with system updates enabled)
		await UserSettings.findOrCreate({
			where: { userId: adminUser[0].id },
			defaults: {
				userId: adminUser[0].id,
				...defaultSettings,
				notifications: {
					...defaultSettings.notifications,
					systemUpdates: true,
				},
			},
		});

		// Manager settings
		await UserSettings.findOrCreate({
			where: { userId: managerUser[0].id },
			defaults: {
				userId: managerUser[0].id,
				...defaultSettings,
			},
		});

		// Regular user settings
		await UserSettings.findOrCreate({
			where: { userId: regularUser[0].id },
			defaults: {
				userId: regularUser[0].id,
				...defaultSettings,
			},
		});

		// Viewer settings
		await UserSettings.findOrCreate({
			where: { userId: viewerUser[0].id },
			defaults: {
				userId: viewerUser[0].id,
				...defaultSettings,
			},
		});

		// Create default workspaces
		const adminWorkspace = await Workspace.findOrCreate({
			where: {
				userId: adminUser[0].id,
				isDefault: true,
			},
			defaults: {
				name: "Admin Workspace",
				description: "Workspace principal del administrador",
				color: "#3b82f6",
				icon: "mdi-briefcase",
				userId: adminUser[0].id,
				isDefault: true,
				status: "active",
			},
		});

		const userWorkspace = await Workspace.findOrCreate({
			where: {
				userId: regularUser[0].id,
				isDefault: true,
			},
			defaults: {
				name: "Default Workspace",
				description: "Workspace principal para tus proyectos",
				color: "#8b5cf6",
				icon: "mdi-briefcase",
				userId: regularUser[0].id,
				isDefault: true,
				status: "active",
			},
		});

		// Create sample projects
		const webAppProject = await Project.findOrCreate({
			where: {
				workspaceId: userWorkspace[0].id,
				name: "Web Application",
			},
			defaults: {
				name: "Web Application",
				description: "Una aplicación web moderna con Vue.js y TypeScript",
				workspaceId: userWorkspace[0].id,
				status: "active",
			},
		});

		const mobileAppProject = await Project.findOrCreate({
			where: {
				workspaceId: userWorkspace[0].id,
				name: "Mobile App",
			},
			defaults: {
				name: "Mobile App",
				description: "Aplicación móvil para iOS y Android",
				workspaceId: userWorkspace[0].id,
				status: "inactive",
			},
		});

		const apiProject = await Project.findOrCreate({
			where: {
				workspaceId: userWorkspace[0].id,
				name: "API Backend",
			},
			defaults: {
				name: "API Backend",
				description: "API REST con Node.js y Express",
				workspaceId: userWorkspace[0].id,
				status: "active",
			},
		});

		// Create sample workflows
		const sampleWorkflows = [
			{
				name: "Procesamiento de Datos",
				description: "Workflow para procesamiento automático de datos",
				projectId: webAppProject[0].id,
				status: "success" as const,
				lastRun: new Date("2024-12-25T10:30:00Z"),
				duration: "2m 15s",
				version: "1.0.0",
				isPublished: true,
			},
			{
				name: "Validación de Usuario",
				description: "Workflow para validar y autenticar usuarios",
				projectId: webAppProject[0].id,
				status: "running" as const,
				lastRun: new Date("2024-12-25T11:45:00Z"),
				duration: "45s",
				version: "0.8.3",
				isPublished: false,
			},
			{
				name: "Generación de Reportes",
				description: "Workflow automático para generar reportes diarios",
				projectId: apiProject[0].id,
				status: "failed" as const,
				lastRun: new Date("2024-12-25T09:15:00Z"),
				duration: "1m 30s",
				version: "1.2.1",
				isPublished: true,
			},
			{
				name: "Backup de Datos",
				description: "Workflow para backup automático de la base de datos",
				projectId: apiProject[0].id,
				status: "pending" as const,
				version: "0.5.0",
				isPublished: false,
			},
		];

		for (const workflowData of sampleWorkflows) {
			await Workflow.findOrCreate({
				where: {
					projectId: workflowData.projectId,
					name: workflowData.name,
				},
				defaults: workflowData,
			});
		}

		console.log("Database seeded successfully!");
	} catch (error) {
		console.error("Error seeding database:", error);
		throw error;
	}
};
