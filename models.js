const crypto = require('crypto');

function generateUuid() {
    return crypto.randomUUID();
}

class Room {
    constructor({ roomId = generateUuid(), floor, roomNumber, roomPavilion, patients = [] } = {}) {
        this.roomId = roomId;
        this.floor = floor;
        this.roomNumber = roomNumber;
        this.roomPavilion = roomPavilion;
        this.patients = patients;
    }
}

class AlertType {
    constructor({ alertTypeId = generateUuid(), name, code, description } = {}) {
        this.alertTypeId = alertTypeId;
        this.name = name;
        this.code = code;
        this.description = description;
    }
}

class Wearable {
    constructor({ wearableId = generateUuid(), macAddress, batteryLevel, isActive = true } = {}) {
        this.wearableId = wearableId;
        this.macAddress = macAddress;
        this.batteryLevel = batteryLevel;
        this.isActive = isActive;
    }
}

class MedicalCondition {
    constructor({ conditionId = generateUuid(), name, diagnostic, allergenType = null, isContagious = null, transmissionRoute = null } = {}) {
        this.conditionId = conditionId;
        this.name = name;
        this.diagnostic = diagnostic;
        this.allergenType = allergenType;
        this.isContagious = isContagious;
        this.transmissionRoute = transmissionRoute;
    }
}

class EmergencyContact {
    constructor({ contactId = generateUuid(), firstName, lastName, phone, mail } = {}) {
        this.contactId = contactId;
        this.firstName = firstName;
        this.lastName = lastName;
        this.phone = phone;
        this.mail = mail;
    }
}

class Patient {
    constructor({ patientId = generateUuid(), firstName, lastName, dateOfBirth, roomId, patient_wearables = [], patient_conditions = [], patient_contacts = [] } = {}) {
        this.patientId = patientId;
        this.firstName = firstName;
        this.lastName = lastName;
        this.dateOfBirth = dateOfBirth;
        this.roomId = roomId;
        this.patient_wearables = patient_wearables;
        this.patient_conditions = patient_conditions;
        this.patient_contacts = patient_contacts;
    }
}

class PatientWearable {
    constructor({ patientId, wearableId, assignedDate = new Date(), patient = null, wearable = null } = {}) {
        this.patientId = patientId;
        this.wearableId = wearableId;
        this.assignedDate = assignedDate;
        this.patient = patient;
        this.wearable = wearable;
    }
}

class PatientCondition {
    constructor({ patientId, conditionId, diagnostic, patient = null, condition = null } = {}) {
        this.patientId = patientId;
        this.conditionId = conditionId;
        this.diagnostic = diagnostic;
        this.patient = patient;
        this.condition = condition;
    }
}

class PatientContact {
    constructor({ patientId, contactId, relationship, patient = null, contact = null } = {}) {
        this.patientId = patientId;
        this.contactId = contactId;
        this.relationship = relationship;
        this.patient = patient;
        this.contact = contact;
    }
}

class Alert {
    constructor({ alertId = generateUuid(), patientId, wearableId, alertStatus, alertLevel, alertType, nurseId, createdAt = new Date(), resolvedAt = null } = {}) {
        this.alertId = alertId;
        this.patientId = patientId;
        this.wearableId = wearableId;
        this.alertStatus = alertStatus;
        this.alertLevel = alertLevel;
        this.alertType = alertType;
        this.nurseId = nurseId;
        this.createdAt = createdAt;
        this.resolvedAt = resolvedAt;
    }
}



module.exports = {
    Room,
    AlertType,
    Wearable,
    MedicalCondition,
    EmergencyContact,
    Patient,
    PatientWearable,
    PatientCondition,
    PatientContact,
    Alert,
    generateUuid
};
