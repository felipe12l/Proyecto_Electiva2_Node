const { Kafka, logLevel } = require('kafkajs');

function createKafkaService(kafkaConfig) {
	const kafka = new Kafka({
		clientId: kafkaConfig.clientId,
		brokers: kafkaConfig.brokers,
		logLevel: logLevel.NOTHING,
	});

	const producer = kafka.producer();
	const consumer = kafka.consumer({ groupId: kafkaConfig.groupId });

	return {
		async startConsumer() {
			await producer.connect();
			await consumer.connect();

			await consumer.subscribe({
				topic: kafkaConfig.topic,
				fromBeginning: false,
			});

			await consumer.run({
				eachMessage: async ({ topic, partition, message }) => {
					const value = message.value ? message.value.toString() : '';
					console.log(`[Kafka] ${topic}[${partition}] offset=${message.offset} ${value}`);
				},
			});
		},

		async publishEvent(payload) {
			await producer.send({
				topic: kafkaConfig.topic,
				messages: [
					{
						key: payload.userId || 'anonymous',
						value: JSON.stringify(payload),
					},
				],
			});
		},

		async disconnect() {
			await Promise.allSettled([
				producer.disconnect(),
				consumer.disconnect(),
			]);
		},
	};
}

module.exports = { createKafkaService };
