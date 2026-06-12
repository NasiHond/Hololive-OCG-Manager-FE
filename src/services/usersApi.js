import { API_BASE_URL } from "./apiConfig.js";

const USERS_ENDPOINT = `${API_BASE_URL}/api/users`;
const AUTH_ENDPOINT = `${API_BASE_URL}/api/auth`;
const AUTH_STORAGE_KEY = "authUser";
const AUTH_ACCESS_TOKEN_KEY = "accessToken";
const AUTH_REFRESH_TOKEN_KEY = "refreshToken";
const AUTH_TOKEN_TYPE_KEY = "tokenType";
const AUTH_EXPIRES_IN_KEY = "expiresIn";
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

    const authSource = source.user && typeof source.user === "object" ? source.user : source;

    const accessToken = source.accessToken ?? source.token ?? data?.accessToken ?? data?.token ?? null;
    const refreshToken = source.refreshToken ?? data?.refreshToken ?? null;
    const tokenType = source.tokenType ?? source.TokenType ?? data?.tokenType ?? data?.TokenType ?? (accessToken ? "Bearer" : null);
    const expiresIn = source.expiresIn ?? source.ExpiresIn ?? data?.expiresIn ?? data?.ExpiresIn ?? null;
    const id = authSource.id ?? authSource.Id ?? source.id ?? source.Id ?? data?.id ?? data?.Id ?? null;
    const username = authSource.username ?? authSource.userName ?? source.username ?? data?.username ?? null;
    const authenticated = source.Authenticated ?? source.authenticated ?? data?.Authenticated ?? data?.authenticated ?? (assumeAuthenticated && accessToken ? true : null);
    const message = source.Message ?? source.message ?? data?.Message ?? data?.message ?? "";

    return {
        id,
        username,
        accessToken,
        refreshToken,
        tokenType,
        expiresIn,
        authenticated,
        message,
        raw: data,
    };
}

export function storeAuthUser(authUser) {
    const normalized = normalizeAuthResponse(authUser, true);

    if (normalized.accessToken) {
        localStorage.setItem(AUTH_ACCESS_TOKEN_KEY, normalized.accessToken);
    } else {
        localStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
    }

    if (normalized.refreshToken) {
        localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, normalized.refreshToken);
    } else {
        localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    }

    if (normalized.tokenType) {
        localStorage.setItem(AUTH_TOKEN_TYPE_KEY, normalized.tokenType);
    } else {
        localStorage.removeItem(AUTH_TOKEN_TYPE_KEY);
    }

    if (normalized.expiresIn != null) {
        localStorage.setItem(AUTH_EXPIRES_IN_KEY, String(normalized.expiresIn));
    } else {
        localStorage.removeItem(AUTH_EXPIRES_IN_KEY);
    }

    if (normalized.username) {
        localStorage.setItem(AUTH_USERNAME_KEY, normalized.username);
    } else {
        localStorage.removeItem(AUTH_USERNAME_KEY);
    }

    if (normalized.id != null) {
        localStorage.setItem(AUTH_USER_ID_KEY, String(normalized.id));
    } else {
        localStorage.removeItem(AUTH_USER_ID_KEY);
    }

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
}

export function getStoredAuthUser() {
    const storedAuthUser = localStorage.getItem(AUTH_STORAGE_KEY);

    if (storedAuthUser) {
        try {
            const normalized = normalizeAuthResponse(JSON.parse(storedAuthUser), true);

            return {
                ...normalized,
                accessToken: normalized.accessToken ?? localStorage.getItem(AUTH_ACCESS_TOKEN_KEY),
                refreshToken: normalized.refreshToken ?? localStorage.getItem(AUTH_REFRESH_TOKEN_KEY),
                tokenType: normalized.tokenType ?? localStorage.getItem(AUTH_TOKEN_TYPE_KEY),
                expiresIn: normalized.expiresIn ?? localStorage.getItem(AUTH_EXPIRES_IN_KEY),
            };
        } catch {
            localStorage.removeItem(AUTH_STORAGE_KEY);
        }
    }

    const username = localStorage.getItem(AUTH_USERNAME_KEY);
    const userId = localStorage.getItem(AUTH_USER_ID_KEY);
    const accessToken = localStorage.getItem(AUTH_ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
    const tokenType = localStorage.getItem(AUTH_TOKEN_TYPE_KEY);
    const expiresIn = localStorage.getItem(AUTH_EXPIRES_IN_KEY);

    if (!username && !userId && !accessToken) {
        return null;
    }

    return {
        id: userId ? Number(userId) : null,
        username,
        accessToken,
        refreshToken,
        tokenType,
        expiresIn,
        authenticated: true,
        message: "",
        raw: null,
    };
}

export function clearStoredAuthUser() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
    localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_TOKEN_TYPE_KEY);
    localStorage.removeItem(AUTH_EXPIRES_IN_KEY);
    localStorage.removeItem(AUTH_USERNAME_KEY);
    localStorage.removeItem(AUTH_USER_ID_KEY);
}

export function getStoredAccessToken() {
    const authUser = getStoredAuthUser();
    return authUser?.accessToken ?? null;
}

export function getAuthHeaders() {
    const accessToken = getStoredAccessToken();

    if (!accessToken) {
        return {};
    }

    const authUser = getStoredAuthUser();
    const tokenType = authUser?.tokenType || "Bearer";

    return {
        Authorization: `${tokenType} ${accessToken}`,
    };
}

export async function loginUser(credentials) {
    const response = await fetch(`${AUTH_ENDPOINT}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials)
    });

    const data = await readJsonResponse(response);
    const normalized = normalizeAuthResponse(data);

    if (!response.ok || normalized.authenticated === false || !normalized.accessToken) {
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
        body: JSON.stringify(userData)
    });

    const data = await readJsonResponse(response);
    const normalized = normalizeAuthResponse(data, true);

    if (!response.ok) {
        throw new Error(normalized.message || "Registration failed");
    }

    return normalized;
}