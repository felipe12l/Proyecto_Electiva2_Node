const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

function createAuthMiddleware(keycloakConfig) {
	const jwks = keycloakConfig.jwksUri
		? jwksClient({
				jwksUri: keycloakConfig.jwksUri,
				cache: true,
				rateLimit: true,
				jwksRequestsPerMinute: 5,
		  })
		: null;

	function getSigningKey(header, callback) {
		if (!jwks) {
			callback(new Error('Keycloak no configurado'));
			return;
		}

		jwks.getSigningKey(header.kid, (err, key) => {
			if (err) {
				callback(err);
				return;
			}

			callback(null, key.getPublicKey());
		});
	}

	return function requireAuth(req, res, next) {
		if (!keycloakConfig.issuer || !jwks) {
			res.status(500).json({
				error: 'Keycloak no configurado',
				requiredEnvironmentVariables: ['KEYCLOAK_ISSUER'],
			});
			return;
		}

		const authHeader = req.headers.authorization || '';
		const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

		if (!token) {
			res.status(401).json({ error: 'Falta el token Bearer' });
			return;
		}

		const verifyOptions = { issuer: keycloakConfig.issuer };
		if (keycloakConfig.audience) {
			verifyOptions.audience = keycloakConfig.audience;
		}

		jwt.verify(token, getSigningKey, verifyOptions, (err, decoded) => {
			if (err) {
				res.status(401).json({ error: 'Token inválido', details: err.message });
				return;
			}

			req.user = decoded;
			next();
		});
	};
}

module.exports = { createAuthMiddleware };
