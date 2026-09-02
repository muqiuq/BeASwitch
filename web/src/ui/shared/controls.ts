/** Form controls shared by the home options and the extra features window. */

import { el } from './dom.js';

export function radio(
  name: string,
  label: string,
  hint: string,
  checked: boolean,
  onSelect: () => void,
): HTMLElement {
  const input = el('input', { type: 'radio', name, checked });
  input.addEventListener('change', onSelect);
  return el(
    'label',
    { class: 'radio' },
    input,
    el('span', {}, el('span', { text: label }), hint ? el('small', { text: hint }) : null),
  );
}

export function checkbox(
  label: string,
  hint: string,
  checked: boolean,
  onChange: (value: boolean) => void,
  disabled = false,
): HTMLElement {
  const input = el('input', { type: 'checkbox', checked, disabled });
  input.addEventListener('change', () => onChange(input.checked));
  return el(
    'label',
    { class: `check ${disabled ? 'is-disabled' : ''}` },
    input,
    el('span', {}, el('span', { text: label }), hint ? el('small', { text: hint }) : null),
  );
}

export function numberInput(
  value: number,
  min: number,
  max: number,
  onChange: (value: number) => void,
): HTMLInputElement {
  const input = el('input', {
    type: 'number',
    class: 'input input-number',
    value: String(value),
    min: String(min),
    max: String(max),
  });
  input.addEventListener('change', () => {
    const parsed = Number(input.value);
    onChange(Number.isFinite(parsed) ? parsed : min);
  });
  return input;
}
