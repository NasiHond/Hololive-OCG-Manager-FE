// authApi.js
// Helper to validate the currently stored access token with the backend.
import { getAuthHeaders, getStoredAccessToken } from "./usersApi.js";

const AUTH_ENDPOINT = "http://localhost:8080/api/auth";

async function safeParseJson(response) {
    try {
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    } catch {
        return null;
    }
}

export async function validateToken() {
    // If there is no stored token, it's not valid
    const accessToken = getStoredAccessToken();
    if (!accessToken) {
        return false;
    }

    const headers = getAuthHeaders();

    try {
        // Prefer a lightweight endpoint that returns 200 for valid tokens and 401/403 otherwise.
        const response = await fetch(`${AUTH_ENDPOINT}/validate`, {
            method: "GET",
            headers: {
                ...headers,
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            return false;
        }

        const data = await safeParseJson(response);
        // If backend returns { valid: true } prefer that, otherwise treat 2xx as valid
        if (data && typeof data.valid === "boolean") {
            return Boolean(data.valid);
        }

        return true;
    } catch (err) {
        // On network errors assume token invalid to be safe
        return false;
    }
}

