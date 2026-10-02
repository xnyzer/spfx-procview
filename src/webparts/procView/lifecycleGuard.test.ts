import { createLifecycleGuard } from './lifecycleGuard';

describe('createLifecycleGuard — render callbacks', () => {
  it('passes the arguments through while the render is current', () => {
    const guard = createLifecycleGuard();
    const onLoad = jest.fn();
    guard.forRender(onLoad)(720, 457);
    expect(onLoad).toHaveBeenCalledWith(720, 457);
  });

  it('ignores the events of an image from an earlier render (replaced image still loading)', () => {
    const guard = createLifecycleGuard();
    const staleError = jest.fn();
    const staleLoad = jest.fn();
    const onError = guard.forRender(staleError);
    const onLoad = guard.forRender(staleLoad);
    guard.nextRender();
    const currentError = jest.fn();
    const current = guard.forRender(currentError);
    onError();
    onLoad(720, 457);
    current();
    expect(staleError).not.toHaveBeenCalled();
    expect(staleLoad).not.toHaveBeenCalled();
    expect(currentError).toHaveBeenCalledTimes(1);
  });

  it('keeps every callback of the current render working, however often it fires', () => {
    const guard = createLifecycleGuard();
    const callback = jest.fn();
    const wrapped = guard.forRender(callback);
    wrapped();
    wrapped();
    expect(callback).toHaveBeenCalledTimes(2);
  });
});

describe('createLifecycleGuard — dispose', () => {
  it('silences render and lifetime callbacks after dispose', () => {
    const guard = createLifecycleGuard();
    const onError = jest.fn();
    const onTheme = jest.fn();
    const imageError = guard.forRender(onError);
    const themeChange = guard.forLifetime(onTheme);
    expect(guard.isDisposed).toBe(false);
    guard.dispose();
    imageError();
    themeChange('dark');
    expect(guard.isDisposed).toBe(true);
    expect(onError).not.toHaveBeenCalled();
    expect(onTheme).not.toHaveBeenCalled();
  });

  it('keeps lifetime callbacks across renders until dispose', () => {
    const guard = createLifecycleGuard();
    const onTheme = jest.fn();
    const themeChange = guard.forLifetime(onTheme);
    guard.nextRender();
    guard.nextRender();
    themeChange('contrast');
    expect(onTheme).toHaveBeenCalledWith('contrast');
  });

  it('silences callbacks wrapped after dispose as well', () => {
    const guard = createLifecycleGuard();
    guard.dispose();
    const callback = jest.fn();
    guard.forRender(callback)();
    guard.forLifetime(callback)();
    expect(callback).not.toHaveBeenCalled();
  });
});
