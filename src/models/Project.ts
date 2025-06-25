import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "../config/database";
import Workspace from "./Workspace";

export interface ProjectAttributes {
	id: string;
	name: string;
	description: string;
	workspaceId: string;
	status: "active" | "inactive" | "archived";
	createdAt: Date;
	updatedAt: Date;
}

export interface ProjectCreationAttributes
	extends Optional<ProjectAttributes, "id" | "createdAt" | "updatedAt"> {}

export class Project
	extends Model<ProjectAttributes, ProjectCreationAttributes>
	implements ProjectAttributes
{
	public id!: string;
	public name!: string;
	public description!: string;
	public workspaceId!: string;
	public status!: "active" | "inactive" | "archived";

	// timestamps!
	public readonly createdAt!: Date;
	public readonly updatedAt!: Date;
}

Project.init(
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
		workspaceId: {
			type: DataTypes.UUID,
			allowNull: false,
			references: {
				model: Workspace,
				key: "id",
			},
			onUpdate: "CASCADE",
			onDelete: "CASCADE",
		},
		status: {
			type: DataTypes.ENUM("active", "inactive", "archived"),
			allowNull: false,
			defaultValue: "active",
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
		modelName: "Project",
		tableName: "projects",
		indexes: [
			{
				fields: ["workspace_id"],
			},
			{
				fields: ["status"],
			},
			{
				fields: ["workspace_id", "status"],
			},
		],
	},
);

// Associations
Project.belongsTo(Workspace, { foreignKey: "workspaceId", as: "workspace" });
Workspace.hasMany(Project, { foreignKey: "workspaceId", as: "projects" });

export default Project;
