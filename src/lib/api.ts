const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    if (!API_BASE) {
        throw new Error("API URL is not configured. please set NEXT_PUBLIC_API_URL in your environment variables.");
    }
    const url = `${API_BASE}${path}`;
    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const res = await fetch(url, {
            headers: { "Content-Type": "application/json" },
            ...options,
        });

        // Retry on 5xx (Lambda throttle / cold-start)
        if (res.status >= 500 && attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
            continue;
        }

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`API Error ${res.status}: ${err}`);
        }
        return res.json();
    }

    throw new Error(`API request failed after ${MAX_RETRIES} retries`);
}

// ==================== SETTINGS ====================

export async function getSettings(key: string) {
    return request<Record<string, unknown>>(`/settings/${key}`);
}

export async function putSettings(key: string, data: Record<string, unknown>) {
    return request(`/settings/${key}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
}

// ==================== METADATA ====================

export async function getMetadata(key: string) {
    return request<Record<string, unknown>>(`/metadata/${key}`);
}

export async function putMetadata(key: string, data: Record<string, unknown>) {
    return request(`/metadata/${key}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
}

// ==================== PARTICIPANTS ====================

export async function createParticipant(data: Record<string, unknown>): Promise<{ id: string }> {
    return request<{ id: string }>("/participants", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function getParticipants(): Promise<Record<string, unknown>[]> {
    return request<Record<string, unknown>[]>("/participants");
}

export async function updateParticipant(id: string, data: Record<string, unknown>) {
    return request(`/participants/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
}

export async function deleteAllParticipants() {
    return request("/participants", { method: "DELETE" });
}

// ==================== QUESTIONS ====================

export async function getQuestions(): Promise<Record<string, unknown>[]> {
    return request<Record<string, unknown>[]>("/questions");
}

export async function createQuestion(data: Record<string, unknown>): Promise<{ id: string }> {
    return request<{ id: string }>("/questions", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function updateQuestion(id: string, data: Record<string, unknown>) {
    return request(`/questions/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
}

export async function deleteQuestion(id: string) {
    return request(`/questions/${id}`, { method: "DELETE" });
}

// ==================== BATCH OPERATIONS ====================

export async function batchSeedQuestions(items: Record<string, unknown>[]) {
    return request("/questions/batch", {
        method: "POST",
        body: JSON.stringify({ action: "seed", items }),
    });
}

export async function batchImportQuestions(items: Record<string, unknown>[]) {
    return request("/questions/batch", {
        method: "POST",
        body: JSON.stringify({ action: "bulkImport", items }),
    });
}

export async function batchDeleteQuestions(ids: string[]) {
    return request("/questions/batch", {
        method: "POST",
        body: JSON.stringify({ action: "deleteSelected", ids }),
    });
}

export async function batchRenumberQuestions(updates: { id: string; order: number }[]) {
    return request("/questions/batch", {
        method: "POST",
        body: JSON.stringify({ action: "renumber", updates }),
    });
}

export async function batchMoveSection(ids: string[], section: string) {
    return request("/questions/batch", {
        method: "POST",
        body: JSON.stringify({ action: "moveSection", ids, section }),
    });
}
