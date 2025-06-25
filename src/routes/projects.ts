import type { Server } from "socket.io";
import { Project, Workspace } from "../models";
import type { AuthenticatedSocket } from "../middleware/socketAuth";

export const setupProjectRoutes = (io: Server) => {
	io.on("connection", (socket: AuthenticatedSocket) => {
		// List projects - requires authentication and workspace access
		socket.on("projects:list", async (data, callback) => {
			try {
				if (!socket.userId) {
					return callback({
						success: false,
						message: "Authentication required",
					});
				}

				const { workspaceId } = data;

				// Check if user has access to the workspace
				const workspace = await Workspace.findByPk(workspaceId);
				if (!workspace) {
					return callback({
						success: false,
						message: "Workspace no encontrado",
					});
				}

				const isOwner = workspace.userId === socket.userId;
				const isAdmin =
					socket.user?.role?.name === "SuperAdmin" ||
					socket.user?.role?.name === "Admin";

				if (!isOwner && !isAdmin) {
					return callback({
						success: false,
						message: "Sin acceso a este workspace",
					});
				}

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

		// Create project - requires authentication and workspace access
		socket.on("projects:create", async (data, callback) => {
			try {
				if (!socket.userId) {
					return callback({
						success: false,
						message: "Authentication required",
					});
				}

				const { workspaceId } = data;

				// Check if user has access to the workspace
				const workspace = await Workspace.findByPk(workspaceId);
				if (!workspace) {
					return callback({
						success: false,
						message: "Workspace no encontrado",
					});
				}

				const isOwner = workspace.userId === socket.userId;
				const isAdmin =
					socket.user?.role?.name === "SuperAdmin" ||
					socket.user?.role?.name === "Admin";

				if (!isOwner && !isAdmin) {
					return callback({
						success: false,
						message: "Sin permisos para crear proyectos en este workspace",
					});
				}

				const project = await Project.create(data);
				callback({ success: true, project });
				socket.broadcast.emit("projects:created", project);
			} catch (error) {
				console.error("Error creando proyecto:", error);
				callback({ success: false, message: "Error al crear proyecto" });
			}
		});

		// Update project - requires authentication and workspace access
		socket.on("projects:update", async (data, callback) => {
			try {
				if (!socket.userId) {
					return callback({
						success: false,
						message: "Authentication required",
					});
				}

				const { id, ...updates } = data;

				// Check if user has access to the project's workspace
				const project = await Project.findByPk(id, {
					include: [{ model: Workspace, as: "workspace" }],
				});

				if (!project) {
					return callback({
						success: false,
						message: "Proyecto no encontrado",
					});
				}

				const workspace = (project as Project & { workspace?: Workspace })
					.workspace;
				const isOwner = workspace?.userId === socket.userId;
				const isAdmin =
					socket.user?.role?.name === "SuperAdmin" ||
					socket.user?.role?.name === "Admin";

				if (!isOwner && !isAdmin) {
					return callback({
						success: false,
						message: "Sin permisos para modificar este proyecto",
					});
				}

				const [updatedRows] = await Project.update(updates, { where: { id } });
				if (updatedRows > 0) {
					const updatedProject = await Project.findByPk(id);
					callback({ success: true, project: updatedProject });
					socket.broadcast.emit("projects:updated", updatedProject);
				} else {
					callback({ success: false, message: "Error al actualizar proyecto" });
				}
			} catch (error) {
				console.error("Error actualizando proyecto:", error);
				callback({ success: false, message: "Error al actualizar proyecto" });
			}
		});

		// Delete project - requires authentication and workspace access
		socket.on("projects:delete", async (data, callback) => {
			try {
				if (!socket.userId) {
					return callback({
						success: false,
						message: "Authentication required",
					});
				}

				const { id } = data;

				// Check if user has access to the project's workspace
				const project = await Project.findByPk(id, {
					include: [{ model: Workspace, as: "workspace" }],
				});

				if (!project) {
					return callback({
						success: false,
						message: "Proyecto no encontrado",
					});
				}

				const workspace = (project as Project & { workspace?: Workspace })
					.workspace;
				const isOwner = workspace?.userId === socket.userId;
				const isAdmin =
					socket.user?.role?.name === "SuperAdmin" ||
					socket.user?.role?.name === "Admin";

				if (!isOwner && !isAdmin) {
					return callback({
						success: false,
						message: "Sin permisos para eliminar este proyecto",
					});
				}

				await Project.update({ status: "archived" }, { where: { id } });
				callback({ success: true });
				socket.broadcast.emit("projects:deleted", { id });
			} catch (error) {
				console.error("Error eliminando proyecto:", error);
				callback({ success: false, message: "Error al eliminar proyecto" });
			}
		});
	});
};
