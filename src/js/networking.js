import { getExtensionVersion } from "./util";
import Bottleneck from "bottleneck";
import { v4 as uuidv4 } from "uuid";

export let API_BASE = process.env.API_BASE_URI;
export let userId;

chrome.storage.local.get("userId", function (items) {
  if (items.userId) {
    userId = items.userId;
  } else {
    userId = uuidv4();
    sendEvent("newUser");
    chrome.storage.local.set({ userId: userId }, function () {
      chrome.runtime.openOptionsPage();
    });
  }
});

const bottleneck = new Bottleneck({
  reservoir: 50,
  reservoirIncreaseMaximum: 50,
  reservoirIncreaseAmount: 1,
  reservoirIncreaseInterval: 3000,
  maxConcurrent: 1,
  highWater: 20,
  strategy: Bottleneck.strategy.OVERFLOW,
});

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
      ..._getCommonOptions(),
      type: type,
      data: data,
    }),
    method: "POST",
  };

  const url = API_BASE + "/events";
  bottleneck
    .schedule(() => fetch(url, options))
    .then((data) => {
      if (process.env.NODE_ENV === "development") {
        console.info("event sent", data);
      }
    })
    .catch((error) => {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to send an event", error);
      }
    });
}

export function reportError(desc, errorData, pageviewId) {
  const strError =
    errorData instanceof Error ? serializeError(errorData) : errorData;

  if (process.env.NODE_ENV === "development") {
    console.error(desc, errorData);
  }

  const options = {
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ..._getCommonOptions(),
      desc: desc,
      data: strError,
      pageviewId: pageviewId,
    }),
    method: "POST",
  };

  const url = API_BASE + "/error";
  bottleneck
    .schedule(() => fetch(url, options))
    .catch((error) => {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to send an error", error);
      }
    });
}

function _getCommonOptions() {
  return {
    userId: userId || "unknown",
    eventId: uuidv4(),
    version: getExtensionVersion(),
  };
}
