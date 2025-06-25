import type { Server } from "socket.io";
import { setupAuthRoutes } from "./auth";
import { setupWorkspaceRoutes } from "./workspaces";
import { setupProjectRoutes } from "./projects";
import { setupWorkflowRoutes } from "./workflows";
import { setupSettingsRoutes } from "./settings";
import { setupAdminRoutes } from "./admin";

export const setupSocketRoutes = (io: Server) => {
	// Setup all route handlers
	setupAuthRoutes(io);
	setupWorkspaceRoutes(io);
	setupProjectRoutes(io);
	setupWorkflowRoutes(io);
	setupSettingsRoutes(io);
	setupAdminRoutes(io);

	// Global connection handler for logging
	io.on("connection", (socket) => {
		console.log("Cliente conectado:", socket.id);

		socket.on("disconnect", () => {
			console.log("Cliente desconectado:", socket.id);
		});
	});
};

export * from "./auth";
export * from "./workspaces";
export * from "./projects";
export * from "./workflows";
export * from "./settings";
export * from "./admin";
