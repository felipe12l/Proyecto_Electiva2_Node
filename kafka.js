const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'proyecto-electiva-app',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();

async function initKafka() {
  try {
    await producer.connect();
    console.log(' Productor de Kafka conectado');
  } catch (error) {
    console.error('Error al conectar el productor de Kafka:', error);
  }
}

async function emitEvent(topic, message) {
  try {
    await producer.send({
      topic,
      messages: [
        { value: JSON.stringify(message) }
      ],
    });
    console.log(` Mensaje emitido al topic [${topic}]:`, message);
  } catch (error) {
    console.error(` Error al emitir el mensaje al topic ${topic}:`, error);
  }
}

module.exports = {
  initKafka,
  emitEvent
};
