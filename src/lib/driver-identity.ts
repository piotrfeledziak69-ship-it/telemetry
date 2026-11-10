// Shared with the embedded app; importing runs the script so the global exists in every bundle.
import "../../public/app/identity.js";

export const { normalizeDriver, driverMatches, canonicalTeam } = globalThis.F1Identity;
