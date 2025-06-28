// Import all models
import User from './User'
import Role from './Role'
import Permission from './Permission'
import RolePermission from './RolePermission'
import Workspace from './Workspace'
import Project from './Project'
import Workflow from './Workflow'
import WorkflowExecution from './WorkflowExecution'
import WorkflowHistory from './WorkflowHistory'
import ExecutionLog from './ExecutionLog'
import UserSettings from './UserSettings'
import { sequelize } from '../config/database'

// Define all associations here to avoid circular dependencies
// User associations
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' })
Role.hasMany(User, { foreignKey: 'roleId', as: 'users' })

// Initialize database
export const initDatabase = async () => {
	try {
		// Test connection
		await sequelize.authenticate()
		console.log('Database connection established successfully.')

		// Sync all models
		await sequelize.sync({ force: false })
		console.log('All models were synchronized successfully.')
	} catch (error) {
		console.error('Unable to connect to the database:', error)
		throw error
	}
}

// Export all models
export {
	User,
	Role,
	Permission,
	RolePermission,
	Workspace,
	Project,
	Workflow,
	WorkflowExecution,
	WorkflowHistory,
	ExecutionLog,
	UserSettings,
	sequelize
}

// Export model interfaces
export type {
	UserAttributes,
	UserCreationAttributes
} from './User'

export type {
	RoleAttributes,
	RoleCreationAttributes
} from './Role'

export type {
	PermissionAttributes,
	PermissionCreationAttributes
} from './Permission'

export type {
	RolePermissionAttributes,
	RolePermissionCreationAttributes
} from './RolePermission'

export type {
	WorkspaceAttributes,
	WorkspaceCreationAttributes
} from './Workspace'

export type {
	ProjectAttributes,
	ProjectCreationAttributes
} from './Project'

export type {
	WorkflowAttributes,
	WorkflowCreationAttributes
} from './Workflow'

export type {
	WorkflowExecutionAttributes,
	WorkflowExecutionCreationAttributes
} from './WorkflowExecution'

export type {
	WorkflowHistoryAttributes,
	WorkflowHistoryCreationAttributes
} from './WorkflowHistory'

export type {
	ExecutionLogAttributes,
	ExecutionLogCreationAttributes
} from './ExecutionLog'

export type {
	UserSettingsAttributes,
	UserSettingsCreationAttributes
} from './UserSettings'
