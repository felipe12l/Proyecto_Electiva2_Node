const express = require('express');

function createApp({ authMiddleware, kafkaService, oracleService, config }) {
	const app = express();
	app.use(express.json());

	app.get('/', (_req, res) => {
		res.json({
			message: 'Sistema de Monitoreo de Pacientes UPTC - API',
			endpoints: {
				health: '/health',
				me: '/api/me',
				events: '/api/events',
				patients: '/patient',
				alerts: '/alert',
				devices: '/device',
				rooms: '/room',
				alertTypes: '/alert-type',
			},
		});
	});

	app.get('/health', async (_req, res) => {
		const dbStatus = await oracleService.testConnection();
		res.json({
			status: 'ok',
			database: dbStatus ? 'connected' : 'disconnected',
			kafka: {
				brokers: config.kafka.brokers,
				topic: config.kafka.topic,
			},
			keycloak: {
				issuerConfigured: Boolean(config.keycloak.issuer),
				audienceConfigured: Boolean(config.keycloak.audience),
			},
		});
	});

	app.get('/api/me', authMiddleware, (req, res) => {
		res.json({
			message: 'Token válido',
			user: req.user,
		});
	});

	app.post('/api/events', authMiddleware, async (req, res) => {
		try {
			const message = typeof req.body.message === 'string' && req.body.message.trim()
				? req.body.message.trim()
				: 'Evento de ejemplo desde Node.js';

			const payload = {
				message,
				userId: req.user.sub,
				username: req.user.preferred_username || req.user.sub,
				createdAt: new Date().toISOString(),
			};

			await kafkaService.publishEvent(payload);

			res.status(201).json({
				message: 'Evento enviado a Kafka',
				topic: config.kafka.topic,
				payload,
			});
		} catch (error) {
			res.status(500).json({
				error: 'No se pudo enviar el mensaje a Kafka',
				details: error.message,
			});
		}
	});

	return app;
}

module.exports = { createApp };
