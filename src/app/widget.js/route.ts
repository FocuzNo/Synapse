import { NextResponse } from "next/server";

function script() {
  return `(() => {
  const currentScript = document.currentScript;
  if (!currentScript) return;

  const publicId = currentScript.getAttribute("data-chatbot-id");
  if (!publicId) return;

  const baseUrl = new URL(currentScript.src).origin;
  const root = document.createElement("div");
  const launcher = document.createElement("button");
  const iframe = document.createElement("iframe");
  let position = currentScript.getAttribute("data-position") || "bottom-right";
  let color = currentScript.getAttribute("data-color") || "#6D5DFB";
  let open = false;

  root.style.position = "fixed";
  root.style.zIndex = "2147483000";
  root.style.bottom = "20px";

  function applyPlacement() {
    root.style.left = "";
    root.style.right = "";
    root.style[position === "bottom-left" ? "left" : "right"] = "20px";
    launcher.style.background = color;
  }

  launcher.type = "button";
  launcher.setAttribute("aria-label", "Open chat widget");
  launcher.textContent = "Ask";
  launcher.style.width = "56px";
  launcher.style.height = "56px";
  launcher.style.border = "0";
  launcher.style.borderRadius = "9999px";
  launcher.style.color = "#fff";
  launcher.style.font = "600 15px sans-serif";
  launcher.style.cursor = "pointer";
  launcher.style.boxShadow = "0 16px 40px rgba(15, 23, 42, 0.24)";

  iframe.src = baseUrl + "/embed/" + encodeURIComponent(publicId);
  iframe.title = "AskFlow chat widget";
  iframe.style.display = "none";
  iframe.style.width = "min(380px, calc(100vw - 24px))";
  iframe.style.height = "min(680px, calc(100vh - 96px))";
  iframe.style.border = "0";
  iframe.style.borderRadius = "18px";
  iframe.style.background = "transparent";
  iframe.style.boxShadow = "0 24px 60px rgba(15, 23, 42, 0.28)";
  iframe.style.marginBottom = "12px";

  function render() {
    iframe.style.display = open ? "block" : "none";
  }

  applyPlacement();

  launcher.addEventListener("click", () => {
    open = !open;
    render();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && open) {
      open = false;
      render();
    }
  });

  window.addEventListener("message", (event) => {
    if (event.origin !== baseUrl) return;
    if (event.source !== iframe.contentWindow) return;
    if (event.data && event.data.type === "askflow:close") {
      open = false;
      render();
    }
  });

  fetch(baseUrl + "/api/public/chatbots/" + encodeURIComponent(publicId), {
    method: "GET",
    mode: "cors",
    credentials: "omit",
  })
    .then((response) => response.ok ? response.json() : null)
    .then((payload) => {
      if (!payload || !payload.available || !payload.chatbot) return;
      position = payload.chatbot.position || position;
      color = payload.chatbot.primaryColor || color;
      applyPlacement();
    })
    .catch(() => {});

  root.appendChild(iframe);
  root.appendChild(launcher);
  document.body.appendChild(root);
})();`;
}

export async function GET(request: Request) {
  void request;

  return new NextResponse(script(), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  });
}
