function createDevice({ wearableId, macAddress, batteryLevel = 100, isActive = 1 }) {
	return {
		wearableId,    // VARCHAR2(36)
		macAddress,    // VARCHAR2(17)
		batteryLevel,  // NUMBER
		isActive,      // NUMBER(1) - 0 = false, 1 = true
		lastSyncAt: null,
		createdAt: new Date().toISOString(),

		updateBattery(level) {
			this.batteryLevel = level;
		},

		sync() {
			this.lastSyncAt = new Date().toISOString();
		},

		activate() {
			this.isActive = 1;
		},

		deactivate() {
			this.isActive = 0;
		},

		isDeviceActive() {
			return this.isActive === 1;
		},
	};
}

module.exports = { createDevice };
