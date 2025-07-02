import { config } from 'dotenv'
config()

interface Envs {
	DB_PATH: string
	PORT: number
	NODE_ENV: 'development' | 'production'
	CLIENT_URL: string
	SEED_DATABASE: boolean
  TRACKING_EXECUTE: boolean
  TRACKING_ROUTE: boolean
}

const {
  DB_PATH,
  PORT,
  NODE_ENV,
  CLIENT_URL,
  SEED_DATABASE,
  TRACKING_EXECUTE,
  TRACKING_ROUTE
} = process.env

if (!DB_PATH) {
	throw new Error('No se encontró la variable de entorno DB_PATH')
}

if (!PORT) {
	throw new Error('No se encontró la variable de entorno PORT')
}

if (!NODE_ENV) {
	throw new Error('No se encontró la variable de entorno NODE_ENV')
}

if (!CLIENT_URL) {
	throw new Error('No se encontró la variable de entorno CLIENT_URL')
}

if (!SEED_DATABASE) {
	throw new Error('No se encontró la variable de entorno SEED_DATABASE')
}

export const envs: Envs = {
	DB_PATH,
	PORT: Number.parseInt(PORT),
	NODE_ENV: NODE_ENV as 'development' | 'production',
	CLIENT_URL,
	SEED_DATABASE: SEED_DATABASE?.toString().toLowerCase() === 'true',
	TRACKING_EXECUTE: TRACKING_EXECUTE?.toString().toLowerCase() === 'true',
	TRACKING_ROUTE: TRACKING_ROUTE?.toString().toLowerCase() === 'true'
}
