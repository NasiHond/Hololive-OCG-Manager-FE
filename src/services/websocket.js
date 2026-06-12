import {Client} from "@stomp/stompjs";
import SockJS from "sockjs-client/dist/sockjs";
import {API_BASE_URL} from "./apiConfig.js";

let client;

function getWebSocketUrl() {
    if (API_BASE_URL)
    {
        return `${API_BASE_URL}/ws`;
    }

    return `${window.location.origin}/ws`;
}

export function connectWebSocket(onConnect) {
    if (client?.active) {
        return client;
    }

    client = new Client({
        webSocketFactory: () => {
            console.log("[WS] Creating SockJS connection...");
            return new SockJS(getWebSocketUrl());
        },

        reconnectDelay: 5000,

        onConnect: (frame) => {
            console.log("[WS] CONNECTED ✔");
            console.log("[WS] Frame:", frame);

            if (onConnect) {
                onConnect(frame);
            }
        },

        onDisconnect: () => {
            console.log("[WS] DISCONNECTED");
        },

        onStompError: (frame) => {
            console.error("[WS] STOMP ERROR", frame);
        },

        onWebSocketError: (event) => {
            console.error("[WS] SOCKET ERROR", event);
        },
    });

    client.activate();

    return client;
}

export function disconnectWebSocket() {
    client?.deactivate();
}

export function getWebSocketClient() {
    return client;
}