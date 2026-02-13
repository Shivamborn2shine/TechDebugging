// Heavy Load Test — 300+ participants
const API = "https://7zistlerr3.execute-api.eu-north-1.amazonaws.com/prod";

const TOTAL_USERS = 320;
const WAVE_SIZE = 40;    // 40 concurrent per wave (8 waves)
const WAVE_DELAY = 500;  // 500ms between waves

async function request(method, path, body, retries = 3) {
    const opts = {
        method,
        headers: { "Content-Type": "application/json" },
    };
    if (body) opts.body = JSON.stringify(body);

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await fetch(`${API}${path}`, opts);
            if (res.status >= 500 && attempt < retries) {
                await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
                continue;
            }
            const data = await res.json();
            return { status: res.status, data };
        } catch (err) {
            if (attempt < retries) {
                await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
                continue;
            }
            return { status: "NETWORK_ERR", data: { error: err.message } };
        }
    }
}

function randomSection() {
    return ["Python", "C", "Other"][Math.floor(Math.random() * 3)];
}

async function registerUser(i) {
    const t0 = Date.now();
    const res = await request("POST", "/participants", {
        name: `LoadUser_${i}`,
        studentId: `LT${String(i).padStart(4, "0")}`,
        section: randomSection(),
        startedAt: Date.now(),
        score: 0,
        totalPoints: 0,
        answers: [],
        submitted: false,
    });
    return { user: i, status: res.status, latency: Date.now() - t0, id: res.data?.id };
}

async function submitScore(id, userId) {
    const t0 = Date.now();
    const score = Math.floor(Math.random() * 100);
    const res = await request("PUT", `/participants/${id}`, {
        score,
        totalPoints: 100,
        submitted: true,
        completedAt: Date.now(),
        timeTaken: Math.floor(Math.random() * 1800),
        answers: [
            { questionId: "q1", questionType: "syntax", userAnswer: "fix", isCorrect: Math.random() > 0.3, pointsAwarded: score > 50 ? 10 : 0 },
            { questionId: "q2", questionType: "mcq", userAnswer: "1", isCorrect: Math.random() > 0.5, pointsAwarded: score > 70 ? 10 : 0 },
        ],
    });
    return { user: userId, status: res.status, latency: Date.now() - t0 };
}

async function runWave(startIdx, count, fn) {
    const promises = [];
    for (let i = startIdx; i < startIdx + count && i <= TOTAL_USERS; i++) {
        promises.push(fn(i));
    }
    return Promise.all(promises);
}

(async () => {
    console.log(`\n🔥 HEAVY LOAD TEST: ${TOTAL_USERS} participants in waves of ${WAVE_SIZE}\n`);
    const allResults = [];
    const globalStart = Date.now();

    // ===== PHASE 1: Registration =====
    console.log("📝 PHASE 1: Registering participants...\n");
    const registrations = [];
    const waves = Math.ceil(TOTAL_USERS / WAVE_SIZE);

    for (let w = 0; w < waves; w++) {
        const start = w * WAVE_SIZE + 1;
        const count = Math.min(WAVE_SIZE, TOTAL_USERS - w * WAVE_SIZE);
        process.stdout.write(`  Wave ${w + 1}/${waves} (users ${start}-${start + count - 1})...`);

        const results = await runWave(start, count, registerUser);
        registrations.push(...results);

        const ok = results.filter(r => r.status === 201).length;
        const fail = results.length - ok;
        const avgLat = Math.round(results.reduce((s, r) => s + r.latency, 0) / results.length);
        console.log(` ✅ ${ok} | ❌ ${fail} | avg ${avgLat}ms`);

        if (w < waves - 1) await new Promise(r => setTimeout(r, WAVE_DELAY));
    }

    const regSuccess = registrations.filter(r => r.status === 201);
    const regFail = registrations.filter(r => r.status !== 201);
    const regLatencies = regSuccess.map(r => r.latency);

    console.log(`\n--- Registration Summary ---`);
    console.log(`  Total: ${TOTAL_USERS} | Success: ${regSuccess.length} | Failed: ${regFail.length}`);
    if (regLatencies.length > 0) {
        console.log(`  Avg latency: ${Math.round(regLatencies.reduce((a, b) => a + b, 0) / regLatencies.length)}ms`);
        console.log(`  Min: ${Math.min(...regLatencies)}ms | Max: ${Math.max(...regLatencies)}ms`);
        const sorted = [...regLatencies].sort((a, b) => a - b);
        console.log(`  P50: ${sorted[Math.floor(sorted.length * 0.5)]}ms | P95: ${sorted[Math.floor(sorted.length * 0.95)]}ms`);
    }

    // ===== PHASE 2: Score Submissions =====
    console.log(`\n📤 PHASE 2: Submitting scores for ${regSuccess.length} participants...\n`);
    const submissions = [];

    const successUsers = regSuccess.filter(r => r.id);
    const subWaves = Math.ceil(successUsers.length / WAVE_SIZE);

    for (let w = 0; w < subWaves; w++) {
        const batch = successUsers.slice(w * WAVE_SIZE, (w + 1) * WAVE_SIZE);
        process.stdout.write(`  Wave ${w + 1}/${subWaves} (${batch.length} submissions)...`);

        const results = await Promise.all(batch.map(r => submitScore(r.id, r.user)));
        submissions.push(...results);

        const ok = results.filter(r => r.status === 200).length;
        const fail = results.length - ok;
        const avgLat = Math.round(results.reduce((s, r) => s + r.latency, 0) / results.length);
        console.log(` ✅ ${ok} | ❌ ${fail} | avg ${avgLat}ms`);

        if (w < subWaves - 1) await new Promise(r => setTimeout(r, WAVE_DELAY));
    }

    const subSuccess = submissions.filter(r => r.status === 200);
    const subFail = submissions.filter(r => r.status !== 200);
    const subLatencies = subSuccess.map(r => r.latency);

    console.log(`\n--- Submission Summary ---`);
    console.log(`  Total: ${submissions.length} | Success: ${subSuccess.length} | Failed: ${subFail.length}`);
    if (subLatencies.length > 0) {
        console.log(`  Avg latency: ${Math.round(subLatencies.reduce((a, b) => a + b, 0) / subLatencies.length)}ms`);
        console.log(`  Min: ${Math.min(...subLatencies)}ms | Max: ${Math.max(...subLatencies)}ms`);
    }

    // ===== PHASE 3: Leaderboard fetch =====
    console.log(`\n📊 PHASE 3: Fetching full leaderboard...`);
    const t0 = Date.now();
    const lb = await request("GET", "/participants");
    console.log(`  GET /participants → ${lb.status} (${lb.data.length} items) in ${Date.now() - t0}ms`);

    // ===== OVERALL =====
    const totalTime = Date.now() - globalStart;
    console.log(`\n════════════════════════════════════`);
    console.log(`  TOTAL TIME: ${(totalTime / 1000).toFixed(1)}s`);
    console.log(`  REGISTRATIONS: ${regSuccess.length}/${TOTAL_USERS} (${Math.round(regSuccess.length / TOTAL_USERS * 100)}%)`);
    console.log(`  SUBMISSIONS:   ${subSuccess.length}/${submissions.length} (${submissions.length > 0 ? Math.round(subSuccess.length / submissions.length * 100) : 0}%)`);
    console.log(`  DB RECORDS:    ${lb.data.length}`);
    console.log(`════════════════════════════════════\n`);

    // ===== CLEANUP =====
    console.log("🧹 Cleaning up test data...");
    await request("DELETE", "/participants");
    const after = await request("GET", "/participants");
    console.log(`  Participants after cleanup: ${after.data.length}`);
    console.log("\n✅ Load test complete!\n");
})();
