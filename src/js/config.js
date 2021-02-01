import { getExtensionVersion } from "./util";

export let API_BASE = process.env.API_BASE_URI;
export let userId;

export function sendEvent(type, data) {
  if (process.env.NODE_ENV === "development") {
    console.log("event", type, data);
  }

  if (!data) {
    data = {};
  }

  const options = {
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      userId: userId || "unknown",
      eventId: uuidv4(),
      version: getExtensionVersion(),
      type: type,
      data: data,
    }),
    method: "POST",
  };

  const url = API_BASE + "/events";
  limiter
    .schedule(() => fetch(url, options))
    .then((data) => {
      if (process.env.NODE_ENV === "development") {
        console.info("event sent", data);
      }
    })
    .catch((error) => {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to send an error", error);
      }
    });
}
