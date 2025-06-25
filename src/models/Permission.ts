import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "../config/database";

export interface PermissionAttributes {
	id: string;
	module: string; // 'workspaces', 'projects', 'workflows', 'settings', 'users', etc.
	action: string; // 'create', 'read', 'update', 'delete', 'execute', 'admin'
	resource?: string; // Recurso específico opcional
	description: string;
	status: "active" | "inactive" | "archived";
	createdAt: Date;
	updatedAt: Date;
}

export interface PermissionCreationAttributes
	extends Optional<
		PermissionAttributes,
		"id" | "resource" | "createdAt" | "updatedAt"
	> {}

export class Permission
	extends Model<PermissionAttributes, PermissionCreationAttributes>
	implements PermissionAttributes
{
	public id!: string;
	public module!: string;
	public action!: string;
	public resource?: string;
	public description!: string;
	public status!: "active" | "inactive" | "archived";

	// timestamps!
	public readonly createdAt!: Date;
	public readonly updatedAt!: Date;
}

Permission.init(
	{
		id: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			primaryKey: true,
		},
		module: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		action: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		resource: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		description: {
			type: DataTypes.TEXT,
			allowNull: false,
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
		modelName: "Permission",
		tableName: "permissions",
		indexes: [
			{
				unique: true,
				fields: ["module", "action", "resource"],
			},
			{
				fields: ["module"],
			},
			{
				fields: ["status"],
			},
		],
	},
);

export default Permission;
