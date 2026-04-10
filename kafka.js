const { Kafka } = require('kafkajs');

// ============================================================
// PRODUCER — Se conecta al Kafka LOCAL (localhost:9092)
// ============================================================
const kafka = new Kafka({
  clientId: 'proyecto-electiva-app',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();

async function initKafka() {
  try {
    await producer.connect();
    console.log('✅ Productor de Kafka conectado (local)');
  } catch (error) {
    console.error('❌ Error al conectar el productor de Kafka:', error.message);
  }
}

async function emitEvent(topic, message) {
  try {
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
    console.log(` 📤 Mensaje emitido al topic [${topic}]:`, message);
  } catch (error) {
    console.error(` ❌ Error al emitir al topic ${topic}:`, error.message);
  }
}


// ============================================================
// CONSUMER — Se conecta al Kafka de OTRO equipo en la red
//
// Uso:
//   subscribeToExternalTopic({
//     brokerIp: '192.168.1.X',   // IP del equipo remoto
//     port: 9093,                 // Puerto externo (default 9093)
//     topic: 'nombre-del-topic',
//     groupId: 'mi-grupo',
//     onMessage: (msg) => { ... } // Callback con el mensaje
//   });
// ============================================================

const activeConsumers = []; // Registro de consumers activos para shutdown limpio

async function subscribeToExternalTopic({ brokerIp, port = 9093, topic, groupId, onMessage }) {
  const brokerAddress = `${brokerIp}:${port}`;

  const externalKafka = new Kafka({
    clientId: `consumer-from-${brokerIp}`,
    brokers: [brokerAddress],
    retry: {
      initialRetryTime: 3000,
      retries: 5
    }
  });

  const consumer = externalKafka.consumer({ groupId: groupId || `group-${topic}` });

  try {
    await consumer.connect();
    console.log(`✅ Consumer conectado al broker externo [${brokerAddress}]`);

    await consumer.subscribe({ topic, fromBeginning: false });
    console.log(`📥 Escuchando topic [${topic}] desde [${brokerAddress}]`);

    activeConsumers.push(consumer);

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const raw = message.value?.toString();
          const parsed = raw ? JSON.parse(raw) : null;
          console.log(`📨 [${brokerAddress}] topic:${topic} partición:${partition}`, parsed);
          if (onMessage) await onMessage(parsed, topic);
        } catch (err) {
          console.error(`❌ Error procesando mensaje de [${brokerAddress}]:`, err.message);
        }
      }
    });
  } catch (err) {
    console.error(`❌ No se pudo conectar al broker externo [${brokerAddress}]:`, err.message);
  }
}

// Cierra todos los consumers activos al apagar la app
async function shutdownConsumers() {
  for (const c of activeConsumers) {
    try { await c.disconnect(); } catch (_) {}
  }
  try { await producer.disconnect(); } catch (_) {}
  console.log('🛑 Kafka desconectado correctamente.');
}

process.on('SIGTERM', shutdownConsumers);
process.on('SIGINT', shutdownConsumers);


module.exports = {
  initKafka,
  emitEvent,
  subscribeToExternalTopic
};
