# CLAUDE.md

## Proyecto
Sistema de monitoreo de pacientes con wearables - UPTC

## Stack
- Backend: Node.js / Java
- DB: Oracle
- Driver DB: `oracledb` (npm)
- Auth: Keycloak + LDAP institucional
- Monitoreo: Kafka

## Servidores
| Servidor      | Rol                        | IP base         |
|---------------|----------------------------|-----------------|
| SRV-APP-UPTC  | Backend & API              | 192.168.1.2     |
| SRV-DB-UPTC   | Base de Datos (Oracle)     | —               |
| SRV-WEB-UPTC  | Frontend (React/Angular)   | —               |
| SRV-ALERT     | Servicio de alertas        | 192.168.1.9     |

## Cliente activo
Este agente trabaja como **Cliente 3**. Usar siempre el puerto **7000**.

| Servicio   | Base URL                        |
|------------|---------------------------------|
| Pacientes  | `http://192.168.1.2:7000`       |
| Alertas    | `http://192.168.1.9:7000`       |
| Dispositivos | `http://192.168.1.2:7000`     |
| Habitaciones | `http://192.168.1.2:7000`     |
| Tipos de alerta | `http://192.168.1.9:7000` |

---

## Tipos Oracle
- Strings → `VARCHAR2(255)`
- IDs → `VARCHAR2(36)`
- Enteros → `NUMBER`
- Booleanos → `NUMBER(1)` (0/1)
- Timestamps → `TIMESTAMP`

---

## Endpoints — Pacientes (`/patient`)
Base: `http://192.168.1.2:7000/patient`

| Método | Path             | Descripción       |
|--------|------------------|-------------------|
| POST   | /patient         | Crear paciente    |
| GET    | /patient         | Listar todos      |
| GET    | /patient/{id}    | Obtener por ID    |
| PUT    | /patient/{id}    | Editar paciente   |
| DELETE | /patient/{id}    | Eliminar paciente |

### Modelo Patient
```json
{
  "patientId": "VARCHAR2(36)",
  "firstName": "VARCHAR2(255)",
  "lastName": "VARCHAR2(255)",
  "dateOfBirth": "TIMESTAMP",
  "Room": {
    "idRoom": "VARCHAR2(36)",
    "floor": "NUMBER",
    "roomNumber": "VARCHAR2(50)",
    "roomPavilion": "VARCHAR2(255)"
  },
  "Allergies": [
    {
      "medicalId": "VARCHAR2(36)",
      "name": "VARCHAR2(255)",
      "diagnostics": "VARCHAR2(255)",
      "allergenType": "VARCHAR2(255)"
    }
  ],
  "Diseases": [
    {
      "medicalId": "VARCHAR2(36)",
      "name": "VARCHAR2(255)",
      "diagnostics": "VARCHAR2(255)",
      "isContagious": "NUMBER(1)",
      "transmissionRoute": "VARCHAR2(255)"
    }
  ],
  "emergencyContact": {
    "idContact": "VARCHAR2(36)",
    "firstName": "VARCHAR2(255)",
    "lastName": "VARCHAR2(255)",
    "phone": "VARCHAR2(20)",
    "mail": "VARCHAR2(255)",
    "relationship": "VARCHAR2(100)"
  },
  "wearableDevices": [
    {
      "wearableId": "VARCHAR2(36)",
      "macAddress": "VARCHAR2(17)",
      "batteryLevel": "NUMBER",
      "isActive": "NUMBER(1)"
    }
  ]
}
```

---

## Endpoints — Alertas (`/alert`)
Base: `http://192.168.1.9:7000/alert`

| Método | Path          | Descripción     |
|--------|---------------|-----------------|
| POST   | /alert        | Crear alerta    |
| GET    | /alert        | Listar todas    |
| GET    | /alert/{id}   | Obtener por ID  |
| PUT    | /alert/{id}   | Editar alerta   |
| DELETE | /alert/{id}   | Eliminar alerta |

### Modelo Alert
```json
{
  "alertId": "VARCHAR2(36)",
  "patientId": "VARCHAR2(36)",
  "wearableId": "VARCHAR2(36)",
  "alertType": "VARCHAR2(255)",
  "alertLevel": "VARCHAR2(50)",
  "alertStatus": "VARCHAR2(50)",
  "createdAt": "TIMESTAMP",
  "resolvedAt": "TIMESTAMP | NULL"
}
```

---

## Endpoints — Dispositivos IoT (`/device`)
Base: `http://192.168.1.2:7000/device`

| Método | Path           | Descripción            |
|--------|----------------|------------------------|
| POST   | /device        | Registrar dispositivo  |
| GET    | /device        | Listar todos           |
| GET    | /device/{id}   | Obtener por ID         |
| PUT    | /device/{id}   | Editar dispositivo     |
| DELETE | /device/{id}   | Eliminar dispositivo   |

### Modelo Device
```json
{
  "wearableId": "VARCHAR2(36)",
  "macAddress": "VARCHAR2(17)",
  "batteryLevel": "NUMBER",
  "isActive": "NUMBER(1)"
}
```

---

## Endpoints — Habitaciones (`/room`)
Base: `http://192.168.1.2:7000/room`

| Método | Path          | Descripción         |
|--------|---------------|---------------------|
| POST   | /room         | Crear habitación    |
| GET    | /room         | Listar todas        |
| GET    | /room/{id}    | Obtener por ID      |
| PUT    | /room/{id}    | Editar habitación   |
| DELETE | /room/{id}    | Eliminar habitación |

### Modelo Room
```json
{
  "roomId": "VARCHAR2(36)",
  "floor": "NUMBER",
  "roomNumber": "NUMBER",
  "roomPavilion": "VARCHAR2(255)"
}
```

---

## Endpoints — Tipos de Alerta (`/alert-type`)
Base: `http://192.168.1.9:7000/alert-type`

| Método | Path                 | Descripción           |
|--------|----------------------|-----------------------|
| POST   | /alert-type          | Crear tipo de alerta  |
| GET    | /alert-type          | Listar todos          |
| GET    | /alert-type/{id}     | Obtener por ID        |
| PUT    | /alert-type/{id}     | Editar tipo           |
| DELETE | /alert-type/{id}     | Eliminar tipo         |

### Modelo AlertType
```json
{
  "alertTypeId": "VARCHAR2(36)",
  "name": "VARCHAR2(255)",
  "code": "VARCHAR2(100)",
  "description": "VARCHAR2(500)"
}
```

---

## Auth
- Login: `POST http://192.168.1.2:7000/patient`
- Body: `{ "username": "string", "password": "string" }`
- Retorna: `{ "token": "string" }`
- Validación de token via Keycloak

---

## Instrucciones para el agente
- Usar siempre el puerto **7000** (Cliente 3) en todas las URLs
- Respetar los tipos Oracle definidos arriba
- Los IDs se manejan como `VARCHAR2(36)` (formato UUID)
- Los booleanos se almacenan como `NUMBER(1)` en Oracle (0 = false, 1 = true)
- Usar `oracledb` como driver de conexión
- Al modificar clases, mantener consistencia entre el modelo JS/Java y los tipos Oracle