# 🔐 Auth API — Node.js + Express + JWT

API REST de autenticación con registro, login y tokens JWT. Lista para desplegar en **Render** con base de datos **Clever Cloud MySQL**.

---

## 📁 Estructura del proyecto

```
auth-api/
├── src/
│   ├── config/
│   │   └── db.js                  # Conexión a MySQL (pool)
│   ├── controllers/
│   │   └── auth.controller.js     # Lógica de registro, login, etc.
│   ├── middlewares/
│   │   └── auth.middleware.js     # Verificación de JWT
│   ├── routes/
│   │   └── auth.routes.js         # Rutas + validaciones
│   └── index.js                   # Entry point
├── database.sql                   # Script para crear las tablas
├── .env.example                   # Variables de entorno de ejemplo
├── package.json
└── README.md
```

---

## ⚙️ Variables de entorno

Copia `.env.example` a `.env` y rellena:

```env
PORT=3000
NODE_ENV=production

DB_HOST=tu-host.clever-cloud.com
DB_PORT=3306
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_NAME=tu_base_de_datos

JWT_SECRET=clave_secreta_muy_larga_minimo_64_caracteres
JWT_REFRESH_SECRET=otra_clave_diferente_muy_larga
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

---

## 🗄️ Configurar base de datos (Clever Cloud)

1. En **Clever Cloud**, crea un add-on **MySQL DEV**
2. Ve a la pestaña de **Information** y copia las credenciales
3. Conéctate con un cliente (DBeaver, TablePlus, phpMyAdmin)
4. Ejecuta el script `database.sql`

---

## 🚀 Desplegar en Render

### 1. Sube el proyecto a GitHub
```bash
git init
git add .
git commit -m "feat: API de autenticación con JWT"
git remote add origin https://github.com/tu-usuario/auth-api.git
git push -u origin main
```

### 2. Crear el servicio en Render
1. Ve a [render.com](https://render.com) → **New Web Service**
2. Conecta tu repositorio de GitHub
3. Configura:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** `Node`
   - **Plan:** Free

### 3. Agregar variables de entorno en Render
En el panel de tu servicio → **Environment** → agrega todas las variables del `.env.example`

> ⚠️ **Nota sobre el plan Free de Render:** El servicio se "duerme" tras 15 minutos de inactividad. Para mantenerlo activo considera usar [UptimeRobot](https://uptimerobot.com) con un ping cada 10 minutos a `https://tu-api.onrender.com/`.

---

## 📡 Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/` | ❌ | Health check |
| POST | `/api/auth/register` | ❌ | Registrar usuario |
| POST | `/api/auth/login` | ❌ | Iniciar sesión |
| POST | `/api/auth/refresh` | ❌ | Renovar access token |
| POST | `/api/auth/logout` | ✅ | Cerrar sesión |
| GET | `/api/auth/profile` | ✅ | Ver perfil del usuario |

---

## 📨 Ejemplos de uso

### Registro
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Juan Pérez",
  "email": "juan@ejemplo.com",
  "password": "MiClave123"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente.",
  "data": {
    "user": { "id": 1, "name": "Juan Pérez", "email": "juan@ejemplo.com" },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "juan@ejemplo.com",
  "password": "MiClave123"
}
```

### Ruta protegida (perfil)
```http
GET /api/auth/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Renovar token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Logout
```http
POST /api/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🔒 Seguridad incluida

- ✅ Contraseñas hasheadas con **bcrypt** (salt rounds: 12)
- ✅ Access tokens de corta duración (**15 minutos**)
- ✅ Refresh token rotation (se invalida el anterior en cada renovación)
- ✅ Refresh tokens almacenados en DB (revocables)
- ✅ Rate limiting en rutas de auth (**20 req / 15 min**)
- ✅ Headers de seguridad con **Helmet**
- ✅ Validación de inputs con **express-validator**
- ✅ Mensajes de error genéricos en login (no revela si el email existe)

---

## 💻 Desarrollo local

```bash
npm install
cp .env.example .env
# Rellena .env con tus credenciales
npm run dev
```
