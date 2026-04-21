const USERS_ENDPOINT = "http://localhost:8080/api/users";
const AUTH_ENDPOINT = "http://localhost:8080/api/auth";
const AUTH_STORAGE_KEY = "authUser";
const AUTH_USERNAME_KEY = "username";
const AUTH_USER_ID_KEY = "userId";

async function readJsonResponse(response) {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
}

function normalizeAuthResponse(data, assumeAuthenticated = false) {
    const source = data?.loginResponse && typeof data.loginResponse === "object"
        ? data.loginResponse
        : data ?? {};

    const id = source.id ?? source.Id ?? data?.id ?? data?.Id ?? null;
    const username = source.username ?? data?.username ?? null;
    const authenticated = source.Authenticated ?? source.authenticated ?? data?.Authenticated ?? data?.authenticated ?? (assumeAuthenticated ? true : null);
    const message = source.Message ?? source.message ?? data?.Message ?? data?.message ?? "";

    return {
        id,
        username,
        authenticated,
        message,
        raw: data,
    };
}

export function storeAuthUser(authUser) {
    const normalized = normalizeAuthResponse(authUser, true);

    if (normalized.username) {
        localStorage.setItem(AUTH_USERNAME_KEY, normalized.username);
    }

    if (normalized.id != null) {
        localStorage.setItem(AUTH_USER_ID_KEY, String(normalized.id));
    }

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
}

export function getStoredAuthUser() {
    const storedAuthUser = localStorage.getItem(AUTH_STORAGE_KEY);

    if (storedAuthUser) {
        try {
            return normalizeAuthResponse(JSON.parse(storedAuthUser), true);
        } catch {
            localStorage.removeItem(AUTH_STORAGE_KEY);
        }
    }

    const username = localStorage.getItem(AUTH_USERNAME_KEY);
    const userId = localStorage.getItem(AUTH_USER_ID_KEY);

    if (!username && !userId) {
        return null;
    }

    return {
        id: userId ? Number(userId) : null,
        username,
        authenticated: true,
        message: "",
        raw: null,
    };
}

export function clearStoredAuthUser() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_USERNAME_KEY);
    localStorage.removeItem(AUTH_USER_ID_KEY);
}

export async function loginUser(credentials) {
    const response = await fetch(`${AUTH_ENDPOINT}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(credentials)
    });

    const data = await readJsonResponse(response);
    const normalized = normalizeAuthResponse(data);

    if (!response.ok || normalized.authenticated === false) {
        throw new Error(normalized.message || "Login failed");
    }

    return normalized;
}

export async function registerUser(userData) {
    const response = await fetch(`${USERS_ENDPOINT}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(userData)
    });

    const data = await readJsonResponse(response);
    const normalized = normalizeAuthResponse(data, true);

    if (!response.ok) {
        throw new Error(normalized.message || "Registration failed");
    }

    return normalized;
}