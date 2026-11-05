import crypto from "crypto";

const globalScope = globalThis as unknown as { crypto?: object };
const nodeGlobal = global as unknown as { crypto?: object };
if (typeof globalScope.crypto === "undefined" || typeof nodeGlobal.crypto === "undefined") {
    const webcrypto = (crypto as unknown as { webcrypto?: object }).webcrypto || (crypto as unknown as object);
    globalScope.crypto = webcrypto;
    nodeGlobal.crypto = webcrypto;
}
