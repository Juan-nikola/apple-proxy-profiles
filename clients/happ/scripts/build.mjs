import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { build } from "esbuild";

const sourceRoot = resolve(import.meta.dirname, "..");
const target = Object.freeze({
  entry: "src/substore-config-entry.js",
  outputs: Object.freeze(["dist/happ-config-generator.js", "dist/substore-config-generator.js"]),
  globalName: "HappConfigBundle",
});

// The renderer's opaque fixed-node tags use Node's synchronous hash API in
// source tests. Sub-Store runs in a browser realm, so bundle the equivalent
// small synchronous SHA-256 adapter instead of leaking a Node builtin.
const browserCryptoShim = String.raw`
function sha256(bytes) {
  const K = [1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528719,113926993,338241895,666307205,773529912,1294757379,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298];
  const bitLength = bytes.length * 8;
  const padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
  padded.set(bytes); padded[bytes.length] = 128;
  for (let index = 0; index < 8; index += 1) padded[padded.length - 1 - index] = (bitLength >>> (index * 8)) & 255;
  let h0=1779033703,h1=3144134277,h2=1013904242,h3=2773480762,h4=1359893119,h5=2600822924,h6=528734635,h7=1541459225;
  const w = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) w[index] = (padded[offset + index*4] << 24) | (padded[offset + index*4+1] << 16) | (padded[offset + index*4+2] << 8) | padded[offset + index*4+3];
    for (let index = 16; index < 64; index += 1) { const a=w[index-15], b=w[index-2]; w[index]=(((a>>>7)|(a<<25))^((a>>>18)|(a<<14))^(a>>>3))+w[index-16]+(((b>>>17)|(b<<15))^((b>>>19)|(b<<13))^(b>>>10))+w[index-7]; }
    let a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7;
    for (let index = 0; index < 64; index += 1) { const s1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)); const ch=(e&f)^((~e)&g); const t1=h+s1+ch+K[index]+w[index]; const s0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)); const maj=(a&b)^(a&c)^(b&c); h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+s0+maj)>>>0; }
    h0=(h0+a)>>>0;h1=(h1+b)>>>0;h2=(h2+c)>>>0;h3=(h3+d)>>>0;h4=(h4+e)>>>0;h5=(h5+f)>>>0;h6=(h6+g)>>>0;h7=(h7+h)>>>0;
  }
  const output = new Uint8Array(32); [h0,h1,h2,h3,h4,h5,h6,h7].forEach((word,index) => { output[index*4]=word>>>24; output[index*4+1]=word>>>16; output[index*4+2]=word>>>8; output[index*4+3]=word; }); return output;
}
function base64url(bytes) { let value=""; for (const byte of bytes) value += String.fromCharCode(byte); return btoa(value).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/g,""); }
export function createHash(algorithm) { if (algorithm !== "sha256") throw new Error("Unsupported digest algorithm"); let value=""; return { update(next) { value += next; return this; }, digest(format) { if (format !== "base64url") throw new Error("Unsupported digest format"); return base64url(sha256(new TextEncoder().encode(value))); } }; }
`;

export async function buildBundles() {
  const result = await build({
    absWorkingDir: sourceRoot,
    entryPoints: [target.entry],
    bundle: true,
    format: "iife",
    globalName: target.globalName,
    platform: "neutral",
    target: "es2022",
    minify: false,
    legalComments: "none",
    plugins: [{
      name: "browser-crypto-shim",
      setup(buildContext) {
        buildContext.onResolve({ filter: /^node:crypto$/ }, () => ({ path: "node:crypto", namespace: "happ-browser" }));
        buildContext.onLoad({ filter: /.*/, namespace: "happ-browser" }, () => ({ contents: browserCryptoShim, loader: "js" }));
      },
    }],
    write: false,
  });
  if (result.outputFiles.length !== 1) throw new Error("Unexpected Happ bundle output count");
  const wrapper = `\nasync function operator(input, targetPlatform) {\n  return ${target.globalName}.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger });\n}\n`;
  const content = `${result.outputFiles[0].text.trimEnd()}${wrapper}`;
  for (const output of target.outputs) {
    const destination = resolve(sourceRoot, output);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content, "utf8");
  }
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) await buildBundles();
