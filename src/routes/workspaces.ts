import { Workspace } from "../models";
import type { SocketData } from "./index";

export const setupWorkspaceRoutes = {
	// List workspaces - requires read permission
	"workspaces:list": async ({ socket, data, callback }: SocketData) => {
		try {
			const { userId = socket.userId } = data;

			// Users can only see their own workspaces unless they have global scope
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
	},

	// Create workspace - requires create permission
	"workspaces:create": async ({ socket, data, callback }: SocketData) => {
		try {
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
	},

	// Update workspace - requires update permission
	"workspaces:update": async ({ socket, data, callback }: SocketData) => {
		try {
			const { id, ...updates } = data;

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
	},

	// Delete workspace - requires delete permission
	"workspaces:delete": async ({ socket, data, callback }: SocketData) => {
		try {
			const { id } = data;

			await Workspace.update({ status: "archived" }, { where: { id } });
			callback({ success: true });
			socket.broadcast.emit("workspaces:deleted", { id });
		} catch (error) {
			console.error("Error eliminando workspace:", error);
			callback({ success: false, message: "Error al eliminar workspace" });
		}
	},
};
