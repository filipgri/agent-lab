/* ============================================================================
   storage.js - a small, friendly wrapper around IndexedDB
   ============================================================================

   WHY INDEXEDDB?
   Spec §3 says all data stays on the iPad. IndexedDB is the browser's built-in
   database. Unlike localStorage it can hold big things (audio Blobs, image data)
   and it does not have a tiny size limit.

   WHY A WRAPPER?
   Raw IndexedDB uses old-fashioned "request.onsuccess = ..." callbacks, which get
   messy fast. Every function below wraps that in a Promise so the rest of the app
   can just write:
       const agent = await Storage.loadAgent(id);

   SYNTAX NOTES FOR A BEGINNER
   - A Promise is an object that represents "a result that isn't ready yet".
   - `async function` marks a function that may wait for Promises.
   - `await x` means "pause here until x is ready, then give me the value".
   - Everything is attached to one global object, `Storage`, so app.js can reach
     it without any import/export machinery (we have no build step).
   ========================================================================== */

const Storage = (function () {

  const DB_NAME    = 'agent-lab';
  const DB_VERSION = 1;

  // Three "object stores" - think of them as three tables.
  const STORE_AGENTS = 'agents';  // one record per child's agent, keyed by id
  const STORE_AUDIO  = 'audio';   // recordings as Blobs, keyed by audioId (§8)
  const STORE_META   = 'meta';    // app settings, keyed by name

  let dbPromise = null;           // we open the database once and reuse it

  /* -------------------------------------------------------------------------
     openDb() - opens (and on first run, creates) the database.
     The "upgradeneeded" event fires only when the DB does not exist yet, or
     when DB_VERSION is raised. That is where tables get created.
     ---------------------------------------------------------------------- */
  function openDb() {
    if (dbPromise) return dbPromise;           // already opening/open: reuse it

    dbPromise = new Promise(function (resolve, reject) {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function (event) {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORE_AGENTS)) {
          // keyPath 'id' means: each stored object's own .id property is its key.
          db.createObjectStore(STORE_AGENTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_AUDIO)) {
          db.createObjectStore(STORE_AUDIO, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' });
        }
      };

      request.onsuccess = function () { resolve(request.result); };
      request.onerror   = function () { reject(request.error); };
    });

    return dbPromise;
  }

  /* -------------------------------------------------------------------------
     tx() - run one operation inside a transaction.
     IndexedDB insists that every read or write happens in a "transaction".
     This helper hides that: you pass the store name, the mode, and a function
     that does the work; you get back a Promise with the result.
     ---------------------------------------------------------------------- */
  async function tx(storeName, mode, work) {
    const db = await openDb();
    return new Promise(function (resolve, reject) {
      const transaction = db.transaction(storeName, mode);
      const store       = transaction.objectStore(storeName);
      const request     = work(store);

      // 'complete' fires when a write is safely on disk.
      transaction.oncomplete = function () {
        resolve(request ? request.result : undefined);
      };
      transaction.onerror = function () { reject(transaction.error); };
      transaction.onabort = function () { reject(transaction.error); };
    });
  }

  /* ===================== AGENTS ===================== */

  function saveAgent(agent)  { return tx(STORE_AGENTS, 'readwrite', s => s.put(agent)); }
  function loadAgent(id)     { return tx(STORE_AGENTS, 'readonly',  s => s.get(id)); }
  function deleteAgent(id)   { return tx(STORE_AGENTS, 'readwrite', s => s.delete(id)); }

  // getAll() hands back every agent record in one go.
  async function listAgents() {
    const all = await tx(STORE_AGENTS, 'readonly', s => s.getAll());
    // Newest first, so the adult list reads like a session log.
    return (all || []).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  function clearAgents() { return tx(STORE_AGENTS, 'readwrite', s => s.clear()); }

  /* ===================== AUDIO (used from Milestone 3) ===================== */

  function saveAudio(id, blob) {
    return tx(STORE_AUDIO, 'readwrite', s => s.put({ id: id, blob: blob }));
  }
  function loadAudio(id) {
    return tx(STORE_AUDIO, 'readonly', s => s.get(id));
  }
  function listAudio() {
    return tx(STORE_AUDIO, 'readonly', s => s.getAll());
  }
  // Spec §7: only the LAST voice recording is kept, so the one it replaced is
  // removed rather than left taking up room on the iPad forever.
  function deleteAudio(id) {
    return tx(STORE_AUDIO, 'readwrite', s => s.delete(id));
  }
  function clearAudio() {
    return tx(STORE_AUDIO, 'readwrite', s => s.clear());
  }

  /* ===================== META (settings) ===================== */

  async function getMeta(key, fallback) {
    const row = await tx(STORE_META, 'readonly', s => s.get(key));
    return row === undefined ? fallback : row.value;
  }
  function setMeta(key, value) {
    return tx(STORE_META, 'readwrite', s => s.put({ key: key, value: value }));
  }

  /* -------------------------------------------------------------------------
     requestPersistence() - spec §3.
     iOS may clear website data when storage runs low. This asks the browser to
     treat our data as "persistent" so it is cleared last. Safari may say no;
     that is fine, we just report what happened.
     ---------------------------------------------------------------------- */
  async function requestPersistence() {
    if (!navigator.storage || !navigator.storage.persist) return 'unsupported';
    try {
      const already = await navigator.storage.persisted();
      if (already) return 'granted';
      return (await navigator.storage.persist()) ? 'granted' : 'denied';
    } catch (err) {
      return 'error';
    }
  }

  // Everything listed here becomes available as Storage.<name> elsewhere.
  return {
    openDb, saveAgent, loadAgent, deleteAgent, listAgents, clearAgents,
    saveAudio, loadAudio, listAudio, deleteAudio, clearAudio,
    getMeta, setMeta, requestPersistence
  };
})();
