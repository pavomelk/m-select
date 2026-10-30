import { describe, expect, it } from 'vitest';
import './teardown.js';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

/**
 * Guard for the test numbering convention (project/AGENTS.md, "Testing").
 *
 * The suite is split by area into numbered files, and every `it` carries the
 * hierarchical number of its position: `<outer describe>.<area>.<test>`. Numbers
 * are the stable names of the behaviours, so two tests sharing one, a test
 * numbered outside the area it sits in, a letter suffix (`1.30.2a`) or a gap in
 * an area makes the suite impossible to refer to. Each check below reports the
 * offending `file:line` rather than the first failure, so one run shows every
 * numbering mistake at once.
 */

const TEST_DIR = fileURLToPath(new URL('.', import.meta.url));

const FILE_NAME = /^(\d{2})_[a-z0-9-]+\.test\.js$/;
const OUTER_DESCRIBE = /^describe\('(\d+)\. /;
// An area may be titled with its own number alone (`1. Items`) or with the
// outer prefix repeated (`2.4 Events`); its number is the last component.
const AREA_DESCRIBE = /^  describe\('(\d+(?:\.\d+)*)\.? /;
const NUMBERED_TEST = /^    it\('(\d+)\.(\d+)\.(\d+) /;
const ANY_DESCRIBE = /^\s*describe[(.]/;
const ANY_TEST = /^\s*it[(.]/;

const readFiles = () =>
  readdirSync(TEST_DIR)
    .filter((name) => name.endsWith('.test.js'))
    .sort();

/**
 * Reads every test file once and returns what the checks below need.
 * @returns {{files: string[], tests: object[], problems: object}}
 */
const scan = () => {
  const files = readFiles();
  const tests = [];
  const problems = {
    shapes: [],
    nesting: [],
    areas: [],
  };

  for (const file of files) {
    const lines = readFileSync(join(TEST_DIR, file), 'utf8').split(/\r?\n/);
    let outer = null;
    let area = null;
    let areaSeen = false;
    const seenAreas = new Set();

    lines.forEach((line, index) => {
      const at = `${file}:${index + 1}`;

      const outerMatch = line.match(OUTER_DESCRIBE);
      if (outerMatch) {
        if (outer !== null) problems.nesting.push(`${at}: a second top-level describe`);
        outer = Number(outerMatch[1]);
        return;
      }

      const areaMatch = line.match(AREA_DESCRIBE);
      if (areaMatch) {
        areaSeen = true;
        area = Number(areaMatch[1].split('.').at(-1));
        const key = `${outer}.${area}`;
        if (seenAreas.has(key)) problems.areas.push(`${at}: area ${key} is declared twice`);
        seenAreas.add(key);
        tests.push({ file, line: index + 1, id: null, area, outer });
        return;
      }

      if (ANY_DESCRIBE.test(line)) {
        problems.shapes.push(`${at}: describe is neither top-level nor an area`);
        return;
      }

      const testMatch = line.match(NUMBERED_TEST);
      if (testMatch) {
        tests.push({
          file,
          line: index + 1,
          id: `${testMatch[1]}.${testMatch[2]}.${testMatch[3]}`,
          parts: testMatch.slice(1, 4).map(Number),
          area,
          outer,
        });
        return;
      }

      if (ANY_TEST.test(line)) {
        problems.shapes.push(`${at}: it is not numbered "<outer>.<area>.<test>"`);
        return;
      }
    });

    if (outer === null) problems.nesting.push(`${file}: no top-level describe`);
    if (!areaSeen) problems.nesting.push(`${file}: no area describe`);
  }

  return { files, tests, problems };
};

describe('13. Test numbering', () => {
  describe('13.1 Guards', () => {
    const { files, tests, problems } = scan();

    it('13.1.1 test files are numbered areas with a unique two-digit prefix', () => {
      const bad = files.filter((name) => !FILE_NAME.test(name));
      expect(bad, 'files not matching NN_<area>.test.js').toEqual([]);

      const prefixes = files.map((name) => name.match(FILE_NAME)[1]);
      const repeated = prefixes.filter((prefix, i) => prefixes.indexOf(prefix) !== i);
      expect(repeated, 'repeated file prefixes').toEqual([]);
    });

    it('13.1.2 file prefixes run from 01 without a gap', () => {
      const prefixes = files.map((name) => Number(name.match(FILE_NAME)[1])).sort((a, b) => a - b);
      const expected = prefixes.map((_, i) => i + 1);

      expect(prefixes).toEqual(expected);
    });

    it('13.1.3 every test id is unique across the whole suite', () => {
      const ids = tests.filter((test) => test.id).map((test) => test.id);
      const repeated = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];

      expect(repeated, 'ids used by more than one test').toEqual([]);
    });

    it('13.1.4 every test id names its own file prefix and area', () => {
      const strays = tests
        .filter((test) => test.id)
        .filter((test) => test.parts[0] !== test.outer || test.parts[1] !== test.area)
        .map((test) => `${test.file}:${test.line}: ${test.id} in area ${test.outer}.${test.area}`);

      expect(strays, 'tests numbered outside their area').toEqual([]);
    });

    it('13.1.5 an area number is declared once under its top-level describe', () => {
      // A repeated area number would make every id under it ambiguous even
      // though the ids themselves are unique.
      expect(problems.areas, 'areas declared more than once').toEqual([]);
    });

    it('13.1.6 every test sits inside an area and every describe is one the scan knows', () => {
      const strays = tests
        .filter((test) => test.id && (test.area === null || test.outer === null))
        .map((test) => `${test.file}:${test.line}: ${test.id}`);

      expect([...problems.shapes, ...problems.nesting, ...strays]).toEqual([]);
    });
  });
});
