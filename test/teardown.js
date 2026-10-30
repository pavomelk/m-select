/**
 * Suite-wide teardown of the controls a test leaves alive.
 *
 * Every `MSelect` registers document-level `mousedown` and `keydown` listeners
 * in its constructor, and the stub document is shared by the whole test file.
 * A test that does not destroy its control therefore leaves a listener behind
 * that answers the *next* test's document events, so one test's stray key could
 * close another's list. Relying on each test to remember `finally { destroy() }`
 * makes that a matter of discipline; this file makes it automatic.
 *
 * The registry hooks the two methods every construction reaches - `setItems`,
 * which the constructor calls for a control built with Items, and `render` -
 * rather than asking ~500 tests to call a helper. `destroy()` is idempotent, so
 * a test that tears its control down itself is unaffected, and the `afterEach`
 * below fails the test that leaked a control instead of leaving the mystery to
 * the next one.
 *
 * Every test file imports this module at the top: the registry has to be built
 * from the *same* `m-select.js` module instance the tests construct from, and a
 * `setupFiles` entry would be a separate instance of it. The stub document
 * itself comes from `dom-stub.js` via `setupFiles`, which only has to publish
 * globals.
 */
import { afterEach } from 'vitest';
import { MSelect } from '../src/m-select.js';

// The set lives on the global so that every evaluation of this module - the
// test runner may collect a file and then run it through separate module
// instances - writes into the same registry the `afterEach` below drains.
const REGISTRY = Symbol.for('m-select.test-controls');
const live = (globalThis[REGISTRY] ??= new Set());

for (const name of ['setItems', 'render']) {
  const original = MSelect.prototype[name];
  if (typeof original !== 'function' || original.tracksControls) continue;

  const tracked = function trackedControl(...args) {
    live.add(this);
    return original.apply(this, args);
  };
  tracked.tracksControls = true;
  MSelect.prototype[name] = tracked;
}

afterEach(() => {
  for (const control of live) {
    try {
      control.destroy();
    } catch {
      // A control the test already destroyed, or one whose construction failed
      // before it was complete: there is nothing left to detach.
    }
  }
  live.clear();

  // The point of the registry is that nothing outlives its test. A live
  // document listener means some control is still answering every later test's
  // mousedown and keydown, so say so here, in the test that caused it.
  const { keydown = [], mousedown = [] } = document._listeners;
  if (keydown.length || mousedown.length) {
    throw new Error(
      `teardown left ${keydown.length} keydown and ${mousedown.length} mousedown ` +
        'listener(s) on the document; destroy the control the test built'
    );
  }
});
