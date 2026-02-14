const https = require('https');

const API_URL = "https://b41s20nu9h.execute-api.eu-north-1.amazonaws.com/prod/participants";

https.get(API_URL, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const participants = JSON.parse(data);
            console.log("\n====== LEADERBOARD ======");
            console.log("Rank | Name         | Score  | Time (s) | Submitted");
            console.log("-----|--------------|--------|----------|----------");

            participants
                .sort((a, b) => b.score - a.score || a.timeTaken - b.timeTaken)
                .forEach((p, i) => {
                    const time = p.timeTaken ? p.timeTaken : (p.completedAt ? (p.completedAt - p.startedAt) / 1000 : 0);
                    const name = (p.name || "Anonymous").padEnd(12).substring(0, 12);
                    const score = `${p.score}/${p.totalPoints || '?'}`.padEnd(6);
                    const timeStr = time.toFixed(1).padEnd(8);
                    const submitted = p.submitted ? "Yes" : "No";

                    console.log(`${(i + 1).toString().padEnd(4)} | ${name} | ${score} | ${timeStr} | ${submitted}`);
                });
            console.log("=========================\n");
        } catch (e) {
            console.error("Error parsing JSON:", e.message);
            console.log("Raw Data:", data);
        }
    });
}).on('error', (e) => {
    console.error("Error fetching data:", e.message);
});
