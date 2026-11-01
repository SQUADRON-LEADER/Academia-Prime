/**
 * ============================================================
 * Academia Prime - Offline CAPTCHA OCR Solver
 * ============================================================
 * Runs entirely locally within an offscreen MV3 document using
 * WebAssembly and ONNX Runtime. No external network requests.
 * ============================================================
 */

(() => {
  "use strict";

  const moduleRegistry = {};
  const loadedModuleCache = {};

  function requireModule(moduleId) {
    const cached = loadedModuleCache[moduleId];
    if (cached !== undefined) return cached.exports;
    const mod = (loadedModuleCache[moduleId] = { id: moduleId, loaded: false, exports: {} });
    moduleRegistry[moduleId].call(mod.exports, mod, mod.exports, requireModule);
    mod.loaded = true;
    return mod.exports;
  }

  requireModule.m = moduleRegistry;
  requireModule.amdD = function () { throw new Error("define cannot be used indirect"); };
  requireModule.amdO = {};
  requireModule.n = (mod) => {
    const getter = mod && mod.__esModule ? () => mod.default : () => mod;
    requireModule.d(getter, { a: getter });
    return getter;
  };
  requireModule.d = (target, props) => {
    for (const key in props) {
      if (requireModule.o(props, key) && !requireModule.o(target, key)) {
        Object.defineProperty(target, key, { enumerable: true, get: props[key] });
      }
    }
  };
  requireModule.f = {};
  requireModule.e = (chunkId) =>
    Promise.all(
      Object.keys(requireModule.f).reduce((acc, key) => {
        requireModule.f[key](chunkId, acc);
        return acc;
      }, [])
    );
  requireModule.u = (chunkId) => chunkId + ".js";
  requireModule.g = (function () {
    if (typeof globalThis === "object") return globalThis;
    try { return this || new Function("return this")(); } catch { if (typeof window === "object") return window; }
  })();
  requireModule.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);

  const activeScriptLoads = {};
  const scriptPrefix = "academia-revanced-ocr:";

  requireModule.l = (url, callback, chunkName, chunkId) => {
    if (activeScriptLoads[url]) {
      activeScriptLoads[url].push(callback);
    } else {
      let scriptTag;
      let isNewlyCreated = false;
      if (chunkName !== undefined) {
        const existingScripts = document.getElementsByTagName("script");
        for (let i = 0; i < existingScripts.length; i++) {
          const s = existingScripts[i];
          if (s.getAttribute("src") === url || s.getAttribute("data-webpack") === scriptPrefix + chunkName) {
            scriptTag = s;
            break;
          }
        }
      }
      if (!scriptTag) {
        isNewlyCreated = true;
        scriptTag = document.createElement("script");
        scriptTag.charset = "utf-8";
        if (requireModule.nc) scriptTag.setAttribute("nonce", requireModule.nc);
        scriptTag.setAttribute("data-webpack", scriptPrefix + chunkName);
        scriptTag.src = url;
      }
      activeScriptLoads[url] = [callback];

      const onScriptDone = (err, evt) => {
        scriptTag.onerror = scriptTag.onload = null;
        clearTimeout(timeoutTimer);
        const callbacks = activeScriptLoads[url];
        delete activeScriptLoads[url];
        if (scriptTag.parentNode) scriptTag.parentNode.removeChild(scriptTag);
        if (callbacks) callbacks.forEach((cb) => cb(evt));
        if (err) return err(evt);
      };

      const timeoutTimer = setTimeout(
        onScriptDone.bind(null, undefined, { type: "timeout", target: scriptTag }),
        120000
      );
      scriptTag.onerror = onScriptDone.bind(null, scriptTag.onerror);
      scriptTag.onload = onScriptDone.bind(null, scriptTag.onload);
      if (isNewlyCreated) document.head.appendChild(scriptTag);
    }
  };

  requireModule.r = (exportsObj) => {
    if (typeof Symbol !== "undefined" && Symbol.toStringTag) {
      Object.defineProperty(exportsObj, Symbol.toStringTag, { value: "Module" });
    }
    Object.defineProperty(exportsObj, "__esModule", { value: true });
  };

  requireModule.nmd = (moduleObj) => {
    moduleObj.paths = [];
    if (!moduleObj.children) moduleObj.children = [];
    return moduleObj;
  };

  (() => {
    let scriptPath;
    if (requireModule.g.importScripts) scriptPath = requireModule.g.location + "";
    const doc = requireModule.g.document;
    if (!scriptPath && doc) {
      if (doc.currentScript && doc.currentScript.tagName.toUpperCase() === "SCRIPT") {
        scriptPath = doc.currentScript.src;
      }
      if (!scriptPath) {
        const scripts = doc.getElementsByTagName("script");
        if (scripts.length) {
          for (let i = scripts.length - 1; i > -1 && (!scriptPath || !/^http(s?):/.test(scriptPath)); ) {
            scriptPath = scripts[i--].src;
          }
        }
      }
    }
    if (!scriptPath) throw new Error("Unable to determine base path for OCR runtime");
    scriptPath = scriptPath.replace(/^blob:/, "").replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
    requireModule.p = scriptPath;
  })();

  (() => {
    requireModule.b = (typeof document !== "undefined" && document.baseURI) || self.location.href;
    const loadedChunks = { 522: 0 };

    requireModule.f.j = (chunkId, promisesArray) => {
      let chunkData = requireModule.o(loadedChunks, chunkId) ? loadedChunks[chunkId] : undefined;
      if (chunkData !== 0) {
        if (chunkData) {
          promisesArray.push(chunkData[2]);
        } else {
          const promise = new Promise((resolve, reject) => {
            chunkData = loadedChunks[chunkId] = [resolve, reject];
          });
          promisesArray.push((chunkData[2] = promise));
          const chunkUrl = requireModule.p + requireModule.u(chunkId);
          const chunkError = new Error();

          requireModule.l(
            chunkUrl,
            (evt) => {
              if (requireModule.o(loadedChunks, chunkId)) {
                chunkData = loadedChunks[chunkId];
                if (chunkData !== 0) loadedChunks[chunkId] = undefined;
                if (chunkData) {
                  const errorType = evt && (evt.type === "load" ? "missing" : evt.type);
                  const errorTarget = evt && evt.target && evt.target.src;
                  chunkError.message = "Loading chunk " + chunkId + " failed.\n(" + errorType + ": " + errorTarget + ")";
                  chunkError.name = "ChunkLoadError";
                  chunkError.type = errorType;
                  chunkError.request = errorTarget;
                  chunkData[1](chunkError);
                }
              }
            },
            "chunk-" + chunkId,
            chunkId
          );
        }
      }
    };

    const handleChunkLoaded = (parentChunkFunction, chunkPayload) => {
      const [chunkIds, chunkModules, runtimeInit] = chunkPayload;
      let moduleId, chunkId, i = 0;
      if (chunkIds.some((id) => loadedChunks[id] !== 0)) {
        for (moduleId in chunkModules) {
          if (requireModule.o(chunkModules, moduleId)) {
            requireModule.m[moduleId] = chunkModules[moduleId];
          }
        }
        if (runtimeInit) runtimeInit(requireModule);
      }
      if (parentChunkFunction) parentChunkFunction(chunkPayload);
      for (; i < chunkIds.length; i++) {
        chunkId = chunkIds[i];
        if (requireModule.o(loadedChunks, chunkId) && loadedChunks[chunkId]) {
          loadedChunks[chunkId][0]();
        }
        loadedChunks[chunkId] = 0;
      }
    };

    const webpackChunkStore = (self.webpackChunkcaptcha_chrome_extension =
      self.webpackChunkcaptcha_chrome_extension || []);
    webpackChunkStore.forEach(handleChunkLoaded.bind(null, 0));
    webpackChunkStore.push = handleChunkLoaded.bind(null, webpackChunkStore.push.bind(webpackChunkStore));
  })();

  // OCR Engine state
  let ocrInstance = null;
  let ocrInitPromise = null;

  async function getOcrEngine() {
    if (ocrInstance) return ocrInstance;
    if (!ocrInitPromise) {
      ocrInitPromise = (async () => {
        try {
          const onnxModule = await requireModule.e(189).then(requireModule.bind(requireModule, 189));
          onnxModule.env.wasm.wasmPaths = chrome.runtime.getURL("captcha_solver/wasm/");

          const { DdddOcr } = await Promise.all([
            requireModule.e(189),
            requireModule.e(623),
            requireModule.e(209)
          ]).then(requireModule.bind(requireModule, 623));

          const engine = new DdddOcr();
          engine.setPath(chrome.runtime.getURL("captcha_solver/models/"));

          // Optimize ranges for full alphanumeric character recognition (A-Z, a-z, 0-9)
          try {
            if (typeof engine.setRanges === "function") {
              // Range 6 = MIX_LOWER_UPPER_NUM_CASE (0-9, a-z, A-Z)
              engine.setRanges(6);
            }
          } catch (rangeErr) {
            console.warn("[Academia Prime] setRanges:", rangeErr);
          }

          ocrInstance = engine;
          console.log("[Academia Prime] High-accuracy Offline CAPTCHA OCR engine loaded successfully");
          return ocrInstance;
        } catch (err) {
          console.error("[Academia Prime] OCR engine init error:", err);
          ocrInstance = null;
          ocrInitPromise = null;
          throw err;
        }
      })();
    }
    return ocrInitPromise;
  }

  // Handle OCR messages
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "OCR_REQUEST" && typeof message.imageData === "string") {
      (async () => {
        try {
          const engine = await getOcrEngine();
          let solvedText = await engine.classification(message.imageData);
          
          if (solvedText) {
            // Clean any non-alphanumeric noise
            solvedText = solvedText.replace(/[^a-zA-Z0-9]/g, "");
          }

          sendResponse({ type: "OCR_RESPONSE", text: solvedText });
        } catch (err) {
          sendResponse({ type: "OCR_RESPONSE", error: String(err?.message || err) });
        }
      })();
      return true; // Keep message channel open for async response
    }
  });

  console.log("[Academia Prime] Offscreen CAPTCHA solver ready");
})();
