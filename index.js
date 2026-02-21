const axios = require('axios');

// Configuración de Supabase
const SUPABASE_URL = "https://mukihqqapmlduqtkfszh.supabase.co";
const SUPABASE_KEY = "sb_publishable_sA3U8beZ3_JgB2F16nHOGg_BwKAKrMj";

// Headers para Supabase
const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};

// Función para obtener todas las tablas
async function getSupabaseInfo() {
    try {
        console.log("=".repeat(60));
        console.log("SUPABASE INFO EXTRACTOR");
        console.log("=".repeat(60));
        
        // 1. Obtener metadata del proyecto
        console.log("\n[INFO] Getting project metadata...");
        try {
            const metadataResponse = await axios.get(`${SUPABASE_URL}/rest/v1/`, {
                headers: headers,
                timeout: 10000
            });
            console.log("[METADATA]", JSON.stringify(metadataResponse.data, null, 2));
        } catch (e) {
            console.log("[METADATA] Error:", e.message);
        }
        
        // 2. Intentar obtener tablas comunes
        const commonTables = [
            'users',
            'profiles',
            'cards',
            'transactions',
            'payments',
            'accounts',
            'orders',
            'products',
            'sessions',
            'logs',
            'data',
            'items',
            'records',
            'entries'
        ];
        
        console.log("\n[INFO] Checking common tables...\n");
        
        for (const table of commonTables) {
            try {
                const response = await axios.get(`${SUPABASE_URL}/rest/v1/${table}?limit=5`, {
                    headers: headers,
                    timeout: 5000
                });
                
                if (response.data && response.data.length > 0) {
                    console.log(`[TABLE FOUND] ${table}`);
                    console.log(`[RECORDS] ${response.data.length} records`);
                    console.log(`[SAMPLE]`, JSON.stringify(response.data[0], null, 2));
                    console.log("-".repeat(60));
                }
            } catch (e) {
                if (e.response && e.response.status === 404) {
                    // Tabla no existe, continuar
                } else if (e.response) {
                    console.log(`[${table}] Status: ${e.response.status} - ${e.response.statusText}`);
                }
            }
        }
        
        // 3. Intentar obtener schema usando API de Postgres
        console.log("\n[INFO] Attempting to get schema...");
        try {
            const schemaResponse = await axios({
                method: 'POST',
                url: `${SUPABASE_URL}/rest/v1/rpc/get_schema`,
                headers: headers,
                data: {},
                timeout: 10000
            });
            console.log("[SCHEMA]", JSON.stringify(schemaResponse.data, null, 2));
        } catch (e) {
            console.log("[SCHEMA] Not accessible or RPC not available");
        }
        
        // 4. Obtener información de autenticación
        console.log("\n[INFO] Checking auth endpoint...");
        try {
            const authResponse = await axios.get(`${SUPABASE_URL}/auth/v1/settings`, {
                headers: headers,
                timeout: 5000
            });
            console.log("[AUTH SETTINGS]", JSON.stringify(authResponse.data, null, 2));
        } catch (e) {
            console.log("[AUTH] Error:", e.message);
        }
        
        // 5. Storage info
        console.log("\n[INFO] Checking storage...");
        try {
            const storageResponse = await axios.get(`${SUPABASE_URL}/storage/v1/bucket`, {
                headers: headers,
                timeout: 5000
            });
            console.log("[STORAGE]", JSON.stringify(storageResponse.data, null, 2));
        } catch (e) {
            console.log("[STORAGE] Error:", e.message);
        }
        
        console.log("\n" + "=".repeat(60));
        console.log("SCAN COMPLETE");
        console.log("=".repeat(60));
        
    } catch (error) {
        console.error("[ERROR]", error.message);
        if (error.response) {
            console.error("[RESPONSE]", error.response.status, error.response.data);
        }
    }
}

// Función alternativa: escaneo profundo con más endpoints
async function deepScan() {
    const endpoints = [
        '/rest/v1/',
        '/auth/v1/settings',
        '/auth/v1/health',
        '/storage/v1/bucket',
        '/rest/v1/users',
        '/rest/v1/profiles',
        '/rest/v1/cards',
        '/rest/v1/transactions',
        '/realtime/v1/',
        '/functions/v1/'
    ];
    
    console.log("\n[DEEP SCAN] Testing all endpoints...\n");
    
    for (const endpoint of endpoints) {
        try {
            const response = await axios.get(`${SUPABASE_URL}${endpoint}`, {
                headers: headers,
                timeout: 5000,
                validateStatus: () => true // Aceptar cualquier status
            });
            
            console.log(`[${response.status}] ${endpoint}`);
            if (response.status === 200 && response.data) {
                console.log(`[DATA]`, JSON.stringify(response.data, null, 2).substring(0, 200));
            }
        } catch (e) {
            console.log(`[ERROR] ${endpoint}: ${e.message}`);
        }
    }
}

// Ejecutar
(async () => {
    await getSupabaseInfo();
    
    // Descomentar para hacer escaneo profundo
    // await deepScan();
})();