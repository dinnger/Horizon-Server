import type { AuthenticatedSocket } from './socketAuth'
// Función helper para aplicar middleware de permisos
export function verifyPermission(socket: Required<AuthenticatedSocket>, event: string, additionalPermissions: string[] = []) {
	if (additionalPermissions.includes(event)) {
		return true
	}

	const permissions = (socket.user.role?.permissions || []).map((permission) => `${permission.module}:${permission.action}`)
	if (permissions.includes(event)) {
		return true
	}

	console.error(`No cumple permisos para ejecutar el método ${event}`)
	return false
}
