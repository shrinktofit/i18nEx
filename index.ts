import { parseI18n } from "./parse";

// test('a');
// test('i18n:a.b');
// test('i18n:a.b{k_0: "c", k_1: "d"}');
// test('i18n:a.b{k_0: "c", k_1: "d", k_2: i18n:e.f}');
// test('i18n:a.b{k_0: "c", k_1: "d", k_2: i18n:e.f{kk_1: "g", kk_2: "h"}}');


test('i18n:a.b{k_0: "c", : }');
test('i18n:a.b{k_0: "c" : }');
test('i18n:a.b{k_0: "c, k_1 : }');
test('i18n:a.b{k_0: "c", k_1: "d"');
test('i18n:a.b{k_0: "c", k_1: "d"}}');

function test(str: string) {
  console.log(`"${str}"`, '==>', JSON.stringify(parseI18n(str), undefined, 2));
}
