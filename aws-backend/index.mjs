import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    ScanCommand,
    UpdateCommand,
    DeleteCommand,
    BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLES = {
    participants: process.env.PARTICIPANTS_TABLE,
    questions: process.env.QUESTIONS_TABLE,
    settings: process.env.SETTINGS_TABLE,
    metadata: process.env.METADATA_TABLE,
};

// ---------- Helpers ----------
const json = (statusCode, body) => ({
    statusCode,
    headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    },
    body: JSON.stringify(body),
});

const parseBody = (event) => {
    try {
        return JSON.parse(event.body || "{}");
    } catch {
        return {};
    }
};

// ---------- Route handler ----------
export const handler = async (event) => {
    const method = event.requestContext?.http?.method || event.httpMethod;
    const path = event.requestContext?.http?.path || event.path;

    // Strip /prod prefix if present
    const cleanPath = path.replace(/^\/prod/, "");

    try {
        // ---- SETTINGS ----
        if (cleanPath.startsWith("/settings/")) {
            const key = cleanPath.split("/settings/")[1];

            if (method === "GET") {
                const result = await ddb.send(
                    new GetCommand({ TableName: TABLES.settings, Key: { configKey: key } })
                );
                return json(200, result.Item || {});
            }

            if (method === "PUT") {
                const body = parseBody(event);
                await ddb.send(
                    new PutCommand({
                        TableName: TABLES.settings,
                        Item: { configKey: key, ...body },
                    })
                );
                return json(200, { success: true });
            }
        }

        // ---- METADATA ----
        if (cleanPath.startsWith("/metadata/")) {
            const key = cleanPath.split("/metadata/")[1];

            if (method === "GET") {
                const result = await ddb.send(
                    new GetCommand({ TableName: TABLES.metadata, Key: { metaKey: key } })
                );
                return json(200, result.Item || {});
            }

            if (method === "PUT") {
                const body = parseBody(event);
                await ddb.send(
                    new PutCommand({
                        TableName: TABLES.metadata,
                        Item: { metaKey: key, ...body },
                    })
                );
                return json(200, { success: true });
            }
        }

        // ---- QUESTIONS BATCH ----
        if (cleanPath === "/questions/batch" && method === "POST") {
            const body = parseBody(event);
            const { action, items, ids, updates } = body;

            switch (action) {
                case "seed":
                case "bulkImport": {
                    // items: array of question objects to create
                    const results = [];
                    for (const item of items || []) {
                        const id = randomUUID();
                        await ddb.send(
                            new PutCommand({
                                TableName: TABLES.questions,
                                Item: { id, ...item },
                            })
                        );
                        results.push({ id });
                    }
                    // Update metadata timestamp
                    await ddb.send(
                        new PutCommand({
                            TableName: TABLES.metadata,
                            Item: { metaKey: "questions", lastUpdated: Date.now() },
                        })
                    );
                    return json(200, { success: true, created: results.length });
                }

                case "deleteSelected": {
                    // ids: array of question IDs to delete
                    // BatchWrite max 25 at a time
                    const batches = [];
                    for (let i = 0; i < (ids || []).length; i += 25) {
                        const batch = ids.slice(i, i + 25);
                        const requests = batch.map((id) => ({
                            DeleteRequest: { Key: { id } },
                        }));
                        batches.push(
                            ddb.send(
                                new BatchWriteCommand({
                                    RequestItems: { [TABLES.questions]: requests },
                                })
                            )
                        );
                    }
                    await Promise.all(batches);
                    await ddb.send(
                        new PutCommand({
                            TableName: TABLES.metadata,
                            Item: { metaKey: "questions", lastUpdated: Date.now() },
                        })
                    );
                    return json(200, { success: true, deleted: (ids || []).length });
                }

                case "renumber": {
                    // updates: array of { id, order }
                    for (const u of updates || []) {
                        await ddb.send(
                            new UpdateCommand({
                                TableName: TABLES.questions,
                                Key: { id: u.id },
                                UpdateExpression: "SET #ord = :ord",
                                ExpressionAttributeNames: { "#ord": "order" },
                                ExpressionAttributeValues: { ":ord": u.order },
                            })
                        );
                    }
                    await ddb.send(
                        new PutCommand({
                            TableName: TABLES.metadata,
                            Item: { metaKey: "questions", lastUpdated: Date.now() },
                        })
                    );
                    return json(200, { success: true });
                }

                case "moveSection": {
                    // ids: array of IDs, section: target section
                    const { section } = body;
                    for (const id of ids || []) {
                        await ddb.send(
                            new UpdateCommand({
                                TableName: TABLES.questions,
                                Key: { id },
                                UpdateExpression: "SET #sec = :sec",
                                ExpressionAttributeNames: { "#sec": "section" },
                                ExpressionAttributeValues: { ":sec": section },
                            })
                        );
                    }
                    await ddb.send(
                        new PutCommand({
                            TableName: TABLES.metadata,
                            Item: { metaKey: "questions", lastUpdated: Date.now() },
                        })
                    );
                    return json(200, { success: true });
                }

                default:
                    return json(400, { error: `Unknown batch action: ${action}` });
            }
        }

        // ---- QUESTIONS (single) ----
        if (cleanPath.startsWith("/questions")) {
            // GET /questions
            if (method === "GET" && cleanPath === "/questions") {
                const result = await ddb.send(
                    new ScanCommand({ TableName: TABLES.questions })
                );
                // Sort by order field
                const items = (result.Items || []).sort(
                    (a, b) => (a.order || 0) - (b.order || 0)
                );
                return json(200, items);
            }

            // POST /questions (create single)
            if (method === "POST" && cleanPath === "/questions") {
                const body = parseBody(event);
                const id = randomUUID();
                await ddb.send(
                    new PutCommand({
                        TableName: TABLES.questions,
                        Item: { id, ...body },
                    })
                );
                // Update metadata
                await ddb.send(
                    new PutCommand({
                        TableName: TABLES.metadata,
                        Item: { metaKey: "questions", lastUpdated: Date.now() },
                    })
                );
                return json(201, { id });
            }

            // PUT /questions/{id}
            const qIdMatch = cleanPath.match(/^\/questions\/([^/]+)$/);
            if (method === "PUT" && qIdMatch) {
                const id = qIdMatch[1];
                const body = parseBody(event);

                // Build update expression dynamically
                const keys = Object.keys(body);
                if (keys.length === 0) return json(400, { error: "No fields to update" });

                const exprParts = [];
                const exprNames = {};
                const exprValues = {};
                keys.forEach((key, i) => {
                    const nameKey = `#k${i}`;
                    const valKey = `:v${i}`;
                    exprParts.push(`${nameKey} = ${valKey}`);
                    exprNames[nameKey] = key;
                    exprValues[valKey] = body[key];
                });

                await ddb.send(
                    new UpdateCommand({
                        TableName: TABLES.questions,
                        Key: { id },
                        UpdateExpression: `SET ${exprParts.join(", ")}`,
                        ExpressionAttributeNames: exprNames,
                        ExpressionAttributeValues: exprValues,
                    })
                );
                // Update metadata
                await ddb.send(
                    new PutCommand({
                        TableName: TABLES.metadata,
                        Item: { metaKey: "questions", lastUpdated: Date.now() },
                    })
                );
                return json(200, { success: true });
            }

            // DELETE /questions/{id}
            if (method === "DELETE" && qIdMatch) {
                const id = qIdMatch[1];
                await ddb.send(
                    new DeleteCommand({ TableName: TABLES.questions, Key: { id } })
                );
                await ddb.send(
                    new PutCommand({
                        TableName: TABLES.metadata,
                        Item: { metaKey: "questions", lastUpdated: Date.now() },
                    })
                );
                return json(200, { success: true });
            }
        }

        // ---- PARTICIPANTS ----
        if (cleanPath.startsWith("/participants")) {
            // GET /participants
            if (method === "GET" && cleanPath === "/participants") {
                const result = await ddb.send(
                    new ScanCommand({ TableName: TABLES.participants })
                );
                return json(200, result.Items || []);
            }

            // POST /participants
            if (method === "POST" && cleanPath === "/participants") {
                const body = parseBody(event);
                const id = randomUUID();
                await ddb.send(
                    new PutCommand({
                        TableName: TABLES.participants,
                        Item: { id, ...body, createdAt: new Date().toISOString() },
                    })
                );
                return json(201, { id });
            }

            // DELETE /participants (all)
            if (method === "DELETE" && cleanPath === "/participants") {
                const result = await ddb.send(
                    new ScanCommand({
                        TableName: TABLES.participants,
                        ProjectionExpression: "id",
                    })
                );
                const items = result.Items || [];
                // BatchWrite in chunks of 25
                for (let i = 0; i < items.length; i += 25) {
                    const batch = items.slice(i, i + 25);
                    await ddb.send(
                        new BatchWriteCommand({
                            RequestItems: {
                                [TABLES.participants]: batch.map((item) => ({
                                    DeleteRequest: { Key: { id: item.id } },
                                })),
                            },
                        })
                    );
                }
                return json(200, { success: true, deleted: items.length });
            }

            // PUT /participants/{id}
            const pIdMatch = cleanPath.match(/^\/participants\/([^/]+)$/);
            if (method === "PUT" && pIdMatch) {
                const id = pIdMatch[1];
                const body = parseBody(event);

                const keys = Object.keys(body);
                if (keys.length === 0) return json(400, { error: "No fields to update" });

                const exprParts = [];
                const exprNames = {};
                const exprValues = {};
                keys.forEach((key, i) => {
                    const nameKey = `#k${i}`;
                    const valKey = `:v${i}`;
                    exprParts.push(`${nameKey} = ${valKey}`);
                    exprNames[nameKey] = key;
                    exprValues[valKey] = body[key];
                });

                await ddb.send(
                    new UpdateCommand({
                        TableName: TABLES.participants,
                        Key: { id },
                        UpdateExpression: `SET ${exprParts.join(", ")}`,
                        ExpressionAttributeNames: exprNames,
                        ExpressionAttributeValues: exprValues,
                    })
                );
                return json(200, { success: true });
            }
        }

        return json(404, { error: "Not found", path: cleanPath, method });
    } catch (err) {
        console.error("Lambda error:", err);
        return json(500, { error: err.message });
    }
};
