/**
 * Compile-time guard for exhaustive `switch` statements (CODING-STANDARDS §6): in the `default`
 * branch the value has the type `never`, so a variant that is not handled fails the build here.
 */
export function assertNever(value: never): never {
  throw new Error(`unhandled value ${String(value)}`);
}
