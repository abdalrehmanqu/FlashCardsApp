import { useAuth } from "@clerk/nextjs";

export const useApi = () => {
    const { getToken } = useAuth();

    const makeRequest = async (url, options = {}) => {
        const token = await getToken();

        const response = await fetch(`http://127.0.0.1:8000/${url}`, {
            ...options,
            headers: {
                ...(options.headers || {}),
                Authorization: `Bearer ${token}`,
            },
        });

        if (response.ok) {
            return response.status === 204
                ? null
                : response.json();
        }

        let errMsg = `HTTP ${response.status}`;
        const ct = response.headers.get("content-type") || "";

        if (ct.startsWith("application/json")) {
            try {
                const body = await response.json();
                if (Array.isArray(body)) {
                    errMsg = body.map((e) => e.msg || JSON.stringify(e)).join(", ");
                } else if (typeof body === "object") {
                    errMsg = body.detail || JSON.stringify(body);
                }
            } catch (_) {
            }
        }

        if (response.status === 401 || response.status === 403) {
            errMsg = "Please sign in again.";
        } else if (response.status === 413) {
            errMsg = "File too large – limit is 10 MB.";
        }

        throw new Error(errMsg);
    }; return { makeRequest };
};

const BASE = "http://127.0.0.1:8000";

export async function chatWithAI(data) {
    return fetch(`${BASE}/flashcards/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    }).then(r => r.json());
}

export async function applyProposal(data) {
    return fetch(`${BASE}/flashcards/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    }).then(r => r.json());
}