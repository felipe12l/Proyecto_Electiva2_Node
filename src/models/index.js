const { createPatient } = require('./Patient');
const { createAlert } = require('./Alert');
const { createDevice } = require('./Device');
const { createRoom } = require('./Room');
const { createAlertType } = require('./AlertType');

module.exports = {
	createPatient,
	createAlert,
	createDevice,
	createRoom,
	createAlertType,
};
