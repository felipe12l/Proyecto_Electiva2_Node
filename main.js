require('dotenv').config();

const { createApp } = require('./src/app');
const { createKafkaService } = require('./src/services/kafkaService');
const { createAuthMiddleware } = require('./src/middleware/requireAuth');
const { config } = require('./src/config/env');

async function bootstrap() {
	const kafkaService = createKafkaService(config.kafka);
	const authMiddleware = createAuthMiddleware(config.keycloak);
	const app = createApp({
		authMiddleware,
		kafkaService,
		config,
	});

	try {
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
			server.close(() => {
				kafkaService.disconnect().finally(() => process.exit(0));
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
