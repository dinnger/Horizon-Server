import type { Server } from "socket.io";
import { Op } from "sequelize";
import { Workflow, Project, Workspace, WorkflowExecution } from "../models";
import type { AuthenticatedSocket } from "../middleware/socketAuth";

export const setupWorkflowRoutes = (io: Server) => {
	io.on("connection", (socket: AuthenticatedSocket) => {
		// List workflows - requires authentication and project access
		socket.on("workflows:list", async (data, callback) => {
			try {
				if (!socket.userId) {
					return callback({
						success: false,
						message: "Authentication required",
					});
				}

				const { projectId } = data;

				// Check if user has access to the project's workspace
				const project = await Project.findByPk(projectId, {
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
						message: "Sin acceso a este proyecto",
					});
				}

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

		// Create workflow - requires authentication and project access
		socket.on("workflows:create", async (data, callback) => {
			try {
				if (!socket.userId) {
					return callback({
						success: false,
						message: "Authentication required",
					});
				}

				const { projectId } = data;

				// Check if user has access to the project's workspace
				const project = await Project.findByPk(projectId, {
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
						message: "Sin permisos para crear workflows en este proyecto",
					});
				}

				const workflow = await Workflow.create(data);
				callback({ success: true, workflow });
				socket.broadcast.emit("workflows:created", workflow);
			} catch (error) {
				console.error("Error creando workflow:", error);
				callback({ success: false, message: "Error al crear workflow" });
			}
		});

		// Update workflow - requires authentication and project access
		socket.on("workflows:update", async (data, callback) => {
			try {
				if (!socket.userId) {
					return callback({
						success: false,
						message: "Authentication required",
					});
				}

				const { id, ...updates } = data;

				// Check if user has access to the workflow's project workspace
				const workflow = await Workflow.findByPk(id, {
					include: [
						{
							model: Project,
							as: "project",
							include: [{ model: Workspace, as: "workspace" }],
						},
					],
				});

				if (!workflow) {
					return callback({
						success: false,
						message: "Workflow no encontrado",
					});
				}

				const workflowWithProject = workflow as Workflow & {
					project?: Project & { workspace?: Workspace };
				};
				const workspace = workflowWithProject.project?.workspace;
				const isOwner = workspace?.userId === socket.userId;
				const isAdmin =
					socket.user?.role?.name === "SuperAdmin" ||
					socket.user?.role?.name === "Admin";

				if (!isOwner && !isAdmin) {
					return callback({
						success: false,
						message: "Sin permisos para modificar este workflow",
					});
				}

				const [updatedRows] = await Workflow.update(updates, { where: { id } });
				if (updatedRows > 0) {
					const updatedWorkflow = await Workflow.findByPk(id);
					callback({ success: true, workflow: updatedWorkflow });
					socket.broadcast.emit("workflows:updated", updatedWorkflow);
				} else {
					callback({ success: false, message: "Error al actualizar workflow" });
				}
			} catch (error) {
				console.error("Error actualizando workflow:", error);
				callback({ success: false, message: "Error al actualizar workflow" });
			}
		});

		// Delete workflow - requires authentication and project access
		socket.on("workflows:delete", async (data, callback) => {
			try {
				if (!socket.userId) {
					return callback({
						success: false,
						message: "Authentication required",
					});
				}

				const { id } = data;

				// Check if user has access to the workflow's project workspace
				const workflow = await Workflow.findByPk(id, {
					include: [
						{
							model: Project,
							as: "project",
							include: [{ model: Workspace, as: "workspace" }],
						},
					],
				});

				if (!workflow) {
					return callback({
						success: false,
						message: "Workflow no encontrado",
					});
				}

				const workflowWithProject = workflow as Workflow & {
					project?: Project & { workspace?: Workspace };
				};
				const workspace = workflowWithProject.project?.workspace;
				const isOwner = workspace?.userId === socket.userId;
				const isAdmin =
					socket.user?.role?.name === "SuperAdmin" ||
					socket.user?.role?.name === "Admin";

				if (!isOwner && !isAdmin) {
					return callback({
						success: false,
						message: "Sin permisos para eliminar este workflow",
					});
				}

				await Workflow.update({ status: "archived" }, { where: { id } });
				callback({ success: true });
				socket.broadcast.emit("workflows:deleted", { id });
			} catch (error) {
				console.error("Error eliminando workflow:", error);
				callback({ success: false, message: "Error al eliminar workflow" });
			}
		});

		// Execute workflow - requires authentication and project access
		socket.on("workflows:execute", async (data, callback) => {
			try {
				if (!socket.userId) {
					return callback({
						success: false,
						message: "Authentication required",
					});
				}

				const { workflowId, trigger = "manual" } = data;

				// Check if user has access to the workflow's project workspace
				const workflow = await Workflow.findByPk(workflowId, {
					include: [
						{
							model: Project,
							as: "project",
							include: [{ model: Workspace, as: "workspace" }],
						},
					],
				});

				if (!workflow) {
					return callback({
						success: false,
						message: "Workflow no encontrado",
					});
				}

				const workflowWithProject = workflow as Workflow & {
					project?: Project & { workspace?: Workspace };
				};
				const workspace = workflowWithProject.project?.workspace;
				const isOwner = workspace?.userId === socket.userId;
				const isAdmin =
					socket.user?.role?.name === "SuperAdmin" ||
					socket.user?.role?.name === "Admin";

				if (!isOwner && !isAdmin) {
					return callback({
						success: false,
						message: "Sin permisos para ejecutar este workflow",
					});
				}

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
	});
};
