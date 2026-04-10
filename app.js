const express = require('express');
const session = require('express-session');
const Keycloak = require('keycloak-connect');
const { initKafka, emitEvent } = require('./kafka');
const { PatientDAO, AlertDAO, WearableDAO, RoomDAO, AlertTypeDAO } = require('./dao');

const app = express();
const port = 6000; // Todos los servicios salen por el puerto 6000

app.use(express.json());

// ==========================================
// CONFIGURACION KEYCLOAK MIDDLEWARE
// ==========================================
const memoryStore = new session.MemoryStore();
app.use(session({
    secret: 'electiva2_super_secret',
    resave: false,
    saveUninitialized: true,
    store: memoryStore
}));

// Keycloak lee automáticamente keycloak.json desde la raíz
const keycloak = new Keycloak({ store: memoryStore });
app.use(keycloak.middleware());

// ==========================================
// MIDDLEWARE PARA KAFKA EVENTS
// ==========================================
/**
 * Emite un evento a Kafka indicando el cambio en DB
 */
async function triggerKafka(req, action, resultData) {
    const topic = 'api-events'; // Topic genérico, o ajustarlo si ocupan otro
    const msg = {
        method: req.method,
        path: req.originalUrl,
        action: action,
        data: resultData || req.body,
        timestamp: new Date().toISOString()
    };
    await emitEvent(topic, msg);
}


// ==========================================
// RUTAS PARA PACIENTES (PATIENT) -> 192.168.1.2
// ==========================================
app.post('/patient', async (req, res) => {
    // Si envían username y password, tratamos esto como el LOGIN
    if (req.body.username && req.body.password) {
        // Obtenemos token manualmente pegándole al endpoint del issuer en keycloak.json
        try {
            const keycloakConfig = require('./keycloak.json');
            const tokenUrl = keycloakConfig.web.token_uri;
            const body = new URLSearchParams({
                client_id: keycloakConfig.web.client_id,
                client_secret: keycloakConfig.web.client_secret,
                grant_type: 'password', // Flow de ROPC
                username: req.body.username,
                password: req.body.password
            });

            const kcRes = await fetch(tokenUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body.toString()
            });

            const data = await kcRes.json();
            if(!kcRes.ok) return res.status(401).json({ error: 'Credenciales inválidas o Keycloak inaccesible', detail: data });
            return res.json({ access_token: data.access_token });
        } catch(err) {
            return res.status(500).json({ error: 'Fallo al autenticar contra Keycloak' });
        }
    }

    // SI NO ES LOGIN, ES CREATE PACIENTE -> Proteger con keycloak
    keycloak.protect()(req, res, async () => {
        try {
            const newPatient = await PatientDAO.create(req.body);
            await triggerKafka(req, 'CREATE_PATIENT', newPatient);
            res.status(201).json(newPatient);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
});

app.get('/patient', keycloak.protect(), async (req, res) => {
    try {
        const data = await PatientDAO.findAll();
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/patient/:patient_id', keycloak.protect(), async (req, res) => {
    try {
        const data = await PatientDAO.findById(req.params.patient_id);
        if(!data) return res.status(404).json({ error: 'Not found' });
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/patient/:patient_id', keycloak.protect(), async (req, res) => {
    try {
        const updated = await PatientDAO.update(req.params.patient_id, req.body);
        if(!updated) return res.status(404).json({ error: 'Not found' });
        await triggerKafka(req, 'UPDATE_PATIENT', req.body);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/patient/:patient_id', keycloak.protect(), async (req, res) => {
    try {
        const deleted = await PatientDAO.delete(req.params.patient_id);
        if(!deleted) return res.status(404).json({ error: 'Not found' });
        await triggerKafka(req, 'DELETE_PATIENT', { id: req.params.patient_id });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// ==========================================
// RESTO DE LOS CONTROLADORES (Device, Room, Alert, Alert-Type)
// ==========================================

function bindCrudRoutes(path, DAOClass, entityName) {
    app.get(path, keycloak.protect(), async (req, res) => {
        try { res.json(await DAOClass.findAll()); } 
        catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.get(`${path}/:id`, keycloak.protect(), async (req, res) => {
        try { 
            const d = await DAOClass.findById(req.params.id); 
            d ? res.json(d) : res.status(404).json({ error: 'Not found' });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.post(path, keycloak.protect(), async (req, res) => {
        try {
            const data = await DAOClass.create(req.body);
            await triggerKafka(req, `CREATE_${entityName.toUpperCase()}`, data);
            res.status(201).json(data);
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.put(`${path}/:id`, keycloak.protect(), async (req, res) => {
        try {
            const updated = await DAOClass.update(req.params.id, req.body);
            if(!updated) return res.status(404).json({ error: 'Not found' });
            await triggerKafka(req, `UPDATE_${entityName.toUpperCase()}`, req.body);
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.delete(`${path}/:id`, keycloak.protect(), async (req, res) => {
        try {
            const deleted = await DAOClass.delete(req.params.id);
            if(!deleted) return res.status(404).json({ error: 'Not found' });
            await triggerKafka(req, `DELETE_${entityName.toUpperCase()}`, { id: req.params.id });
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });
}

// Bindeamos los demas DAOs automáticamente:
bindCrudRoutes('/device', WearableDAO, 'DEVICE'); // IoT Device -> mapea a Wearable
bindCrudRoutes('/room', RoomDAO, 'ROOM');
bindCrudRoutes('/alert', AlertDAO, 'ALERT');
bindCrudRoutes('/alert-type', AlertTypeDAO, 'ALERT_TYPE');


// ==========================================
// START SERVER
// ==========================================
app.listen(port, async () => {
    console.log(`API Server de Electiva 2 iniciando en el puerto ${port}...`);
    await initKafka();
    console.log(`Rutas Habilitadas: /patient, /device, /room, /alert, /alert-type`);
    console.log(`Sistema protegido mediante Keycloak. Enviar JWT en headers Authorization: Bearer TOKEN`);
});
