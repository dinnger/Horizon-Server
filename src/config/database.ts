import { Sequelize } from "sequelize";
import { envs } from "./envs";

const sequelize = new Sequelize({
	dialect: "sqlite",
	storage: envs.DB_PATH || "./database.sqlite",
	logging: false, // process.env.NODE_ENV === "development" ? console.log : false,
	define: {
		timestamps: true,
		underscored: true,
		freezeTableName: true,
	},
});

export { sequelize };
export default sequelize;
