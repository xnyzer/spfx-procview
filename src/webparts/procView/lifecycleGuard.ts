/**
 * Keeps callbacks from outliving what they belong to. Every render replaces the diagram, but a
 * replaced image keeps loading and still fires `load`/`error`; after the web part is disposed,
 * image events and Teams theme changes can still arrive. Callbacks wrapped here go quiet instead
 * of re-rendering the web part or touching a disposed one.
 */
export interface ILifecycleGuard {
  /** Whether the web part was disposed — nothing may render any more. */
  readonly isDisposed: boolean;
  /** Starts a new render: callbacks wrapped for earlier renders are ignored from now on. */
  nextRender(): void;
  /** Wraps a callback that belongs to the current render, e.g. its image's events. */
  forRender<T extends unknown[]>(callback: (...args: T) => void): (...args: T) => void;
  /** Wraps a callback that lives as long as the web part, e.g. Teams theme changes. */
  forLifetime<T extends unknown[]>(callback: (...args: T) => void): (...args: T) => void;
  /** Silences every wrapped callback for good. */
  dispose(): void;
}

/** A guard for one web part instance. */
export function createLifecycleGuard(): ILifecycleGuard {
  let render = 0;
  let isDisposed = false;

  function forRender<T extends unknown[]>(callback: (...args: T) => void): (...args: T) => void {
    const ownRender = render;
    return (...args: T) => {
      if (!isDisposed && ownRender === render) {
        callback(...args);
      }
    };
  }

  function forLifetime<T extends unknown[]>(callback: (...args: T) => void): (...args: T) => void {
    return (...args: T) => {
      if (!isDisposed) {
        callback(...args);
      }
    };
  }

  return {
    get isDisposed(): boolean {
      return isDisposed;
    },
    nextRender: () => {
      render++;
    },
    forRender,
    forLifetime,
    dispose: () => {
      isDisposed = true;
    }
  };
}
