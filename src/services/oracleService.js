const oracledb = require('oracledb');

function createOracleService(oracleConfig) {
	let pool = null;

	return {
		async initialize() {
			if (!pool) {
				pool = await oracledb.createPool({
					user: oracleConfig.user,
					password: oracleConfig.password,
					connectString: oracleConfig.connectionString,
					poolMin: 2,
					poolMax: 10,
					poolIncrement: 2,
				});
				console.log('[Oracle] Pool de conexiones creado');
			}
		},

		async execute(sql, binds = [], options = {}) {
			if (!pool) {
				await this.initialize();
			}
			let connection;
			try {
				connection = await pool.getConnection();
				const result = await connection.execute(sql, binds, {
					outFormat: oracledb.OUT_FORMAT_OBJECT,
					autoCommit: true,
					...options,
				});
				return result;
			} finally {
				if (connection) {
					await connection.close();
				}
			}
		},

		async close() {
			if (pool) {
				await pool.close(0);
				pool = null;
				console.log('[Oracle] Pool de conexiones cerrado');
			}
		},

		async testConnection() {
			try {
				await this.execute('SELECT 1 FROM DUAL');
				console.log('[Oracle] Conexión exitosa');
				return true;
			} catch (error) {
				console.error('[Oracle] Error de conexión:', error.message);
				return false;
			}
		},
	};
}

module.exports = { createOracleService };
