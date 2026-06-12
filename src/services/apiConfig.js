const DEV_API_BASE_URL = "http://localhost:8080";
const PROD_API_BASE_URL = "http://145.220.72.118:8080";

export const API_BASE_URL = import.meta.env.DEV ? DEV_API_BASE_URL : PROD_API_BASE_URL;

