// Import all models
import User from "./User";
import Workspace from "./Workspace";
import Project from "./Project";
import Workflow from "./Workflow";
import WorkflowExecution from "./WorkflowExecution";
import ExecutionLog from "./ExecutionLog";
import UserSettings from "./UserSettings";
import { sequelize } from "../config/database";

// Define all associations here to avoid circular dependencies
// User associations are already defined in individual model files

// Initialize database
export const initDatabase = async () => {
	try {
		// Test connection
		await sequelize.authenticate();
		console.log("Database connection established successfully.");

		// Sync all models
		await sequelize.sync({ force: false });
		console.log("All models were synchronized successfully.");
	} catch (error) {
		console.error("Unable to connect to the database:", error);
		throw error;
	}
};

// Export all models
export {
	User,
	Workspace,
	Project,
	Workflow,
	WorkflowExecution,
	ExecutionLog,
	UserSettings,
	sequelize,
};

// Export model interfaces
export type {
	UserAttributes,
	UserCreationAttributes,
} from "./User";

export type {
	WorkspaceAttributes,
	WorkspaceCreationAttributes,
} from "./Workspace";

export type {
	ProjectAttributes,
	ProjectCreationAttributes,
} from "./Project";

export type {
	WorkflowAttributes,
	WorkflowCreationAttributes,
} from "./Workflow";

export type {
	WorkflowExecutionAttributes,
	WorkflowExecutionCreationAttributes,
} from "./WorkflowExecution";

export type {
	ExecutionLogAttributes,
	ExecutionLogCreationAttributes,
} from "./ExecutionLog";

export type {
	UserSettingsAttributes,
	UserSettingsCreationAttributes,
} from "./UserSettings";
