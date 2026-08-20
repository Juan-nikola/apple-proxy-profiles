import QRCode from "qrcode";

export { renderHappRoutingDeepLink, renderHappRoutingProfile } from "./routing-profile-data.js";

/** Build a static SVG QR image for the already-public Happ routing link. */
export async function renderHappRoutingQrSvg(deepLink) {
  if (typeof deepLink !== "string" || !deepLink.startsWith("happ://routing/onadd/")) throw new TypeError("Happ routing deep link is invalid");
  return QRCode.toString(deepLink, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
}

/** Render the same QR matrix synchronously for the synchronous publication build. */
export function renderHappRoutingQrSvgSync(deepLink) {
  if (typeof deepLink !== "string" || !deepLink.startsWith("happ://routing/onadd/")) {
    throw new TypeError("Happ routing deep link is invalid");
  }
  const qr = QRCode.create(deepLink, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const rects = [];
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (qr.modules.data[row * size + column] !== 1) continue;
      rects.push("<rect x=\"" + column + "\" y=\"" + row + "\" width=\"1\" height=\"1\"/>");
    }
  }
  return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 " + size + " " + size + "\" role=\"img\" aria-label=\"Happ 导入二维码\" shape-rendering=\"crispEdges\"><rect width=\"" + size + "\" height=\"" + size + "\" fill=\"#fff\"/> <g fill=\"#000\">" + rects.join("") + "</g></svg>";
}
