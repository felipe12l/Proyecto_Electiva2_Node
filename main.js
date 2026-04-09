require('dotenv').config();

const { createApp } = require('./src/app');
const { createKafkaService } = require('./src/services/kafkaService');
const { createAuthMiddleware } = require('./src/middleware/requireAuth');
const { createOracleService } = require('./src/services/oracleService');
const { config } = require('./src/config/env');

async function bootstrap() {
	const kafkaService = createKafkaService(config.kafka);
	const authMiddleware = createAuthMiddleware(config.keycloak);
	const oracleService = createOracleService(config.oracle);
	const app = createApp({
		authMiddleware,
		kafkaService,
		oracleService,
		config,
	});

	try {
		// Initialize Oracle connection
		await oracleService.initialize();
		await oracleService.testConnection();

		// Start Kafka consumer
		await kafkaService.startConsumer();

		const server = app.listen(config.port, () => {
			console.log(`Servidor listo en http://localhost:${config.port}`);
			console.log(`Kafka topic: ${config.kafka.topic}`);
			console.log(config.keycloak.issuer
				? `Keycloak issuer: ${config.keycloak.issuer}`
				: 'Keycloak no configurado. Define KEYCLOAK_ISSUER para proteger las rutas.');
		});

		async function shutdown(signal) {
			console.log(`\n${signal} recibido, cerrando conexiones...`);
			server.close(async () => {
				await kafkaService.disconnect();
				await oracleService.close();
				process.exit(0);
			});
		}

		process.on('SIGINT', () => shutdown('SIGINT'));
		process.on('SIGTERM', () => shutdown('SIGTERM'));
	} catch (error) {
		console.error('Error al iniciar la aplicación:', error);
		process.exit(1);
	}
}

bootstrap();
