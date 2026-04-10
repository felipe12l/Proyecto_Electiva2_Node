const { executeQuery } = require('./db');
const models = require('./models'); // Archivo que generó las clases JS

/**
 * Función utilitaria para mapear las filas retornadas por Oracle (que usualmente
 * vienen con las llaves en mayúscula) a las llaves que usa nuestro JS Model (camelCase).
 */
function mapRowToModel(row, modelClass) {
    const modelInstance = new modelClass(); // Instancia inicialmente vacía para obtener las llaves esperadas
    const modelKeys = Object.keys(modelInstance);
    const mappedRow = {};

    for (const rowKey in row) {
        // Encontrar la clave ignorando minúsculas/mayúsculas
        const matchedKey = modelKeys.find(mk => mk.toLowerCase() === rowKey.toLowerCase()) || rowKey;
        mappedRow[matchedKey] = row[rowKey];
    }

    return new modelClass(mappedRow);
}

/**
 * GenericDAO permite hacer un CRUD general con la base de datos mapeado a nuestros modelos JS
 */
class GenericDAO {
    constructor(tableName, modelClass, primaryKeyName) {
        this.tableName = tableName;
        this.modelClass = modelClass;
        this.primaryKeyName = primaryKeyName;
    }

    async findAll() {
        const result = await executeQuery(`SELECT * FROM ${this.tableName}`);
        return result.rows.map(row => mapRowToModel(row, this.modelClass));
    }

    async findById(id) {
        const result = await executeQuery(`SELECT * FROM ${this.tableName} WHERE ${this.primaryKeyName} = :id`, [id]);
        if (result.rows.length === 0) return null;
        return mapRowToModel(result.rows[0], this.modelClass);
    }

    async create(modelObj) {
        // Obtenemos solo las propiedades primitivas de modelObj descartando relaciones/arrays
        const keys = Object.keys(modelObj).filter(k => 
            typeof modelObj[k] !== 'object' || modelObj[k] === null || modelObj[k] instanceof Date
        );

        if (keys.length === 0) return null;

        const cols = keys.join(', ');
        const bindNames = keys.map(k => `:${k}`).join(', ');
        const binds = {};
        for (const k of keys) binds[k] = modelObj[k];

        const sql = `INSERT INTO ${this.tableName} (${cols}) VALUES (${bindNames})`;
        await executeQuery(sql, binds);
        return modelObj;
    }

    async update(id, modelObj) {
        const keys = Object.keys(modelObj).filter(k => 
            (typeof modelObj[k] !== 'object' || modelObj[k] === null || modelObj[k] instanceof Date) 
            && k !== this.primaryKeyName
            && modelObj[k] !== undefined
        );

        if (keys.length === 0) return false;

        const setClause = keys.map(k => `${k} = :${k}`).join(', ');
        const binds = { id };
        for (const k of keys) binds[k] = modelObj[k];

        const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.primaryKeyName} = :id`;
        const result = await executeQuery(sql, binds);
        return result.rowsAffected > 0;
    }

    async delete(id) {
        const sql = `DELETE FROM ${this.tableName} WHERE ${this.primaryKeyName} = :id`;
        const result = await executeQuery(sql, [id]);
        return result.rowsAffected > 0;
    }
}

// Inicialización de Repositorios específicos usando GenericDAO
const PatientDAO = new GenericDAO('patient', models.Patient, 'patientId');
const RoomDAO = new GenericDAO('room', models.Room, 'roomId');
const AlertDAO = new GenericDAO('alert', models.Alert, 'alertId');




const WearableDAO = new GenericDAO('wearable', models.Wearable, 'wearableId');
const AlertTypeDAO = new GenericDAO('alert_type', models.AlertType, 'alertTypeId');

module.exports = {
    PatientDAO,
    RoomDAO,
    AlertDAO,
    WearableDAO,
    AlertTypeDAO,
    GenericDAO,
    mapRowToModel
};
