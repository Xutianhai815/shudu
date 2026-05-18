const assert = require('node:assert/strict');
const test = require('node:test');

const { SOUND_FILES, createSoundManager } = require('../src/sound');

test('createSoundManager preloads local sound effects with expected defaults', () => {
  const created = [];
  const manager = createSoundManager(createMockWx(created), {
    volume: 0.35,
    poolSize: 2,
  });

  assert.equal(created.length, Object.keys(SOUND_FILES).length * 2);
  assert.equal(created[0].src, 'assets/sounds/select.wav');
  assert.equal(created[0].volume, 0.35);
  assert.equal(created[0].obeyMuteSwitch, true);
  assert.equal(manager.isEnabled(), true);
});

test('play rotates through a small pool so rapid taps can retrigger', () => {
  const created = [];
  const manager = createSoundManager(createMockWx(created), {
    poolSize: 2,
  });

  assert.equal(manager.play('input'), true);
  assert.equal(manager.play('input'), true);
  assert.equal(manager.play('input'), true);

  const inputContexts = created.filter((context) => context.src === SOUND_FILES.input);
  assert.equal(inputContexts[0].stopCount, 2);
  assert.equal(inputContexts[0].playCount, 2);
  assert.equal(inputContexts[1].stopCount, 1);
  assert.equal(inputContexts[1].playCount, 1);
});

test('play safely ignores unknown sounds unavailable audio APIs and disabled manager', () => {
  const noAudioManager = createSoundManager(null);
  assert.equal(noAudioManager.isEnabled(), false);
  assert.equal(noAudioManager.play('input'), false);

  const created = [];
  const manager = createSoundManager(createMockWx(created));
  assert.equal(manager.play('missing'), false);

  manager.setEnabled(false);
  assert.equal(manager.isEnabled(), false);
  assert.equal(manager.play('input'), false);
  assert.equal(created.every((context) => context.playCount === 0), true);
});

test('destroy releases all audio contexts once', () => {
  const created = [];
  const manager = createSoundManager(createMockWx(created), {
    poolSize: 1,
  });

  manager.destroy();
  manager.destroy();

  assert.equal(created.every((context) => context.destroyCount === 1), true);
  assert.equal(manager.isEnabled(), false);
});

function createMockWx(created) {
  return {
    createInnerAudioContext() {
      const context = {
        destroyCount: 0,
        obeyMuteSwitch: false,
        playCount: 0,
        stopCount: 0,
        volume: 1,
        src: '',
        destroy() {
          this.destroyCount += 1;
        },
        play() {
          this.playCount += 1;
        },
        stop() {
          this.stopCount += 1;
        },
      };

      created.push(context);
      return context;
    },
  };
}
