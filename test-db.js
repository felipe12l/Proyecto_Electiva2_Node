const { executeQuery } = require('./db');

async function testDB() {
    try {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('              PRUEBA DE CONEXIÓN A ORACLE DB                     ');
        console.log('═══════════════════════════════════════════════════════════════\n');

        // 1. Conexión básica
        console.log('1️⃣  CONEXIÓN BÁSICA');
        console.log('───────────────────────────────────────────────────────────────');
        const result = await executeQuery('SELECT SYSDATE FROM DUAL');
        console.log('✅ Conexión exitosa');
        console.log(`📅 Fecha del servidor: ${result.rows[0].SYSDATE}\n`);

        // 2. Listar tablas con formato bonito
        console.log('2️⃣  TABLAS DEL ESQUEMA');
        console.log('───────────────────────────────────────────────────────────────');
        const tables = await executeQuery(`SELECT table_name FROM user_tables ORDER BY table_name`);

        console.log(`Total de tablas: ${tables.rows.length}\n`);

        // Mostrar en formato de lista numerada
        tables.rows.forEach((row, index) => {
            console.log(`   ${(index + 1).toString().padStart(2, '0')}. ${row.TABLE_NAME}`);
        });
        console.log();

        // 3. Descripción de cada tabla (columnas)
        console.log('3️⃣  ESTRUCTURA DE TABLAS');
        console.log('───────────────────────────────────────────────────────────────');

        for (const row of tables.rows) {
            const tableName = row.TABLE_NAME;
            const cols = await executeQuery(`
                SELECT column_name, data_type, nullable
                FROM user_tab_columns
                WHERE table_name = :tn
                ORDER BY column_id
            `, { tn: tableName });

            console.log(`\n📋 ${tableName}`);
            console.log('   ' + '─'.repeat(50));
            cols.rows.forEach(col => {
                const nullable = col.NULLABLE === 'N' ? 'NOT NULL' : 'NULL';
                console.log(`   • ${col.COLUMN_NAME.padEnd(25)} ${col.DATA_TYPE.padEnd(15)} ${nullable}`);
            });
        }

        // 4. Contar registros en cada tabla
        console.log('\n\n4️⃣  CONTADOR DE REGISTROS POR TABLA');
        console.log('───────────────────────────────────────────────────────────────');

        for (const row of tables.rows) {
            const tableName = row.TABLE_NAME;
            try {
                const countResult = await executeQuery(`SELECT COUNT(*) as count FROM ${tableName}`);
                const count = countResult.rows[0].COUNT;
                const icon = count > 0 ? '🟢' : '⚪';
                console.log(`   ${icon} ${tableName.padEnd(25)} ${count.toString().padStart(4)} registros`);
            } catch (e) {
                console.log(`   🔴 ${tableName.padEnd(25)} Error al contar`);
            }
        }

        // 5. Probar DAOs
        console.log('\n\n5️⃣  PRUEBA DE DAOs');
        console.log('───────────────────────────────────────────────────────────────');

        console.log('\n   Creando Room de prueba...');
        const { Room } = require('./models');
        const room = new Room({ floor: 2, roomNumber: '205', roomPavilion: 'B' });

        const { GenericDAO } = require('./dao');
        const RoomDAO = new GenericDAO('room', require('./models').Room, 'roomId');
        const createdRoom = await RoomDAO.create(room);
        console.log(`   ✅ Room creado: ${createdRoom.roomId}`);

        const rooms = await RoomDAO.findAll();
        console.log(`   ✅ Total rooms: ${rooms.length}`);

        console.log('\n   Probando PatientDAO...');
        const { PatientDAO } = require('./dao');
        const patients = await PatientDAO.findAll();
        console.log(`   ✅ Total patients: ${patients.length}`);

        // Resumen final
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('              ✅ TODAS LAS PRUEBAS PASARON                      ');
        console.log('         La base de datos funciona correctamente                ');
        console.log('═══════════════════════════════════════════════════════════════\n');

        process.exit(0);
    } catch (err) {
        console.error('\n═══════════════════════════════════════════════════════════════');
        console.error('                    ❌ ERROR EN LA PRUEBA                       ');
        console.error('═══════════════════════════════════════════════════════════════');
        console.error('\nMensaje:', err.message);
        console.error('\nStack:', err.stack);
        process.exit(1);
    }
}

testDB();
