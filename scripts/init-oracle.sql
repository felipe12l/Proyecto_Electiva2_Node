-- Script de inicialización para Oracle Database
-- Sistema de Monitoreo de Pacientes UPTC

-- Tabla Room (Habitaciones)
CREATE TABLE rooms (
    room_id VARCHAR2(36) PRIMARY KEY,
    floor NUMBER NOT NULL,
    room_number NUMBER NOT NULL UNIQUE,
    room_pavilion VARCHAR2(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla AlertType (Tipos de Alerta)
CREATE TABLE alert_types (
    alert_type_id VARCHAR2(36) PRIMARY KEY,
    name VARCHAR2(255) NOT NULL,
    code VARCHAR2(100) NOT NULL UNIQUE,
    description VARCHAR2(500),
    is_active NUMBER(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Device (Dispositivos IoT/Wearables)
CREATE TABLE devices (
    wearable_id VARCHAR2(36) PRIMARY KEY,
    mac_address VARCHAR2(17) NOT NULL UNIQUE,
    battery_level NUMBER DEFAULT 100,
    is_active NUMBER(1) DEFAULT 1,
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla EmergencyContact (Contacto de Emergencia)
CREATE TABLE emergency_contacts (
    id_contact VARCHAR2(36) PRIMARY KEY,
    first_name VARCHAR2(255) NOT NULL,
    last_name VARCHAR2(255) NOT NULL,
    phone VARCHAR2(20),
    mail VARCHAR2(255),
    relationship VARCHAR2(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Patient (Pacientes)
CREATE TABLE patients (
    patient_id VARCHAR2(36) PRIMARY KEY,
    first_name VARCHAR2(255) NOT NULL,
    last_name VARCHAR2(255) NOT NULL,
    date_of_birth TIMESTAMP NOT NULL,
    room_id VARCHAR2(36),
    emergency_contact_id VARCHAR2(36),
    is_active NUMBER(1) DEFAULT 1,
    admitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    discharged_at TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(room_id),
    FOREIGN KEY (emergency_contact_id) REFERENCES emergency_contacts(id_contact)
);

-- Tabla de relación Patient-Device
CREATE TABLE patient_devices (
    patient_id VARCHAR2(36),
    wearable_id VARCHAR2(36),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (patient_id, wearable_id),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (wearable_id) REFERENCES devices(wearable_id)
);

-- Tabla MedicalConditions (Enfermedades/Alergias)
CREATE TABLE medical_conditions (
    medical_id VARCHAR2(36) PRIMARY KEY,
    patient_id VARCHAR2(36) NOT NULL,
    name VARCHAR2(255) NOT NULL,
    diagnostics VARCHAR2(255),
    condition_type VARCHAR2(50) CHECK (condition_type IN ('ALLERGY', 'DISEASE')),
    is_contagious NUMBER(1),
    transmission_route VARCHAR2(255),
    allergen_type VARCHAR2(255),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

-- Tabla Alert (Alertas)
CREATE TABLE alerts (
    alert_id VARCHAR2(36) PRIMARY KEY,
    patient_id VARCHAR2(36) NOT NULL,
    wearable_id VARCHAR2(36),
    alert_type VARCHAR2(255) NOT NULL,
    alert_level VARCHAR2(50) CHECK (alert_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    alert_status VARCHAR2(50) DEFAULT 'PENDING' CHECK (alert_status IN ('PENDING', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED')),
    message VARCHAR2(1000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    acknowledged_by VARCHAR2(36),
    acknowledged_at TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (wearable_id) REFERENCES devices(wearable_id)
);

-- Índices para mejor performance
CREATE INDEX idx_patients_room ON patients(room_id);
CREATE INDEX idx_alerts_patient ON alerts(patient_id);
CREATE INDEX idx_alerts_status ON alerts(alert_status);
CREATE INDEX idx_alerts_level ON alerts(alert_level);
CREATE INDEX idx_medical_patient ON medical_conditions(patient_id);

-- Insertar tipos de alerta por defecto
INSERT INTO alert_types (alert_type_id, name, code, description, is_active) VALUES
    (SYS_GUID(), 'Frecuencia Cardíaca Alta', 'HIGH_HR', 'La frecuencia cardíaca del paciente está por encima del límite seguro', 1);
INSERT INTO alert_types (alert_type_id, name, code, description, is_active) VALUES
    (SYS_GUID(), 'Frecuencia Cardíaca Baja', 'LOW_HR', 'La frecuencia cardíaca del paciente está por debajo del límite seguro', 1);
INSERT INTO alert_types (alert_type_id, name, code, description, is_active) VALUES
    (SYS_GUID(), 'Oxígeno Bajo', 'LOW_OXYGEN', 'El nivel de oxígeno en sangre está por debajo del normal', 1);
INSERT INTO alert_types (alert_type_id, name, code, description, is_active) VALUES
    (SYS_GUID(), 'Caída Detectada', 'FALL_DETECTED', 'Se ha detectado una posible caída del paciente', 1);
INSERT INTO alert_types (alert_type_id, name, code, description, is_active) VALUES
    (SYS_GUID(), 'Batería Baja', 'LOW_BATTERY', 'El dispositivo wearable tiene batería baja', 1);

COMMIT;
