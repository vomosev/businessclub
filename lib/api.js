export const API_BASE_URL = "https://businessclub-api.geo-drops.com:5067";

export class ApiError extends Error {
  constructor(message, status = 0, data = null, cause = undefined) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.code =
      data && typeof data === "object" && typeof data.code === "string"
        ? data.code
        : status > 0
          ? "HTTP_ERROR"
          : "NETWORK_ERROR";

    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export async function apiRequest(path, options = {}) {
  const endpoint = String(path || "").replace(/^\/+/, "");
  const url = `${API_BASE_URL}/${endpoint}`;
  const {
    body,
    headers: providedHeaders,
    ...requestOptions
  } = options;

  const headers = new Headers(providedHeaders || {});
  headers.set("Accept", "application/json");

  let requestBody;

  if (body !== undefined && body !== null) {
    if (typeof body === "string") {
      requestBody = body;
    } else {
      try {
        requestBody = JSON.stringify(body);
      } catch (error) {
        throw new ApiError(
          "The request data could not be prepared.",
          0,
          { code: "INVALID_REQUEST" },
          error
        );
      }
    }

    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  let response;

  try {
    response = await fetch(url, {
      ...requestOptions,
      headers,
      body: requestBody,
      credentials: "include",
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new ApiError(
        "The request was cancelled.",
        0,
        { code: "REQUEST_ABORTED" },
        error
      );
    }

    throw new ApiError(
      "Unable to connect to the Business Club service. Please try again.",
      0,
      { code: "NETWORK_ERROR" },
      error
    );
  }

  let data = null;
  let responseText = "";

  try {
    responseText = await response.text();
  } catch (error) {
    throw new ApiError(
      "The server response could not be read.",
      response.status,
      { code: "INVALID_RESPONSE" },
      error
    );
  }

  if (responseText) {
    const contentType = response.headers.get("content-type") || "";
    const expectsJson =
      contentType.includes("application/json") ||
      contentType.includes("+json");

    try {
      data = JSON.parse(responseText);
    } catch (error) {
      if (expectsJson) {
        throw new ApiError(
          response.ok
            ? "The server returned an invalid response."
            : `The request failed with status ${response.status}.`,
          response.status,
          { code: "INVALID_RESPONSE" },
          error
        );
      }

      data = responseText;
    }
  }

  if (!response.ok) {
    const message =
      data && typeof data === "object" && typeof data.error === "string"
        ? data.error
        : data && typeof data === "object" && typeof data.message === "string"
          ? data.message
          : typeof data === "string" && data.trim()
            ? data.trim()
            : `The request failed with status ${response.status}.`;

    throw new ApiError(message, response.status, data);
  }

  return data;
}