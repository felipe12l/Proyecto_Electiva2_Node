# Proyecto Node.js con Apache Kafka y Keycloak

Este proyecto incluye:

- una API con Express
- un productor y consumidor de Apache Kafka
- protección de rutas con Keycloak mediante JWT
- un entorno local con Docker Compose
- código separado en módulos

## Requisitos

- Node.js 18 o superior
- Docker y Docker Compose

## Instalación

1. Copia el archivo de variables de entorno:

   ```bash
   cp .env.example .env
   ```

2. Instala dependencias:

   ```bash
   npm install
   ```

3. Levanta Kafka y Keycloak:

   ```bash
   docker compose up -d
   ```

4. Inicia la API:

   ```bash
   npm start
   ```

5. En desarrollo (con recarga automática):

   ```bash
   npm run dev
   ```

## Estructura del Proyecto

```
src/
├── app.js                    # Configuración de Express
├── config/
│   └── env.js               # Variables de entorno
├── middleware/
│   └── requireAuth.js       # Middleware de autenticación
└── services/
    └── kafkaService.js      # Servicio de Kafka
```

## Endpoints

- `GET /` — información del API
- `GET /health` — estado general
- `GET /api/me` — información del usuario autenticado (requiere token)
- `POST /api/events` — envía un mensaje a Kafka (requiere token)

## Flujo de prueba

### 1. Obtener token en Keycloak

Con el realm de ejemplo:

- **Realm**: `node-demo`
- **Cliente**: `node-client`
- **Usuario**: `demo`
- **Contraseña**: `demo123`

### 2. Llamar a la API protegida

Usa el token como Bearer en las rutas `/api/me` y `/api/events`:

```bash
curl -H "Authorization: Bearer <tu_token>" http://localhost:3000/api/me
```

### 3. Enviar un evento a Kafka

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer <tu_token>" \
  -H "Content-Type: application/json" \
  -d '{"message": "Mi evento"}'
```

## Variables de entorno importantes

- `PORT` — puerto del servidor (default: 3000)
- `KAFKA_BROKERS` — dirección de Kafka (default: localhost:9092)
- `KAFKA_TOPIC` — topic de Kafka (default: demo-events)
- `KAFKA_CLIENT_ID` — ID del cliente Kafka (default: node-kafka-keycloak-demo)
- `KAFKA_GROUP_ID` — grupo de consumidores (default: node-kafka-keycloak-consumer)
- `KEYCLOAK_ISSUER` — URL del issuer de Keycloak (ej: http://localhost:8080/realms/node-demo)
- `KEYCLOAK_AUDIENCE` — audience para validar token (optional)
- `KEYCLOAK_JWKS_URI` — endpoint JWKS personalizado (opcional)
