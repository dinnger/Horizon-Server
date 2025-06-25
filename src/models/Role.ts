import { DataTypes, Model, type Optional } from "sequelize";
import { sequelize } from "../config/database";

export interface RoleAttributes {
	id: string;
	name: string;
	description: string;
	level: number; // Nivel jerárquico del rol (0 = superadmin, 1 = admin, 2 = manager, etc.)
	status: "active" | "inactive" | "archived";
	createdAt: Date;
	updatedAt: Date;
}

export interface RoleCreationAttributes
	extends Optional<RoleAttributes, "id" | "createdAt" | "updatedAt"> {}

export class Role
	extends Model<RoleAttributes, RoleCreationAttributes>
	implements RoleAttributes
{
	public id!: string;
	public name!: string;
	public description!: string;
	public level!: number;
	public status!: "active" | "inactive" | "archived";

	// timestamps!
	public readonly createdAt!: Date;
	public readonly updatedAt!: Date;
}

Role.init(
	{
		id: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			primaryKey: true,
		},
		name: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
		},
		description: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		level: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 99,
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
		modelName: "Role",
		tableName: "roles",
		indexes: [
			{
				unique: true,
				fields: ["name"],
			},
			{
				fields: ["level"],
			},
			{
				fields: ["status"],
			},
		],
	},
);

export default Role;
