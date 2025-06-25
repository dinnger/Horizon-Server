import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import cors from "cors";
import { config } from "dotenv";
import { Op } from "sequelize";
import bcrypt from "bcrypt";
import {
	initDatabase,
	User,
	Workspace,
	Project,
	Workflow,
	WorkflowExecution,
	ExecutionLog,
	UserSettings,
	type UserAttributes,
} from "./models";
import { seedDatabase } from "./seeders/seed";

// Load environment variables
config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
	cors: {
		origin: process.env.CLIENT_URL || "http://localhost:5173",
		methods: ["GET", "POST"],
	},
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Socket.IO connection handling
io.on("connection", (socket) => {
	console.log("Cliente conectado:", socket.id);

	// Authentication
	socket.on("auth:login", async (data, callback) => {
		try {
			const { email, password } = data;
			const user = await User.findOne({
				where: { email, status: "active" },
				include: [
					{
						model: UserSettings,
						as: "settings",
					},
				],
			});

			if (user && (await bcrypt.compare(password, user.password))) {
				// Update last login
				await user.update({ lastLoginAt: new Date() });

				const userResponse = {
					id: user.id,
					email: user.email,
					name: user.name,
					avatar: user.avatar,
					role: user.role,
					settings: (user as User & { settings?: UserSettings }).settings,
				};

				callback({ success: true, user: userResponse });
			} else {
				callback({ success: false, message: "Credenciales inválidas" });
			}
		} catch (error) {
			console.error("Error en login:", error);
			callback({ success: false, message: "Error interno del servidor" });
		}
	});

	// Workspaces
	socket.on("workspaces:list", async (data, callback) => {
		try {
			const { userId } = data;
			const workspaces = await Workspace.findAll({
				where: { userId, status: "active" },
				order: [
					["isDefault", "DESC"],
					["createdAt", "ASC"],
				],
			});
			callback({ success: true, workspaces });
		} catch (error) {
			console.error("Error listando workspaces:", error);
			callback({ success: false, message: "Error al cargar workspaces" });
		}
	});

	socket.on("workspaces:create", async (data, callback) => {
		try {
			const workspace = await Workspace.create(data);
			callback({ success: true, workspace });
			socket.broadcast.emit("workspaces:created", workspace);
		} catch (error) {
			console.error("Error creando workspace:", error);
			callback({ success: false, message: "Error al crear workspace" });
		}
	});

	socket.on("workspaces:update", async (data, callback) => {
		try {
			const { id, ...updates } = data;
			const [updatedRows] = await Workspace.update(updates, { where: { id } });
			if (updatedRows > 0) {
				const workspace = await Workspace.findByPk(id);
				callback({ success: true, workspace });
				socket.broadcast.emit("workspaces:updated", workspace);
			} else {
				callback({ success: false, message: "Workspace no encontrado" });
			}
		} catch (error) {
			console.error("Error actualizando workspace:", error);
			callback({ success: false, message: "Error al actualizar workspace" });
		}
	});

	socket.on("workspaces:delete", async (data, callback) => {
		try {
			const { id } = data;
			await Workspace.update({ status: "archived" }, { where: { id } });
			callback({ success: true });
			socket.broadcast.emit("workspaces:deleted", { id });
		} catch (error) {
			console.error("Error eliminando workspace:", error);
			callback({ success: false, message: "Error al eliminar workspace" });
		}
	});

	// Projects
	socket.on("projects:list", async (data, callback) => {
		try {
			const { workspaceId } = data;
			const projects = await Project.findAll({
				where: { workspaceId, status: "active" },
				order: [["createdAt", "DESC"]],
			});
			callback({ success: true, projects });
		} catch (error) {
			console.error("Error listando proyectos:", error);
			callback({ success: false, message: "Error al cargar proyectos" });
		}
	});

	socket.on("projects:create", async (data, callback) => {
		try {
			const project = await Project.create(data);
			callback({ success: true, project });
			socket.broadcast.emit("projects:created", project);
		} catch (error) {
			console.error("Error creando proyecto:", error);
			callback({ success: false, message: "Error al crear proyecto" });
		}
	});

	socket.on("projects:update", async (data, callback) => {
		try {
			const { id, ...updates } = data;
			const [updatedRows] = await Project.update(updates, { where: { id } });
			if (updatedRows > 0) {
				const project = await Project.findByPk(id);
				callback({ success: true, project });
				socket.broadcast.emit("projects:updated", project);
			} else {
				callback({ success: false, message: "Proyecto no encontrado" });
			}
		} catch (error) {
			console.error("Error actualizando proyecto:", error);
			callback({ success: false, message: "Error al actualizar proyecto" });
		}
	});

	socket.on("projects:delete", async (data, callback) => {
		try {
			const { id } = data;
			await Project.update({ status: "archived" }, { where: { id } });
			callback({ success: true });
			socket.broadcast.emit("projects:deleted", { id });
		} catch (error) {
			console.error("Error eliminando proyecto:", error);
			callback({ success: false, message: "Error al eliminar proyecto" });
		}
	});

	// Workflows
	socket.on("workflows:list", async (data, callback) => {
		try {
			const { projectId } = data;
			const workflows = await Workflow.findAll({
				where: {
					projectId,
					status: {
						[Op.ne]: "archived",
					},
				},
				order: [["createdAt", "DESC"]],
			});
			callback({ success: true, workflows });
		} catch (error) {
			console.error("Error listando workflows:", error);
			callback({ success: false, message: "Error al cargar workflows" });
		}
	});

	socket.on("workflows:create", async (data, callback) => {
		try {
			const workflow = await Workflow.create(data);
			callback({ success: true, workflow });
			socket.broadcast.emit("workflows:created", workflow);
		} catch (error) {
			console.error("Error creando workflow:", error);
			callback({ success: false, message: "Error al crear workflow" });
		}
	});

	socket.on("workflows:update", async (data, callback) => {
		try {
			const { id, ...updates } = data;
			const [updatedRows] = await Workflow.update(updates, { where: { id } });
			if (updatedRows > 0) {
				const workflow = await Workflow.findByPk(id);
				callback({ success: true, workflow });
				socket.broadcast.emit("workflows:updated", workflow);
			} else {
				callback({ success: false, message: "Workflow no encontrado" });
			}
		} catch (error) {
			console.error("Error actualizando workflow:", error);
			callback({ success: false, message: "Error al actualizar workflow" });
		}
	});

	socket.on("workflows:delete", async (data, callback) => {
		try {
			const { id } = data;
			await Workflow.update({ status: "archived" }, { where: { id } });
			callback({ success: true });
			socket.broadcast.emit("workflows:deleted", { id });
		} catch (error) {
			console.error("Error eliminando workflow:", error);
			callback({ success: false, message: "Error al eliminar workflow" });
		}
	});

	socket.on("workflows:execute", async (data, callback) => {
		try {
			const { workflowId, trigger = "manual" } = data;

			// Create execution record
			const execution = await WorkflowExecution.create({
				workflowId,
				status: "running",
				startTime: new Date(),
				trigger,
			});

			// Update workflow status
			await Workflow.update(
				{
					status: "running",
					lastRun: new Date(),
				},
				{ where: { id: workflowId } },
			);

			// Simulate workflow execution (replace with actual execution logic)
			setTimeout(async () => {
				const endTime = new Date();
				const duration = `${Math.floor((endTime.getTime() - execution.startTime.getTime()) / 1000)}s`;

				await execution.update({
					status: "success",
					endTime,
					duration,
				});

				await Workflow.update(
					{
						status: "success",
						duration,
					},
					{ where: { id: workflowId } },
				);

				socket.emit("workflows:execution-completed", {
					workflowId,
					executionId: execution.id,
					status: "success",
				});
			}, 3000);

			callback({ success: true, executionId: execution.id });
		} catch (error) {
			console.error("Error ejecutando workflow:", error);
			callback({ success: false, message: "Error al ejecutar workflow" });
		}
	});

	// User Settings
	socket.on("settings:get", async (data, callback) => {
		try {
			const { userId } = data;
			const settings = await UserSettings.findOne({ where: { userId } });
			callback({ success: true, settings });
		} catch (error) {
			console.error("Error obteniendo configuraciones:", error);
			callback({ success: false, message: "Error al cargar configuraciones" });
		}
	});

	socket.on("settings:update", async (data, callback) => {
		try {
			const { userId, ...updates } = data;
			const [settings] = await UserSettings.upsert({
				userId,
				...updates,
			});
			callback({ success: true, settings });
		} catch (error) {
			console.error("Error actualizando configuraciones:", error);
			callback({
				success: false,
				message: "Error al actualizar configuraciones",
			});
		}
	});

	socket.on("disconnect", () => {
		console.log("Cliente desconectado:", socket.id);
	});
});

// Health check endpoint
app.get("/health", (req, res) => {
	res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Initialize database and start server
const startServer = async () => {
	try {
		await initDatabase();

		// Seed database if needed
		if (process.env.SEED_DATABASE === "true") {
			await seedDatabase();
		}

		server.listen(PORT, () => {
			console.log(`Servidor corriendo en puerto ${PORT}`);
			console.log("Socket.IO listo para conexiones");
		});
	} catch (error) {
		console.error("Error iniciando servidor:", error);
		process.exit(1);
	}
};

startServer();
