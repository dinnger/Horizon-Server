import type { Server } from "socket.io";
import { Workspace } from "../models";
import type { AuthenticatedSocket } from "../middleware/socketAuth";

export const setupWorkspaceRoutes = (io: Server) => {
	io.on("connection", (socket: AuthenticatedSocket) => {
		// List workspaces - requires authentication
		socket.on("workspaces:list", async (data, callback) => {
			try {
				if (!socket.userId) {
					return callback({
						success: false,
						message: "Authentication required",
					});
				}

				const { userId = socket.userId } = data;

				// Users can only see their own workspaces unless they have admin permissions
				const targetUserId =
					socket.user?.role?.name === "SuperAdmin" ? userId : socket.userId;

				const workspaces = await Workspace.findAll({
					where: { userId: targetUserId, status: "active" },
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

		// Create workspace - requires authentication
		socket.on("workspaces:create", async (data, callback) => {
			try {
				if (!socket.userId) {
					return callback({
						success: false,
						message: "Authentication required",
					});
				}

				const workspaceData = {
					...data,
					userId: socket.userId, // Always use the authenticated user's ID
				};

				const workspace = await Workspace.create(workspaceData);
				callback({ success: true, workspace });
				socket.broadcast.emit("workspaces:created", workspace);
			} catch (error) {
				console.error("Error creando workspace:", error);
				callback({ success: false, message: "Error al crear workspace" });
			}
		});

		// Update workspace - requires authentication and ownership or admin rights
		socket.on("workspaces:update", async (data, callback) => {
			try {
				if (!socket.userId) {
					return callback({
						success: false,
						message: "Authentication required",
					});
				}

				const { id, ...updates } = data;

				// Check if user owns the workspace or is admin
				const workspace = await Workspace.findByPk(id);
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
						message: "Sin permisos para modificar este workspace",
					});
				}

				const [updatedRows] = await Workspace.update(updates, {
					where: { id },
				});
				if (updatedRows > 0) {
					const updatedWorkspace = await Workspace.findByPk(id);
					callback({ success: true, workspace: updatedWorkspace });
					socket.broadcast.emit("workspaces:updated", updatedWorkspace);
				} else {
					callback({
						success: false,
						message: "Error al actualizar workspace",
					});
				}
			} catch (error) {
				console.error("Error actualizando workspace:", error);
				callback({ success: false, message: "Error al actualizar workspace" });
			}
		});

		// Delete workspace - requires authentication and ownership or admin rights
		socket.on("workspaces:delete", async (data, callback) => {
			try {
				if (!socket.userId) {
					return callback({
						success: false,
						message: "Authentication required",
					});
				}

				const { id } = data;

				// Check if user owns the workspace or is admin
				const workspace = await Workspace.findByPk(id);
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
						message: "Sin permisos para eliminar este workspace",
					});
				}

				await Workspace.update({ status: "archived" }, { where: { id } });
				callback({ success: true });
				socket.broadcast.emit("workspaces:deleted", { id });
			} catch (error) {
				console.error("Error eliminando workspace:", error);
				callback({ success: false, message: "Error al eliminar workspace" });
			}
		});
	});
};
