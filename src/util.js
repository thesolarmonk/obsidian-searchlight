import { Chance } from 'chance';

export function random(seed) {
  return new Chance(seed).random();
}

export function uuid() {
  return new Chance().string({
    length: 10,
    alpha: true,
    casing: 'lower',
    symbols: true,
    numeric: true,
  });
}
