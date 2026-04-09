function createAlertType({ alertTypeId, name, code, description }) {
	return {
		alertTypeId,   // VARCHAR2(36)
		name,          // VARCHAR2(255)
		code,          // VARCHAR2(100)
		description,   // VARCHAR2(500)
		isActive: 1,    // NUMBER(1) - 0 = false, 1 = true
		createdAt: new Date().toISOString(),

		enable() {
			this.isActive = 1;
		},

		disable() {
			this.isActive = 0;
		},

		isEnabled() {
			return this.isActive === 1;
		},
	};
}

module.exports = { createAlertType };
