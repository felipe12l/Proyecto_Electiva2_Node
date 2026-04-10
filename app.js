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

// Leemos el keycloak.json (que descargaste en formato OIDC) y lo mapeamos 
// al formato estricto que requiere "keycloak-connect".
const kcRawConfig = require('./keycloak.json');
const authServerUrl = kcRawConfig.web.issuer.split('/realms/')[0] + '/'; // = "http://localhost:8082/"
const realmName = kcRawConfig.web.issuer.split('/realms/')[1]; // = "Ancianato"

const keycloakConfig = {
    realm: realmName,
    "auth-server-url": authServerUrl,
    "ssl-required": "none",
    resource: kcRawConfig.web.client_id,
    credentials: {
        secret: kcRawConfig.web.client_secret
    },
    // CRÍTICO: "bearer-only" en true indica que tu API no tiene interfaz web.
    // Si alguien entra sin token o por navegador, responderá 401 Unauthorized
    // en vez de intentar redirigirlo a una página de login.
    "bearer-only": true 
};

const keycloak = new Keycloak({ store: memoryStore }, keycloakConfig);
app.use(keycloak.middleware());

// ==========================================
// MIDDLEWARE PARA KAFKA EVENTS
// ==========================================
/**
 * Emite un evento a Kafka indicando el cambio en DB
 */
async function triggerKafka(req, action, resultData) {
    // Extraemos la primera parte de la ruta (ej: de "/patient/1" obtenemos "patient")
    const entity = req.originalUrl.split('/')[1];

    // Mapeamos la ruta al nombre de los topics que tienes en tu interfaz
    const topicMap = {
        'patient': 'topic-servicio-patients',
        'alert': 'topic-servicio-alert',
        'alert-type': 'topic-servicio-alert-types',
        'device': 'topic-servicio-devices', // Topic sugerido si creas uno de dispositivos
        'room': 'topic-servicio-rooms',     // Topic sugerido si creas uno de cuartos
        'login': 'topic-autenticacion'
    };
    
    const topic = topicMap[entity] || 'api-events';

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
app.post('/login', async (req, res) => {
    // Validamos que envíen las credenciales para el inicio de sesión
    if (!req.body.username || !req.body.password) {
        return res.status(400).json({ error: 'Se requiere username y password para el login' });
    }

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
        return res.json({ token: data.access_token });
    } catch(err) {
        return res.status(500).json({ error: 'Fallo al autenticar contra Keycloak' });
    }
});

// CREATE PACIENTE -> Protegido con keycloak
app.post('/patient', keycloak.protect(), async (req, res) => {
    try {
        const newPatient = await PatientDAO.create(req.body);
        await triggerKafka(req, 'CREATE_PATIENT', newPatient);
        res.status(201).json(newPatient);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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

// --- RUTAS PARA DEVICES (DEVICE / WEARABLE) ---
app.post('/device', keycloak.protect(), async (req, res) => {
    try {
        const newDevice = await WearableDAO.create(req.body);
        await triggerKafka(req, 'CREATE_DEVICE', newDevice);
        res.status(201).json(newDevice);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/device', keycloak.protect(), async (req, res) => {
    try { res.json(await WearableDAO.findAll()); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/device/:id', keycloak.protect(), async (req, res) => {
    try {
        const data = await WearableDAO.findById(req.params.id);
        if(!data) return res.status(404).json({ error: 'Not found' });
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/device/:id', keycloak.protect(), async (req, res) => {
    try {
        const updated = await WearableDAO.update(req.params.id, req.body);
        if(!updated) return res.status(404).json({ error: 'Not found' });
        await triggerKafka(req, 'UPDATE_DEVICE', req.body);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/device/:id', keycloak.protect(), async (req, res) => {
    try {
        const deleted = await WearableDAO.delete(req.params.id);
        if(!deleted) return res.status(404).json({ error: 'Not found' });
        await triggerKafka(req, 'DELETE_DEVICE', { id: req.params.id });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- RUTAS PARA ROOMS (ROOM) ---
app.post('/room', keycloak.protect(), async (req, res) => {
    try {
        const newRoom = await RoomDAO.create(req.body);
        await triggerKafka(req, 'CREATE_ROOM', newRoom);
        res.status(201).json(newRoom);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/room', keycloak.protect(), async (req, res) => {
    try { res.json(await RoomDAO.findAll()); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/room/:id', keycloak.protect(), async (req, res) => {
    try {
        const data = await RoomDAO.findById(req.params.id);
        if(!data) return res.status(404).json({ error: 'Not found' });
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/room/:id', keycloak.protect(), async (req, res) => {
    try {
        const updated = await RoomDAO.update(req.params.id, req.body);
        if(!updated) return res.status(404).json({ error: 'Not found' });
        await triggerKafka(req, 'UPDATE_ROOM', req.body);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/room/:id', keycloak.protect(), async (req, res) => {
    try {
        const deleted = await RoomDAO.delete(req.params.id);
        if(!deleted) return res.status(404).json({ error: 'Not found' });
        await triggerKafka(req, 'DELETE_ROOM', { id: req.params.id });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- RUTAS PARA ALERTS (ALERT) ---
app.post('/alert', keycloak.protect(), async (req, res) => {
    try {
        const newAlert = await AlertDAO.create(req.body);
        await triggerKafka(req, 'CREATE_ALERT', newAlert);
        res.status(201).json(newAlert);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/alert', keycloak.protect(), async (req, res) => {
    try { res.json(await AlertDAO.findAll()); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/alert/:id', keycloak.protect(), async (req, res) => {
    try {
        const data = await AlertDAO.findById(req.params.id);
        if(!data) return res.status(404).json({ error: 'Not found' });
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/alert/:id', keycloak.protect(), async (req, res) => {
    try {
        const updated = await AlertDAO.update(req.params.id, req.body);
        if(!updated) return res.status(404).json({ error: 'Not found' });
        await triggerKafka(req, 'UPDATE_ALERT', req.body);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/alert/:id', keycloak.protect(), async (req, res) => {
    try {
        const deleted = await AlertDAO.delete(req.params.id);
        if(!deleted) return res.status(404).json({ error: 'Not found' });
        await triggerKafka(req, 'DELETE_ALERT', { id: req.params.id });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- RUTAS PARA ALERT TYPES (ALERT_TYPE) ---
app.post('/alert-type', keycloak.protect(), async (req, res) => {
    try {
        const newAlertType = await AlertTypeDAO.create(req.body);
        await triggerKafka(req, 'CREATE_ALERT_TYPE', newAlertType);
        res.status(201).json(newAlertType);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/alert-type', keycloak.protect(), async (req, res) => {
    try { res.json(await AlertTypeDAO.findAll()); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/alert-type/:id', keycloak.protect(), async (req, res) => {
    try {
        const data = await AlertTypeDAO.findById(req.params.id);
        if(!data) return res.status(404).json({ error: 'Not found' });
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/alert-type/:id', keycloak.protect(), async (req, res) => {
    try {
        const updated = await AlertTypeDAO.update(req.params.id, req.body);
        if(!updated) return res.status(404).json({ error: 'Not found' });
        await triggerKafka(req, 'UPDATE_ALERT_TYPE', req.body);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/alert-type/:id', keycloak.protect(), async (req, res) => {
    try {
        const deleted = await AlertTypeDAO.delete(req.params.id);
        if(!deleted) return res.status(404).json({ error: 'Not found' });
        await triggerKafka(req, 'DELETE_ALERT_TYPE', { id: req.params.id });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// ==========================================
// START SERVER
// ==========================================
app.listen(port, async () => {
    console.log(`API Server de Electiva 2 iniciando en el puerto ${port}...`);
    await initKafka();
    console.log(`Rutas Habilitadas: /patient, /device, /room, /alert, /alert-type`);
    console.log(`Sistema protegido mediante Keycloak. Enviar JWT en headers Authorization: Bearer TOKEN`);
});
