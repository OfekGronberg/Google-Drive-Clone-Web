const API_BASE = "";
// Examples:
// ""                -> same origin (if you serve frontend+backend together)
// "http://localhost:3001"  -> dev backend
// "https://api.example.com" -> production

export async function request({
    method = "GET",
    path,
    query,
    body,
    headers,
    token,
    signal,
    parseAs = "json", // "json" | "text" | "raw"
}) {
    if (!path) throw new Error("request(): 'path' is required");

    // Build URL (base + path + query string)
    const url = new URL(path, API_BASE || window.location.origin);

    if (query && typeof query === "object") {
        for (const [k, v] of Object.entries(query)) {
            if (v === undefined || v === null) continue;
            url.searchParams.set(k, String(v));
        }
    }

    const finalHeaders = {
        ...(headers || {}),
    };

    // Auth header (either pass token explicitly or use localStorage)
    const authToken = token ?? localStorage.getItem("token");
    if (authToken) {
        finalHeaders.Authorization = `Bearer ${authToken}`;
    }

    // JSON body handling (only if body is provided and not already FormData)
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

    let finalBody = undefined;
    if (body !== undefined) {
        if (isFormData) {
            finalBody = body; // browser sets the boundary automatically
        } else {
            finalHeaders["Content-Type"] = finalHeaders["Content-Type"] || "application/json";
            finalBody = typeof body === "string" ? body : JSON.stringify(body);
        }
    }

    const res = await fetch(url.toString(), {
        method,
        headers: finalHeaders,
        body: finalBody,
        signal,
    });

    // Try to parse error details (but don’t crash if parsing fails)
    if (!res.ok) {
        let details = null;
        try {
            const ct = res.headers.get("content-type") || "";
            details = ct.includes("application/json") ? await res.json() : await res.text();
        } catch {
            // ignore
        }
        // If 401 Unauthorized, clear token and redirect to login
        if (res.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("userId");
            localStorage.removeItem("userid");
            localStorage.removeItem("uid");
            window.location.href = "/login";
        }
        const err = new Error(`HTTP ${res.status} ${res.statusText}`);
        err.status = res.status;
        err.details = details;
        throw err;
    }

    // Parse success response
    if (parseAs === "raw") return res;

    if (parseAs === "text") {
        return await res.text();
    }

    // default json
    // handle empty response body (204 etc.)
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
        // not json -> return text instead of crashing
        return await res.text();
    }

    return await res.json();
}
