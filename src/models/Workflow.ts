import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "../config/database";
import Project from "./Project";

export interface WorkflowAttributes {
	id: string;
	name: string;
	description: string;
	projectId: string;
	status: "success" | "running" | "failed" | "pending" | "archived";
	lastRun?: Date;
	duration?: string;
	workflowData?: object; // JSON para almacenar los nodos y conexiones del canvas
	version: string;
	isPublished: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface WorkflowCreationAttributes
	extends Optional<
		WorkflowAttributes,
		"id" | "lastRun" | "duration" | "workflowData" | "createdAt" | "updatedAt"
	> {}

export class Workflow
	extends Model<WorkflowAttributes, WorkflowCreationAttributes>
	implements WorkflowAttributes
{
	public id!: string;
	public name!: string;
	public description!: string;
	public projectId!: string;
	public status!: "success" | "running" | "failed" | "pending" | "archived";
	public lastRun?: Date;
	public duration?: string;
	public workflowData?: object;
	public version!: string;
	public isPublished!: boolean;

	// timestamps!
	public readonly createdAt!: Date;
	public readonly updatedAt!: Date;
}

Workflow.init(
	{
		id: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			primaryKey: true,
		},
		name: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		description: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		projectId: {
			type: DataTypes.UUID,
			allowNull: false,
			references: {
				model: Project,
				key: "id",
			},
			onUpdate: "CASCADE",
			onDelete: "CASCADE",
		},
		status: {
			type: DataTypes.ENUM(
				"success",
				"running",
				"failed",
				"pending",
				"archived",
			),
			allowNull: false,
			defaultValue: "pending",
		},
		lastRun: {
			type: DataTypes.DATE,
			allowNull: true,
		},
		duration: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		workflowData: {
			type: DataTypes.JSON,
			allowNull: true,
		},
		version: {
			type: DataTypes.STRING,
			allowNull: false,
			defaultValue: "0.0.1",
		},
		isPublished: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
		createdAt: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: DataTypes.NOW,
		},
		updatedAt: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: DataTypes.NOW,
		},
	},
	{
		sequelize,
		modelName: "Workflow",
		tableName: "workflows",
		indexes: [
			{
				fields: ["project_id"],
			},
			{
				fields: ["status"],
			},
			{
				fields: ["project_id", "status"],
			},
			{
				fields: ["version"],
			},
			{
				fields: ["is_published"],
			},
		],
	},
);

// Associations
Workflow.belongsTo(Project, { foreignKey: "projectId", as: "project" });
Project.hasMany(Workflow, { foreignKey: "projectId", as: "workflows" });

export default Workflow;
