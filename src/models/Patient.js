function createPatient({
	patientId,
	firstName,
	lastName,
	dateOfBirth,
	Room = null,
	Allergies = [],
	Diseases = [],
	emergencyContact = null,
	wearableDevices = [],
}) {
	return {
		patientId,         // VARCHAR2(36)
		firstName,         // VARCHAR2(255)
		lastName,          // VARCHAR2(255)
		dateOfBirth,       // TIMESTAMP
		Room: Room ? {
			idRoom: Room.idRoom,           // VARCHAR2(36)
			floor: Room.floor,             // NUMBER
			roomNumber: Room.roomNumber,   // VARCHAR2(50)
			roomPavilion: Room.roomPavilion // VARCHAR2(255)
		} : null,
		Allergies: Allergies.map(a => ({
			medicalId: a.medicalId,      // VARCHAR2(36)
			name: a.name,                // VARCHAR2(255)
			diagnostics: a.diagnostics,  // VARCHAR2(255)
			allergenType: a.allergenType // VARCHAR2(255)
		})),
		Diseases: Diseases.map(d => ({
			medicalId: d.medicalId,           // VARCHAR2(36)
			name: d.name,                     // VARCHAR2(255)
			diagnostics: d.diagnostics,       // VARCHAR2(255)
			isContagious: d.isContagious,     // NUMBER(1)
			transmissionRoute: d.transmissionRoute // VARCHAR2(255)
		})),
		emergencyContact: emergencyContact ? {
			idContact: emergencyContact.idContact,       // VARCHAR2(36)
			firstName: emergencyContact.firstName,       // VARCHAR2(255)
			lastName: emergencyContact.lastName,         // VARCHAR2(255)
			phone: emergencyContact.phone,               // VARCHAR2(20)
			mail: emergencyContact.mail,                 // VARCHAR2(255)
			relationship: emergencyContact.relationship  // VARCHAR2(100)
		} : null,
		wearableDevices: wearableDevices.map(w => ({
			wearableId: w.wearableId,      // VARCHAR2(36)
			macAddress: w.macAddress,      // VARCHAR2(17)
			batteryLevel: w.batteryLevel,  // NUMBER
			isActive: w.isActive           // NUMBER(1)
		})),
		createdAt: new Date().toISOString(),

		assignRoom(room) {
			this.Room = room ? {
				idRoom: room.idRoom,
				floor: room.floor,
				roomNumber: room.roomNumber,
				roomPavilion: room.roomPavilion
			} : null;
		},

		addAllergy(allergy) {
			if (!this.Allergies.find(a => a.medicalId === allergy.medicalId)) {
				this.Allergies.push({
					medicalId: allergy.medicalId,
					name: allergy.name,
					diagnostics: allergy.diagnostics,
					allergenType: allergy.allergenType
				});
			}
		},

		removeAllergy(medicalId) {
			this.Allergies = this.Allergies.filter(a => a.medicalId !== medicalId);
		},

		addDisease(disease) {
			if (!this.Diseases.find(d => d.medicalId === disease.medicalId)) {
				this.Diseases.push({
					medicalId: disease.medicalId,
					name: disease.name,
					diagnostics: disease.diagnostics,
					isContagious: disease.isContagious,
					transmissionRoute: disease.transmissionRoute
				});
			}
		},

		removeDisease(medicalId) {
			this.Diseases = this.Diseases.filter(d => d.medicalId !== medicalId);
		},

		addWearable(wearable) {
			if (!this.wearableDevices.find(w => w.wearableId === wearable.wearableId)) {
				this.wearableDevices.push({
					wearableId: wearable.wearableId,
					macAddress: wearable.macAddress,
					batteryLevel: wearable.batteryLevel,
					isActive: wearable.isActive
				});
			}
		},

		removeWearable(wearableId) {
			this.wearableDevices = this.wearableDevices.filter(w => w.wearableId !== wearableId);
		},

		updateEmergencyContact(contact) {
			this.emergencyContact = contact ? {
				idContact: contact.idContact,
				firstName: contact.firstName,
				lastName: contact.lastName,
				phone: contact.phone,
				mail: contact.mail,
				relationship: contact.relationship
			} : null;
		},

		getActiveWearables() {
			return this.wearableDevices.filter(w => w.isActive === 1);
		},

		getFullName() {
			return `${this.firstName} ${this.lastName}`;
		},
	};
}

module.exports = { createPatient };
