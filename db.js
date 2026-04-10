const oracledb = require('oracledb');

// Forzar modo Thin: no requiere Oracle Client instalado localmente
oracledb.thin = true;

const DB_HOST = process.env.DB_HOST || 'localhost';

const dbConfig = {
  user: process.env.DB_USER || "jorgeuptc",
  password: process.env.DB_PASSWORD || "uptc",
  connectString:
    `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${DB_HOST})(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=XEPDB1)))`
};

/**
 * Ejecuta una consulta SQL en Oracle de manera segura y genérica.
 * Administra internamente el ciclo de vida de la conexión.
 */
async function executeQuery(sql, binds = [], options = {}) {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(sql, binds, {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
            autoCommit: true,
            ...options
        });
        return result;
    } catch (err) {
        console.error('Error al ejecutar la consulta en la BD:', err);
        throw err;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error al cerrar la conexion:', err);
            }
        }
    }
}

module.exports = {
    dbConfig,
    executeQuery,
    oracledb
};
