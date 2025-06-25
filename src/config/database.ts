import { Sequelize } from "sequelize";
import { config } from "dotenv";

config();

const sequelize = new Sequelize({
	dialect: "sqlite",
	storage: process.env.DB_PATH || "./database.sqlite",
	logging: process.env.NODE_ENV === "development" ? console.log : false,
	define: {
		timestamps: true,
		underscored: true,
		freezeTableName: true,
	},
});

export { sequelize };
export default sequelize;
