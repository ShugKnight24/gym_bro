/**
 * Versioned localStorage save slot. `migrate` upgrades old saves in place;
 * a corrupt or unreadable save returns null instead of throwing.
 */

export function createSave(key, version, migrate = (d) => d) {
  return {
    load() {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const data = JSON.parse(raw);
        return data.v === version ? data : migrate(data);
      } catch {
        return null;
      }
    },
    write(data) {
      try {
        localStorage.setItem(key, JSON.stringify({ ...data, v: version }));
        return true;
      } catch {
        return false;
      }
    },
    clear() {
      try {
        localStorage.removeItem(key);
      } catch {}
    },
  };
}
