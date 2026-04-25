import * as React from "react";
import * as ReactDOM from "react-dom";

/**
 * Startup sanity check for React installation.
 *
 * Detects two common failure modes that produce cryptic errors like
 * "Cannot read properties of null (reading 'useEffect')":
 *  1. Multiple copies of React loaded into the bundle (duplicate instances).
 *  2. Mismatched react / react-dom major versions.
 *  3. Peer dependencies that require a different React major than installed.
 *
 * Runs only in development. Logs warnings to the console — never throws,
 * so it can never take down the app on its own.
 */

// Known peer-dependency rules: package name -> required React major(s).
// Add entries here as new libraries with strict React peer requirements
// are introduced.
const PEER_REQUIREMENTS: Array<{
  pkg: string;
  requiredMajors: number[];
  hint: string;
}> = [
  {
    pkg: "react-markdown",
    requiredMajors: [18, 19],
    hint: "react-markdown@>=10 requires React 19. Pin to ^9.0.1 for React 18.",
  },
];

function parseMajor(version: string | undefined): number | null {
  if (!version) return null;
  const match = /^\D*(\d+)/.exec(version);
  return match ? Number(match[1]) : null;
}

export function runReactVersionCheck(): void {
  if (!import.meta.env.DEV) return;

  const reactVersion = (React as unknown as { version?: string }).version;
  const reactDomVersion = (ReactDOM as unknown as { version?: string }).version;

  const reactMajor = parseMajor(reactVersion);
  const reactDomMajor = parseMajor(reactDomVersion);

  // 1. react vs react-dom major mismatch
  if (reactMajor !== null && reactDomMajor !== null && reactMajor !== reactDomMajor) {
    console.error(
      `[reactVersionCheck] react (${reactVersion}) and react-dom (${reactDomVersion}) ` +
        `majors do not match. Align both to the same major version.`,
    );
  }

  // 2. Duplicate React instances. The internals object is unique per copy.
  const internals = (
    React as unknown as {
      __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?: unknown;
    }
  ).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

  if (typeof window !== "undefined") {
    const w = window as unknown as { __KLOSE_REACT_INTERNALS__?: unknown };
    if (w.__KLOSE_REACT_INTERNALS__ && w.__KLOSE_REACT_INTERNALS__ !== internals) {
      console.error(
        "[reactVersionCheck] Multiple React copies detected in the bundle. " +
          "This causes hooks to fail (e.g. 'Cannot read properties of null (reading useEffect)'). " +
          "Run `bun pm ls react` and deduplicate dependencies that pull a second React.",
      );
    } else {
      w.__KLOSE_REACT_INTERNALS__ = internals;
    }
  }

  // 3. Peer dependency major checks (best-effort; failures are silent).
  if (reactMajor !== null) {
    void Promise.all(
      PEER_REQUIREMENTS.map(async ({ pkg, requiredMajors, hint }) => {
        try {
          const mod = (await import(/* @vite-ignore */ `${pkg}/package.json`)) as {
            default?: { version?: string };
            version?: string;
          };
          const pkgVersion = mod.default?.version ?? mod.version;
          const pkgMajor = parseMajor(pkgVersion);
          if (pkgMajor === null) return;
          if (!requiredMajors.includes(reactMajor)) {
            console.warn(
              `[reactVersionCheck] ${pkg}@${pkgVersion} expects React ` +
                `${requiredMajors.join(" or ")}, found React ${reactVersion}. ${hint}`,
            );
          }
        } catch {
          // Package not installed or package.json not resolvable — ignore.
        }
      }),
    );
  }

  console.info(
    `[reactVersionCheck] React ${reactVersion} / ReactDOM ${reactDomVersion} OK.`,
  );
}
