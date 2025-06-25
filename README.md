# Horizon Server

Backend de la aplicación Horizon construido con Node.js, Express, Socket.IO y Sequelize.

## Estructura de la Base de Datos

La aplicación utiliza una jerarquía de datos donde:

- Un **Usuario** puede tener múltiples **Workspaces**
- Un **Workspace** puede tener múltiples **Proyectos**
- Un **Proyecto** puede tener múltiples **Workflows**
- Un **Workflow** puede tener múltiples **Ejecuciones**
- Una **Ejecución** puede tener múltiples **Logs**

### Modelos

1. **User**: Usuarios del sistema con autenticación y roles
2. **Workspace**: Espacios de trabajo para organizar proyectos
3. **Project**: Proyectos que contienen workflows
4. **Workflow**: Flujos de trabajo con nodos y conexiones
5. **WorkflowExecution**: Historial de ejecuciones de workflows
6. **ExecutionLog**: Logs detallados de cada ejecución
7. **UserSettings**: Configuraciones personalizadas del usuario

### Características

- **Soft Delete**: Los datos no se eliminan físicamente, se marcan con status 'archived'
- **Socket.IO**: Comunicación en tiempo real con el cliente
- **Autenticación**: Sistema de login con bcrypt
- **Versionado**: Los workflows mantienen control de versiones
- **Logs**: Sistema completo de logging para ejecuciones

## Instalación

1. Instalar dependencias:

```bash
npm install
```

2. Copiar variables de entorno:

```bash
cp .env.example .env
```

3. Inicializar base de datos con datos de prueba:

```bash
npm run seed
```

4. Iniciar servidor en modo desarrollo:

```bash
npm run dev
```

## Scripts Disponibles

- `npm run dev`: Inicia el servidor en modo desarrollo
- `npm run build`: Compila TypeScript a JavaScript
- `npm start`: Inicia el servidor compilado
- `npm run seed`: Inicializa la base de datos con datos de prueba

## API Socket.IO

### Eventos de Autenticación

- `auth:login`: Autenticar usuario

### Eventos de Workspaces

- `workspaces:list`: Listar workspaces del usuario
- `workspaces:create`: Crear nuevo workspace
- `workspaces:update`: Actualizar workspace
- `workspaces:delete`: Archivar workspace

### Eventos de Proyectos

- `projects:list`: Listar proyectos de un workspace
- `projects:create`: Crear nuevo proyecto
- `projects:update`: Actualizar proyecto
- `projects:delete`: Archivar proyecto

### Eventos de Workflows

- `workflows:list`: Listar workflows de un proyecto
- `workflows:create`: Crear nuevo workflow
- `workflows:update`: Actualizar workflow
- `workflows:delete`: Archivar workflow
- `workflows:execute`: Ejecutar workflow

### Eventos de Configuraciones

- `settings:get`: Obtener configuraciones del usuario
- `settings:update`: Actualizar configuraciones

## Usuarios de Prueba

Después de ejecutar el seeder, puedes usar estas credenciales:

**Administrador:**

- Email: admin@horizon.com
- Password: admin123

**Usuario Regular:**

- Email: user@horizon.com
- Password: user123

## Estructura del Proyecto

```
server/
├── src/
│   ├── config/
│   │   └── database.ts
│   ├── models/
│   │   ├── User.ts
│   │   ├── Workspace.ts
│   │   ├── Project.ts
│   │   ├── Workflow.ts
│   │   ├── WorkflowExecution.ts
│   │   ├── ExecutionLog.ts
│   │   ├── UserSettings.ts
│   │   └── index.ts
│   ├── services/
│   │   └── index.ts
│   ├── seeders/
│   │   └── seed.ts
│   └── index.ts
├── package.json
├── tsconfig.json
└── .env.example
```
