/**
 * Type declarations for package.mjs (consumed by the regression suite's tsc
 * typecheck, which imports the pure naming-contract function).
 */

/**
 * Pure naming contract for the packaged VSIX:
 * `release/ArgosTesting-{version}.vsix`. Never points under `dist/`.
 */
export function getVsixOutputPath(version: string): string;
