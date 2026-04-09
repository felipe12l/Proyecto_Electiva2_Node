function createRoom({ roomId, floor, roomNumber, roomPavilion }) {
	return {
		roomId,        // VARCHAR2(36)
		floor,         // NUMBER
		roomNumber,    // NUMBER
		roomPavilion,  // VARCHAR2(255)
		createdAt: new Date().toISOString(),
	};
}

module.exports = { createRoom };
