import bcrypt from "bcrypt";
import {
	User,
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
				role: "admin",
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
				role: "user",
				status: "active",
			},
		});

		// Create user settings for both users
		await UserSettings.findOrCreate({
			where: { userId: adminUser[0].id },
			defaults: {
				userId: adminUser[0].id,
				theme: "crystal",
				fontSize: 16,
				canvasRefreshRate: 33,
				language: "es",
				notifications: {
					general: true,
					workflowExecution: true,
					errors: true,
					systemUpdates: true,
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
			},
		});

		await UserSettings.findOrCreate({
			where: { userId: regularUser[0].id },
			defaults: {
				userId: regularUser[0].id,
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
