
// Admin Operations Test Script
const API = "https://7zistlerr3.execute-api.eu-north-1.amazonaws.com/prod";

async function request(method, path, body) {
    const opts = {
        method,
        headers: { "Content-Type": "application/json" },
    };
    if (body) opts.body = JSON.stringify(body);

    console.log(`${method} ${path}...`);
    try {
        const res = await fetch(`${API}${path}`, opts);
        const text = await res.text();
        try {
            const data = JSON.parse(text);
            return { status: res.status, data };
        } catch {
            return { status: res.status, raw: text };
        }
    } catch (err) {
        return { error: err.message };
    }
}

(async () => {
    console.log("=== TESTING ADMIN OPS ===\n");

    // 1. CREATE QUESTION
    const qData = {
        title: "Test Question",
        description: "Created via script",
        type: "syntax",
        points: 10,
        section: "Python",
        buggyCode: "print 'hello'",
        correctCode: "print('hello')",
        language: "python"
    };

    const create = await request("POST", "/questions", qData);
    console.log("Create result:", create);

    if (create.status !== 201) {
        console.error("❌ Failed to create question");
        return;
    }
    const qId = create.data.id;
    console.log(`✅ Created question ID: ${qId}`);

    // 2. GET QUESTIONS (verify it's there)
    const list = await request("GET", "/questions");
    const found = list.data.find(q => q.id === qId);
    if (found) {
        console.log("✅ Question found in list");
    } else {
        console.error("❌ Question NOT found in list");
    }

    // 3. UPDATE QUESTION
    const update = await request("PUT", `/questions/${qId}`, { points: 20 });
    console.log("Update result:", update);

    // 4. VERIFY UPDATE
    const list2 = await request("GET", "/questions");
    const found2 = list2.data.find(q => q.id === qId);
    if (found2 && found2.points === 20) {
        console.log("✅ Question updated successfully (points=20)");
    } else {
        console.error("❌ Update failed or not persisted");
    }

    // 5. DELETE QUESTION
    const del = await request("DELETE", `/questions/${qId}`);
    console.log("Delete result:", del);

    // 6. VERIFY DELETE
    const list3 = await request("GET", "/questions");
    const found3 = list3.data.find(q => q.id === qId);
    if (!found3) {
        console.log("✅ Question deleted successfully");
    } else {
        console.error("❌ Question still exists");
    }

    console.log("\n=== TEST COMPLETE ===");
})();
