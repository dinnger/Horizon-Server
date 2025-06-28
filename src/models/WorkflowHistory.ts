import { DataTypes, Model, type Optional } from 'sequelize'
import { sequelize } from '../config/database'
import Workflow from './Workflow'
import User from './User'

export interface WorkflowHistoryAttributes {
	id: string
	workflowId: string
	userId?: string // Usuario que realizó el cambio
	changeType: 'created' | 'updated' | 'published' | 'archived' | 'restored' | 'deleted'
	changeDescription: string
	previousData?: object // JSON con la versión anterior del workflow
	newData?: object // JSON con la nueva versión del workflow
	version: string // Versión del workflow en ese momento
	metadata?: object // Metadatos adicionales (IP, user agent, etc.)
	createdAt: Date
}

export interface WorkflowHistoryCreationAttributes
	extends Optional<WorkflowHistoryAttributes, 'id' | 'userId' | 'previousData' | 'newData' | 'metadata' | 'createdAt'> {}

export class WorkflowHistory
	extends Model<WorkflowHistoryAttributes, WorkflowHistoryCreationAttributes>
	implements WorkflowHistoryAttributes
{
	public id!: string
	public workflowId!: string
	public userId?: string
	public changeType!: 'created' | 'updated' | 'published' | 'archived' | 'restored' | 'deleted'
	public changeDescription!: string
	public newData?: object
	public version!: string
	public metadata?: object

	// timestamps!
	public readonly createdAt!: Date
}

WorkflowHistory.init(
	{
		id: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			primaryKey: true
		},
		workflowId: {
			type: DataTypes.UUID,
			allowNull: false,
			references: {
				model: Workflow,
				key: 'id'
			},
			onUpdate: 'CASCADE',
			onDelete: 'CASCADE'
		},
		userId: {
			type: DataTypes.UUID,
			allowNull: true,
			references: {
				model: User,
				key: 'id'
			},
			onUpdate: 'CASCADE',
			onDelete: 'SET NULL'
		},
		changeType: {
			type: DataTypes.ENUM('created', 'updated', 'published', 'archived', 'restored', 'deleted'),
			allowNull: false
		},
		changeDescription: {
			type: DataTypes.TEXT,
			allowNull: false
		},
		newData: {
			type: DataTypes.JSON,
			allowNull: true
		},
		version: {
			type: DataTypes.STRING,
			allowNull: false
		},
		metadata: {
			type: DataTypes.JSON,
			allowNull: true
		},
		createdAt: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: DataTypes.NOW
		}
	},
	{
		sequelize,
		modelName: 'WorkflowHistory',
		tableName: 'workflow_history',
		timestamps: false, // Solo usamos createdAt
		indexes: [
			{
				fields: ['workflow_id']
			},
			{
				fields: ['user_id']
			},
			{
				fields: ['change_type']
			},
			{
				fields: ['version']
			},
			{
				fields: ['created_at']
			},
			{
				fields: ['workflow_id', 'created_at']
			},
			{
				fields: ['workflow_id', 'change_type']
			}
		]
	}
)

// Associations
WorkflowHistory.belongsTo(Workflow, {
	foreignKey: 'workflowId',
	as: 'workflow'
})
Workflow.hasMany(WorkflowHistory, {
	foreignKey: 'workflowId',
	as: 'history'
})

WorkflowHistory.belongsTo(User, {
	foreignKey: 'userId',
	as: 'user'
})
User.hasMany(WorkflowHistory, {
	foreignKey: 'userId',
	as: 'workflowChanges'
})

export default WorkflowHistory
