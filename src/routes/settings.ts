import type { Server } from "socket.io";
import { UserSettings } from "../models";
import type { AuthenticatedSocket } from "../middleware/socketAuth";

export const setupSettingsRoutes = (io: Server) => {
	io.on("connection", (socket: AuthenticatedSocket) => {
		// Get user settings - requires authentication
		socket.on("settings:get", async (data, callback) => {
			try {
				if (!socket.userId) {
					return callback({
						success: false,
						message: "Authentication required",
					});
				}

				const { userId = socket.userId } = data;

				// Users can only see their own settings unless they are admin
				const targetUserId =
					socket.user?.role?.name === "SuperAdmin" ? userId : socket.userId;

				const settings = await UserSettings.findOne({
					where: { userId: targetUserId },
				});
				callback({ success: true, settings });
			} catch (error) {
				console.error("Error obteniendo configuraciones:", error);
				callback({
					success: false,
					message: "Error al cargar configuraciones",
				});
			}
		});

		// Update user settings - requires authentication
		socket.on("settings:update", async (data, callback) => {
			try {
				if (!socket.userId) {
					return callback({
						success: false,
						message: "Authentication required",
					});
				}

				const { userId = socket.userId, ...updates } = data;

				// Users can only update their own settings unless they are admin
				const targetUserId =
					socket.user?.role?.name === "SuperAdmin" ? userId : socket.userId;

				const [settings] = await UserSettings.upsert({
					userId: targetUserId,
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
	});
};
