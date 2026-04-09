function createAlert({ alertId, patientId, wearableId, alertType, alertLevel, alertStatus = 'PENDING' }) {
	return {
		alertId,       // VARCHAR2(36)
		patientId,     // VARCHAR2(36)
		wearableId,    // VARCHAR2(36)
		alertType,     // VARCHAR2(255)
		alertLevel,    // VARCHAR2(50) - 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
		alertStatus,   // VARCHAR2(50) - 'PENDING', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED'
		createdAt: new Date().toISOString(),
		resolvedAt: null,  // TIMESTAMP | NULL
		acknowledgedBy: null,
		acknowledgedAt: null,

		acknowledge(userId) {
			this.alertStatus = 'ACKNOWLEDGED';
			this.acknowledgedBy = userId;
			this.acknowledgedAt = new Date().toISOString();
		},

		resolve() {
			this.alertStatus = 'RESOLVED';
			this.resolvedAt = new Date().toISOString();
		},

		ignore() {
			this.alertStatus = 'IGNORED';
		},

		isUrgent() {
			return this.alertLevel === 'HIGH' || this.alertLevel === 'CRITICAL';
		},

		isPending() {
			return this.alertStatus === 'PENDING';
		},
	};
}

module.exports = { createAlert };
