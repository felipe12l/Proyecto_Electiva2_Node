const { executeQuery } = require('./db');
const models = require('./models');

// ============================================================
// Oracle devuelve columnas en MAYÚSCULAS.
// Los modelos JS usan camelCase.
// Esta función convierte camelCase → UPPERCASE para SQL.
// Ejemplo: "patientId" → "PATIENTID", "firstName" → "FIRSTNAME"
// ============================================================
function toOracleColumn(camelKey) {
    return camelKey.toUpperCase();
}

/**
 * Mapea una fila de Oracle (UPPERCASE keys) al modelo JS (camelCase keys).
 */
function mapRowToModel(row, modelClass) {
    const modelInstance = new modelClass();
    const modelKeys = Object.keys(modelInstance);
    const mappedRow = {};

    for (const rowKey in row) {
        const matchedKey = modelKeys.find(mk => mk.toLowerCase() === rowKey.toLowerCase()) || rowKey;
        mappedRow[matchedKey] = row[rowKey];
    }

    return new modelClass(mappedRow);
}

/**
 * GenericDAO — CRUD genérico compatible con Oracle (columnas en UPPERCASE)
 */
class GenericDAO {
    constructor(tableName, modelClass, primaryKeyName) {
        this.tableName = tableName.toUpperCase();       // Nombre de tabla en UPPERCASE
        this.modelClass = modelClass;
        this.primaryKeyName = primaryKeyName;            // camelCase para JS
        this.pkColumn = toOracleColumn(primaryKeyName); // UPPERCASE para SQL
    }

    async findAll() {
        const result = await executeQuery(`SELECT * FROM ${this.tableName}`);
        return result.rows.map(row => mapRowToModel(row, this.modelClass));
    }

    async findById(id) {
        const sql = `SELECT * FROM ${this.tableName} WHERE ${this.pkColumn} = :pk`;
        const result = await executeQuery(sql, { pk: id });
        if (result.rows.length === 0) return null;
        return mapRowToModel(result.rows[0], this.modelClass);
    }

    async create(modelObj) {
        // Excluir: arrays, objetos anidados (relaciones), y undefined
        const keys = Object.keys(modelObj).filter(k =>
            modelObj[k] !== undefined &&
            !Array.isArray(modelObj[k]) &&
            (typeof modelObj[k] !== 'object' || modelObj[k] === null || modelObj[k] instanceof Date)
        );

        if (keys.length === 0) return null;

        // Columnas en UPPERCASE, binds con nombre camelCase
        const cols    = keys.map(k => toOracleColumn(k)).join(', ');
        const bindStr = keys.map(k => `:${k}`).join(', ');
        const binds   = {};
        for (const k of keys) binds[k] = modelObj[k] instanceof Date ? modelObj[k] : modelObj[k];

        const sql = `INSERT INTO ${this.tableName} (${cols}) VALUES (${bindStr})`;
        await executeQuery(sql, binds);
        return modelObj;
    }

    async update(id, modelObj) {
        const keys = Object.keys(modelObj).filter(k =>
            k !== this.primaryKeyName &&
            modelObj[k] !== undefined &&
            !Array.isArray(modelObj[k]) &&
            (typeof modelObj[k] !== 'object' || modelObj[k] === null || modelObj[k] instanceof Date)
        );

        if (keys.length === 0) return false;

        // SET COLUMNA = :camelKey, ... WHERE PK = :pk
        const setClause = keys.map(k => `${toOracleColumn(k)} = :${k}`).join(', ');
        const binds = { pk: id };
        for (const k of keys) binds[k] = modelObj[k];

        const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.pkColumn} = :pk`;
        const result = await executeQuery(sql, binds);
        return result.rowsAffected > 0;
    }

    async delete(id) {
        const sql = `DELETE FROM ${this.tableName} WHERE ${this.pkColumn} = :pk`;
        const result = await executeQuery(sql, { pk: id });
        return result.rowsAffected > 0;
    }
}

// Instancias de DAO por entidad
// Segundo argumento: nombre de tabla (se convierte a UPPERCASE internamente)
// Tercer argumento: nombre camelCase de la PK
const PatientDAO      = new GenericDAO('patient',            models.Patient,           'patientId');
const RoomDAO         = new GenericDAO('room',               models.Room,              'roomId');
const AlertDAO        = new GenericDAO('alert',              models.Alert,             'alertId');
const WearableDAO     = new GenericDAO('wearable',           models.Wearable,          'wearableId');
const AlertTypeDAO    = new GenericDAO('alert_type',         models.AlertType,         'alertTypeId');
const MedicalConditionDAO = new GenericDAO('medical_condition', models.MedicalCondition, 'conditionId');
const EmergencyContactDAO = new GenericDAO('emergency_contact', models.EmergencyContact, 'contactId');

// DAOs para tablas de relación (PK compuesta)
class PatientWearableDAO extends GenericDAO {
    async findByCompositeKey(patientId, wearableId) {
        const sql = `SELECT * FROM ${this.tableName} WHERE PATIENTID = :pId AND WEARABLEID = :wId`;
        const result = await executeQuery(sql, { pId: patientId, wId: wearableId });
        if (result.rows.length === 0) return null;
        return mapRowToModel(result.rows[0], this.modelClass);
    }

    async deleteByCompositeKey(patientId, wearableId) {
        const sql = `DELETE FROM ${this.tableName} WHERE PATIENTID = :pId AND WEARABLEID = :wId`;
        const result = await executeQuery(sql, { pId: patientId, wId: wearableId });
        return result.rowsAffected > 0;
    }

    async findByPatientId(patientId) {
        const sql = `SELECT * FROM ${this.tableName} WHERE PATIENTID = :pId`;
        const result = await executeQuery(sql, { pId: patientId });
        return result.rows.map(row => mapRowToModel(row, this.modelClass));
    }

    async findByWearableId(wearableId) {
        const sql = `SELECT * FROM ${this.tableName} WHERE WEARABLEID = :wId`;
        const result = await executeQuery(sql, { wId: wearableId });
        return result.rows.map(row => mapRowToModel(row, this.modelClass));
    }
}

class PatientConditionDAO extends GenericDAO {
    async findByCompositeKey(patientId, conditionId) {
        const sql = `SELECT * FROM ${this.tableName} WHERE PATIENTID = :pId AND CONDITIONID = :cId`;
        const result = await executeQuery(sql, { pId: patientId, cId: conditionId });
        if (result.rows.length === 0) return null;
        return mapRowToModel(result.rows[0], this.modelClass);
    }

    async deleteByCompositeKey(patientId, conditionId) {
        const sql = `DELETE FROM ${this.tableName} WHERE PATIENTID = :pId AND CONDITIONID = :cId`;
        const result = await executeQuery(sql, { pId: patientId, cId: conditionId });
        return result.rowsAffected > 0;
    }

    async findByPatientId(patientId) {
        const sql = `SELECT * FROM ${this.tableName} WHERE PATIENTID = :pId`;
        const result = await executeQuery(sql, { pId: patientId });
        return result.rows.map(row => mapRowToModel(row, this.modelClass));
    }
}

class PatientContactDAO extends GenericDAO {
    async findByCompositeKey(patientId, contactId) {
        const sql = `SELECT * FROM ${this.tableName} WHERE PATIENTID = :pId AND CONTACTID = :cId`;
        const result = await executeQuery(sql, { pId: patientId, cId: contactId });
        if (result.rows.length === 0) return null;
        return mapRowToModel(result.rows[0], this.modelClass);
    }

    async deleteByCompositeKey(patientId, contactId) {
        const sql = `DELETE FROM ${this.tableName} WHERE PATIENTID = :pId AND CONTACTID = :cId`;
        const result = await executeQuery(sql, { pId: patientId, cId: contactId });
        return result.rowsAffected > 0;
    }

    async findByPatientId(patientId) {
        const sql = `SELECT * FROM ${this.tableName} WHERE PATIENTID = :pId`;
        const result = await executeQuery(sql, { pId: patientId });
        return result.rows.map(row => mapRowToModel(row, this.modelClass));
    }
}

// Instancias de DAOs para tablas de relación
const patientWearableDAO = new PatientWearableDAO('patientwearable', models.PatientWearable, 'patientId');
const patientConditionDAO = new PatientConditionDAO('patientcondition', models.PatientCondition, 'patientId');
const patientContactDAO = new PatientContactDAO('patientcontact', models.PatientContact, 'patientId');

module.exports = {
    PatientDAO,
    RoomDAO,
    AlertDAO,
    WearableDAO,
    AlertTypeDAO,
    MedicalConditionDAO,
    EmergencyContactDAO,
    PatientWearableDAO: patientWearableDAO,
    PatientConditionDAO: patientConditionDAO,
    PatientContactDAO: patientContactDAO,
    GenericDAO,
    mapRowToModel
};
