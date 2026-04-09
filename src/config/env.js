const port = Number(process.env.PORT || 7000);

// Oracle Database
const oracleConfig = {
	host: process.env.ORACLE_HOST || 'localhost',
	port: Number(process.env.ORACLE_PORT || 1521),
	sid: process.env.ORACLE_SID || 'XEPDB1',
	user: process.env.ORACLE_USER || 'uptc',
	password: process.env.ORACLE_PASSWORD || 'uptc123',
	get connectionString() {
		return `${this.host}:${this.port}/${this.sid}`;
	},
};

// Kafka
const kafkaBrokers = (process.env.KAFKA_BROKERS || 'localhost:9092')
	.split(',')
	.map((broker) => broker.trim())
	.filter(Boolean);
const kafkaTopic = process.env.KAFKA_TOPIC || 'demo-events';
const kafkaClientId = process.env.KAFKA_CLIENT_ID || 'node-kafka-keycloak-demo';
const kafkaGroupId = process.env.KAFKA_GROUP_ID || 'node-kafka-keycloak-consumer';

// Keycloak
const keycloakIssuer = (process.env.KEYCLOAK_ISSUER || '').replace(/\/$/, '');
const keycloakJwksUri = process.env.KEYCLOAK_JWKS_URI || (keycloakIssuer ? `${keycloakIssuer}/protocol/openid-connect/certs` : '');
const keycloakAudience = (process.env.KEYCLOAK_AUDIENCE || '').trim();

module.exports = {
	config: {
		port,
		oracle: oracleConfig,
		kafka: {
			brokers: kafkaBrokers,
			topic: kafkaTopic,
			clientId: kafkaClientId,
			groupId: kafkaGroupId,
		},
		keycloak: {
			issuer: keycloakIssuer,
			jwksUri: keycloakJwksUri,
			audience: keycloakAudience,
		},
	},
};
