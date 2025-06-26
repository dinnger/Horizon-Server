import { Op } from 'sequelize'
import { Role, Permission, RolePermission, User } from '../models'
import type { SocketData } from './index'

export const setupAdminRoutes = {
	// List roles - requires admin permissions
	'roles:list': async ({ data, callback }: SocketData) => {
		try {
			const roles = await Role.findAll({
				where: { status: 'active' },
				include: [
					{
						model: Permission,
						as: 'permissions',
						through: {
							where: { granted: true },
							attributes: []
						}
					}
				],
				order: [['level', 'ASC']]
			})

			callback({ success: true, roles })
		} catch (error) {
			console.error('Error listando roles:', error)
			callback({ success: false, message: 'Error al cargar roles' })
		}
	},

	// List permissions - requires admin permissions
	'permissions:list': async ({ data, callback }: SocketData) => {
		try {
			const permissions = await Permission.findAll({
				where: { status: 'active' },
				order: [
					['module', 'ASC'],
					['action', 'ASC']
				]
			})

			callback({ success: true, permissions })
		} catch (error) {
			console.error('Error listando permisos:', error)
			callback({ success: false, message: 'Error al cargar permisos' })
		}
	},

	// Create role - requires SuperAdmin permissions
	'roles:create': async ({ socket, data, callback }: SocketData) => {
		try {
			const role = await Role.create(data)
			callback({ success: true, role })
			socket.broadcast.emit('roles:created', role)
		} catch (error) {
			console.error('Error creando rol:', error)
			callback({ success: false, message: 'Error al crear rol' })
		}
	},

	// Update role - requires SuperAdmin permissions
	'roles:update': async ({ socket, data, callback }: SocketData) => {
		try {
			const { id, ...updates } = data
			const [updatedRows] = await Role.update(updates, { where: { id } })
			if (updatedRows > 0) {
				const role = await Role.findByPk(id)
				callback({ success: true, role })
				socket.broadcast.emit('roles:updated', role)
			} else {
				callback({ success: false, message: 'Rol no encontrado' })
			}
		} catch (error) {
			console.error('Error actualizando rol:', error)
			callback({ success: false, message: 'Error al actualizar rol' })
		}
	},

	// Assign permissions to role - requires SuperAdmin permissions
	'roles:assign-permission': async ({ socket, data, callback }: SocketData) => {
		try {
			const { roleId, permissionIds } = data

			// Remove existing permissions for this role
			await RolePermission.destroy({ where: { roleId } })

			// Add new permissions
			const rolePermissions = permissionIds.map((permissionId: string) => ({
				roleId,
				permissionId,
				granted: true
			}))

			await RolePermission.bulkCreate(rolePermissions)

			callback({ success: true })
			socket.broadcast.emit('roles:permissions-updated', {
				roleId,
				permissionIds
			})
		} catch (error) {
			console.error('Error asignando permisos:', error)
			callback({ success: false, message: 'Error al asignar permisos' })
		}
	},

	// List users - requires admin permissions
	'users:list': async ({ data, callback }: SocketData) => {
		try {
			const users = await User.findAll({
				where: { status: { [Op.ne]: 'suspended' } },
				include: [
					{
						model: Role,
						as: 'role'
					}
				],
				attributes: { exclude: ['password'] },
				order: [['createdAt', 'DESC']]
			})

			callback({ success: true, users })
		} catch (error) {
			console.error('Error listando usuarios:', error)
			callback({ success: false, message: 'Error al cargar usuarios' })
		}
	},

	// Update user role - requires admin permissions
	'users:update-rol': async ({ socket, data, callback }: SocketData) => {
		try {
			const { userId, roleId } = data

			// Prevent users from modifying their own role
			if (userId === socket.userId) {
				return callback({
					success: false,
					message: 'No puedes modificar tu propio rol'
				})
			}

			const [updatedRows] = await User.update({ roleId }, { where: { id: userId } })

			if (updatedRows > 0) {
				const user = await User.findByPk(userId, {
					include: [{ model: Role, as: 'role' }],
					attributes: { exclude: ['password'] }
				})
				callback({ success: true, user })
				socket.broadcast.emit('users:role-updated', user)
			} else {
				callback({ success: false, message: 'Usuario no encontrado' })
			}
		} catch (error) {
			console.error('Error actualizando rol de usuario:', error)
			callback({ success: false, message: 'Error al actualizar rol' })
		}
	}
}
