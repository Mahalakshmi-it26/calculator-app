import { useCallback, useEffect, useMemo, useState } from 'react';
import { Cat, Check, History as HistoryIcon, MoreHorizontal, Palette, RotateCcw, Settings, Sprout, Volume2 } from 'lucide-react';

function CalculatorMark() {
  return <img src="/icon-192.png" alt="" aria-hidden="true" />;
}
type Theme = 'white' | 'cream' | 'dark';
type Tab = 'calculator' | 'history' | 'theme' | 'more';
type Operator = '+' | '−' | '×' | '÷';
type AngleMode = 'DEG' | 'RAD';
type HistoryItem = { id: string; expression: string; result: string; createdAt: number };

const themeNames: Record<Theme, { title: string; description: string }> = {
  white: { title: 'White', description: 'Pure white and crisp' },
  cream: { title: 'Cream', description: 'Warm, soft, and gently dim' },
  dark: { title: 'Dark', description: 'True dark for a quiet night' },
};

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

function formatNumber(value: number | string): string {
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numeric)) return 'Error';
  if (Math.abs(numeric) >= 1e12 || (Math.abs(numeric) > 0 && Math.abs(numeric) < 1e-8)) {
    return numeric.toExponential(6).replace(/\.?0+e/, 'e');
  }
  return Number(numeric.toFixed(10)).toString();
}

function calculate(a: number, b: number, operator: Operator): number {
  if (operator === '+') return a + b;
  if (operator === '−') return a - b;
  if (operator === '×') return a * b;
  return b === 0 ? Number.NaN : a / b;
}

function evaluateScientificExpression(source: string, angleMode: AngleMode): number {
  const tokens: { kind: 'number' | 'identifier' | 'operator' | 'left' | 'right' | 'postfix'; value: string }[] = [];
  let index = 0;

  while (index < source.length) {
    const character = source[index];
    if (/\s/.test(character)) {
      index += 1;
      continue;
    }
    const numberMatch = source.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
    if (numberMatch) {
      tokens.push({ kind: 'number', value: numberMatch[0] });
      index += numberMatch[0].length;
      continue;
    }
    if (/[a-zA-Z]/.test(character) || character === 'π') {
      const identifierMatch = source.slice(index).match(/^[a-zA-Z]+|^π/);
      if (!identifierMatch) throw new Error('Invalid symbol');
      tokens.push({ kind: 'identifier', value: identifierMatch[0] });
      index += identifierMatch[0].length;
      continue;
    }
    if (character === '(') {
      tokens.push({ kind: 'left', value: character });
      index += 1;
      continue;
    }
    if (character === ')') {
      tokens.push({ kind: 'right', value: character });
      index += 1;
      continue;
    }
    if (character === '!' || character === '%') {
      tokens.push({ kind: 'postfix', value: character });
      index += 1;
      continue;
    }
    if ('+-−×÷*/^'.includes(character)) {
      tokens.push({ kind: 'operator', value: character === '−' ? '-' : character === '×' ? '*' : character === '÷' ? '/' : character });
      index += 1;
      continue;
    }
    throw new Error('Invalid symbol');
  }

  let position = 0;
  const peek = () => tokens[position];
  const consume = () => tokens[position++];
  const startsPrimary = (token: typeof tokens[number] | undefined) =>
    token?.kind === 'number' || token?.kind === 'identifier' || token?.kind === 'left';

  const parseExpression = (): number => parseAddSubtract();

  const parseAddSubtract = (): number => {
    let value = parseMultiplyDivide();
    while (peek()?.kind === 'operator' && (peek()?.value === '+' || peek()?.value === '-')) {
      const operator = consume()?.value;
      const right = parseMultiplyDivide();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  };

  const parseMultiplyDivide = (): number => {
    let value = parseUnary();
    while (peek()?.kind === 'operator' && (peek()?.value === '*' || peek()?.value === '/') || startsPrimary(peek())) {
      if (startsPrimary(peek())) {
        value *= parseUnary();
        continue;
      }
      const operator = consume()?.value;
      const right = parseUnary();
      if (operator === '/' && right === 0) return Number.NaN;
      value = operator === '*' ? value * right : value / right;
    }
    return value;
  };

  const parseUnary = (): number => {
    if (peek()?.kind === 'operator' && (peek()?.value === '+' || peek()?.value === '-')) {
      const operator = consume()?.value;
      const value = parseUnary();
      return operator === '-' ? -value : value;
    }
    return parsePower();
  };

  const parsePower = (): number => {
    const value = parsePostfix();
    if (peek()?.kind === 'operator' && peek()?.value === '^') {
      consume();
      return Math.pow(value, parseUnary());
    }
    return value;
  };

  const parsePostfix = (): number => {
    let value = parsePrimary();
    while (peek()?.kind === 'postfix') {
      const postfix = consume()?.value;
      if (postfix === '%') {
        value /= 100;
      } else {
        if (value < 0 || !Number.isInteger(value) || value > 170) return Number.NaN;
        let factorial = 1;
        for (let factorialIndex = 2; factorialIndex <= value; factorialIndex += 1) factorial *= factorialIndex;
        value = factorial;
      }
    }
    return value;
  };

  const parsePrimary = (): number => {
    const token = consume();
    if (!token) throw new Error('Incomplete expression');
    if (token.kind === 'number') return Number(token.value);
    if (token.kind === 'left') {
      const value = parseExpression();
      if (consume()?.kind !== 'right') throw new Error('Missing parenthesis');
      return value;
    }
    if (token.kind !== 'identifier') throw new Error('Expected a value');
    if (token.value === 'π') return Math.PI;
    if (token.value === 'e') return Math.E;
    if (token.value !== 'sin' && token.value !== 'cos' && token.value !== 'tan' && token.value !== 'log' && token.value !== 'ln' && token.value !== 'sqrt') {
      throw new Error('Unknown function');
    }
    if (consume()?.kind !== 'left') throw new Error('Missing parenthesis');
    const argument = parseExpression();
    if (consume()?.kind !== 'right') throw new Error('Missing parenthesis');
    if (token.value === 'sqrt') return Math.sqrt(argument);
    if (token.value === 'log') return Math.log10(argument);
    if (token.value === 'ln') return Math.log(argument);
    const angle = angleMode === 'DEG' ? argument * Math.PI / 180 : argument;
    if (token.value === 'sin') return Math.sin(angle);
    if (token.value === 'cos') return Math.cos(angle);
    return Math.tan(angle);
  };

  if (tokens.length === 0) throw new Error('Empty expression');
  const result = parseExpression();
  if (position !== tokens.length) throw new Error('Unexpected value');
  return Number.isFinite(result) ? result : Number.NaN;
}

function scientificPreview(source: string, angleMode: AngleMode): string {
  if (!source) return '0';
  if (!/[+\-×÷^(]$/.test(source)) {
    try {
      return formatNumber(evaluateScientificExpression(source, angleMode));
    } catch {
      // Keep showing the last value while the expression is incomplete.
    }
  }
  const currentToken = source.match(/(?:\d+(?:\.\d*)?|\.\d+|π|e)$/)?.[0];
  if (!currentToken) return '0';
  if (currentToken === 'π') return formatNumber(Math.PI);
  if (currentToken === 'e') return formatNumber(Math.E);
  return currentToken;
}

function readTheme(): Theme {
  const saved = readStorage<string>('calculator-theme', 'cream');
  if (saved === 'dark' || saved === 'white' || saved === 'cream') return saved;
  if (saved === 'light') return 'white';
  return 'cream';
}

export function CalculatorApp() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [history, setHistory] = useState<HistoryItem[]>(() => readStorage<HistoryItem[]>('calculator-history', []));
  const [tab, setTab] = useState<Tab>('calculator');
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [storedValue, setStoredValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [scientificMode, setScientificMode] = useState(false);
  const [angleMode, setAngleMode] = useState<AngleMode>('DEG');
  const [scientificExpression, setScientificExpression] = useState('');
  const [scientificJustEvaluated, setScientificJustEvaluated] = useState(false);
  const [soundOn, setSoundOn] = useState(() => readStorage<boolean>('calculator-sounds', false));
  const [keyboardShortcutsOn, setKeyboardShortcutsOn] = useState(() => readStorage<boolean>('calculator-keyboard', true));
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    document.documentElement.dataset['theme'] = theme;
    localStorage.setItem('calculator-theme', JSON.stringify(theme));
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('calculator-history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('calculator-sounds', JSON.stringify(soundOn));
  }, [soundOn]);

  useEffect(() => {
    localStorage.setItem('calculator-keyboard', JSON.stringify(keyboardShortcutsOn));
  }, [keyboardShortcutsOn]);

  const playClick = useCallback(() => {
    if (!soundOn) return;
    const AudioContextClass = window.AudioContext
      ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.04, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.045);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.05);
    oscillator.addEventListener('ended', () => void context.close());
  }, [soundOn]);

  const reset = useCallback(() => {
    setDisplay('0');
    setExpression('');
    setStoredValue(null);
    setOperator(null);
    setWaitingForOperand(false);
    setScientificExpression('');
    setScientificJustEvaluated(false);
  }, []);

  const commitScientificExpression = useCallback((nextExpression: string) => {
    setScientificExpression(nextExpression);
    setExpression(nextExpression);
    setDisplay(scientificPreview(nextExpression, angleMode));
    setScientificJustEvaluated(false);
  }, [angleMode]);

  const inputScientificDigit = useCallback((digit: string) => {
    const base = scientificJustEvaluated ? '' : scientificExpression;
    const separator = /(?:\)|π|e)$/.test(base) ? '×' : '';
    commitScientificExpression(`${base}${separator}${digit}`);
  }, [commitScientificExpression, scientificExpression, scientificJustEvaluated]);

  const inputScientificDecimal = useCallback(() => {
    const base = scientificJustEvaluated ? '' : scientificExpression;
    const currentNumber = base.match(/(?:\d+(?:\.\d*)?|\.\d+)$/)?.[0] ?? '';
    if (currentNumber.includes('.')) return;
    const next = !base || /[+\-×÷^(\u00d7\u00f7]$/.test(base) ? `${base}0.` : `${base}.`;
    commitScientificExpression(next);
  }, [commitScientificExpression, scientificExpression, scientificJustEvaluated]);

  const chooseScientificOperator = useCallback((nextOperator: string) => {
    const base = scientificJustEvaluated ? display : scientificExpression;
    if (!base && nextOperator !== '-') return;
    const next = base.replace(/[+\-×÷^]$/, '');
    commitScientificExpression(`${next}${nextOperator}`);
  }, [commitScientificExpression, display, scientificExpression, scientificJustEvaluated]);

  const inputScientificFunction = useCallback((functionName: string) => {
    const base = scientificJustEvaluated ? '' : scientificExpression;
    if (/^(?:\d+(?:\.\d*)?|\.\d+|π|e)$/.test(base)) {
      commitScientificExpression(`${functionName}(${base})`);
      return;
    }
    const separator = /(?:\d|π|e|\))$/.test(base) ? '×' : '';
    commitScientificExpression(`${base}${separator}${functionName}(`);
  }, [commitScientificExpression, scientificExpression, scientificJustEvaluated]);

  const inputScientificParenthesis = useCallback((parenthesis: '(' | ')') => {
    const base = scientificJustEvaluated ? '' : scientificExpression;
    if (parenthesis === '(') {
      const separator = /(?:\d|π|e|\))$/.test(base) ? '×' : '';
      commitScientificExpression(`${base}${separator}(`);
      return;
    }
    const openCount = (base.match(/\(/g) ?? []).length;
    const closeCount = (base.match(/\)/g) ?? []).length;
    if (openCount <= closeCount || /[+\-×÷^(]$/.test(base)) return;
    commitScientificExpression(`${base})`);
  }, [commitScientificExpression, scientificExpression, scientificJustEvaluated]);

  const inputScientificConstant = useCallback((constant: 'π' | 'e') => {
    const base = scientificJustEvaluated ? '' : scientificExpression;
    const separator = /(?:\d|π|e|\))$/.test(base) ? '×' : '';
    commitScientificExpression(`${base}${separator}${constant}`);
  }, [commitScientificExpression, scientificExpression, scientificJustEvaluated]);

  const inputScientificPostfix = useCallback((postfix: '!' | '%') => {
    const base = scientificJustEvaluated ? display : scientificExpression;
    if (!base || /[+\-×÷^(]$/.test(base)) return;
    commitScientificExpression(`${base}${postfix}`);
  }, [commitScientificExpression, display, scientificExpression, scientificJustEvaluated]);

  const scientificEquals = useCallback(() => {
    const source = scientificExpression || display;
    if (!source || scientificJustEvaluated) return;
    try {
      const resultText = formatNumber(evaluateScientificExpression(source, angleMode));
      setDisplay(resultText);
      setExpression(source);
      setScientificExpression(source);
      setScientificJustEvaluated(true);
      if (resultText !== 'Error') {
        setHistory((current) => [
          { id: `${Date.now()}-${Math.random()}`, expression: source, result: resultText, createdAt: Date.now() },
          ...current,
        ].slice(0, 40));
      }
    } catch {
      setDisplay('Error');
      setExpression(source);
      setScientificJustEvaluated(true);
    }
  }, [angleMode, display, scientificExpression, scientificJustEvaluated]);

  const inputDigit = useCallback((digit: string) => {
    if (scientificMode) {
      inputScientificDigit(digit);
      return;
    }
    setDisplay((current) => {
      if (current === 'Error') return digit;
      if (waitingForOperand) return digit;
      if (current === '0') return digit;
      return current.length < 18 ? current + digit : current;
    });
    if (waitingForOperand) setWaitingForOperand(false);
  }, [inputScientificDigit, scientificMode, waitingForOperand]);

  const inputDecimal = useCallback(() => {
    if (scientificMode) {
      inputScientificDecimal();
      return;
    }
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    setDisplay((current) => current.includes('.') ? current : `${current}.`);
  }, [inputScientificDecimal, scientificMode, waitingForOperand]);

  const chooseOperator = useCallback((nextOperator: Operator) => {
    if (scientificMode) {
      chooseScientificOperator(nextOperator);
      return;
    }
    const inputValue = Number(display);
    if (!Number.isFinite(inputValue)) {
      reset();
      return;
    }
    if (storedValue === null) {
      setStoredValue(inputValue);
      setOperator(nextOperator);
      setExpression(`${formatNumber(inputValue)} ${nextOperator}`);
      setWaitingForOperand(true);
      return;
    }
    if (operator && !waitingForOperand) {
      const result = calculate(storedValue, inputValue, operator);
      const nextDisplay = formatNumber(result);
      setDisplay(nextDisplay);
      setStoredValue(result);
      setExpression(`${nextDisplay} ${nextOperator}`);
      setOperator(nextOperator);
      setWaitingForOperand(true);
      return;
    }
    setOperator(nextOperator);
    setExpression(`${formatNumber(storedValue)} ${nextOperator}`);
    setWaitingForOperand(true);
  }, [chooseScientificOperator, display, operator, reset, scientificMode, storedValue, waitingForOperand]);

  const equals = useCallback(() => {
    if (scientificMode) {
      scientificEquals();
      return;
    }
    if (storedValue === null || operator === null || waitingForOperand) return;
    const rightSide = Number(display);
    const result = calculate(storedValue, rightSide, operator);
    const fullExpression = `${formatNumber(storedValue)} ${operator} ${formatNumber(rightSide)}`;
    const resultText = formatNumber(result);
    setDisplay(resultText);
    setExpression(fullExpression);
    setStoredValue(null);
    setOperator(null);
    setWaitingForOperand(true);
    if (resultText !== 'Error') {
      setHistory((current) => [
        { id: `${Date.now()}-${Math.random()}`, expression: fullExpression, result: resultText, createdAt: Date.now() },
        ...current,
      ].slice(0, 40));
    }
  }, [display, operator, scientificEquals, scientificMode, storedValue, waitingForOperand]);

  const toggleSign = useCallback(() => {
    if (scientificMode) {
      if (scientificJustEvaluated) {
        const nextDisplay = display.startsWith('-') ? display.slice(1) : `-${display}`;
        setDisplay(nextDisplay);
        setExpression(nextDisplay);
        setScientificExpression(nextDisplay);
        setScientificJustEvaluated(false);
        return;
      }
      const base = scientificExpression;
      const currentNumber = base.match(/(?:\d+(?:\.\d*)?|\.\d+|π|e)$/)?.[0];
      if (!currentNumber) return;
      const replacement = currentNumber.startsWith('-') ? currentNumber.slice(1) : `-${currentNumber}`;
      commitScientificExpression(`${base.slice(0, -currentNumber.length)}${replacement}`);
      return;
    }
    if (display === '0' || display === 'Error') return;
    setDisplay((current) => current.startsWith('-') ? current.slice(1) : `-${current}`);
  }, [commitScientificExpression, display, scientificExpression, scientificJustEvaluated, scientificMode]);

  const percent = useCallback(() => {
    if (scientificMode) {
      inputScientificPostfix('%');
      return;
    }
    if (display === 'Error') return;
    setDisplay(formatNumber(Number(display) / 100));
  }, [display, inputScientificPostfix, scientificMode]);

  const backspace = useCallback(() => {
    if (scientificMode) {
      if (scientificJustEvaluated) {
        const nextDisplay = display.length > 1 ? display.slice(0, -1) : '0';
        setDisplay(nextDisplay);
        setExpression('');
        setScientificExpression(nextDisplay === '0' ? '' : nextDisplay);
        setScientificJustEvaluated(false);
        return;
      }
      commitScientificExpression(scientificExpression.slice(0, -1));
      return;
    }
    setWaitingForOperand(false);
    setDisplay((current) => {
      if (current === 'Error' || current.length <= 1 || (current.length === 2 && current.startsWith('-'))) return '0';
      return current.slice(0, -1);
    });
  }, [commitScientificExpression, display, scientificExpression, scientificJustEvaluated, scientificMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!keyboardShortcutsOn) return;
      const { key } = event;
      if (/^\d$/.test(key)) { inputDigit(key); return; }
      if (key === '.') { inputDecimal(); return; }
      if (key === 'Enter' || key === '=') { event.preventDefault(); equals(); return; }
      if (key === 'Escape' || key.toLowerCase() === 'c') { reset(); return; }
      if (key === 'Backspace' || key === 'Delete') { event.preventDefault(); backspace(); return; }
      if (key === '%') { percent(); return; }
      if (scientificMode && key === '^') { event.preventDefault(); chooseScientificOperator('^'); return; }
      const operators: Record<string, Operator> = { '+': '+', '-': '−', '*': '×', '/': '÷' };
      if (operators[key]) { event.preventDefault(); chooseOperator(operators[key]); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [backspace, chooseOperator, chooseScientificOperator, equals, inputDecimal, inputDigit, keyboardShortcutsOn, percent, reset, scientificMode]);

  const changeTheme = (nextTheme: Theme) => setTheme(nextTheme);
  const clearHistory = () => { setHistory([]); setConfirmClear(false); };
  const selectHistory = (item: HistoryItem) => {
    setDisplay(item.result);
    setExpression(item.expression);
    setWaitingForOperand(true);
    setTab('calculator');
  };

  const navItems = useMemo(() => [
    { id: 'calculator' as Tab, label: 'Calculator', icon: CalculatorMark },
    { id: 'history' as Tab, label: 'History', icon: HistoryIcon },
    { id: 'theme' as Tab, label: 'Theme', icon: Palette },
    { id: 'more' as Tab, label: 'More', icon: MoreHorizontal },
  ], []);

  const buttons: { label: string; action: () => void; kind?: string; testId: string }[] = [
    { label: 'C', action: reset, kind: 'utility', testId: 'button-clear' },
    { label: '+/−', action: toggleSign, kind: 'utility small-symbol', testId: 'button-toggle-sign' },
    { label: '%', action: percent, kind: 'utility', testId: 'button-percent' },
    { label: '÷', action: () => chooseOperator('÷'), kind: 'operator', testId: 'button-divide' },
    { label: '7', action: () => inputDigit('7'), testId: 'button-digit-7' },
    { label: '8', action: () => inputDigit('8'), testId: 'button-digit-8' },
    { label: '9', action: () => inputDigit('9'), testId: 'button-digit-9' },
    { label: '×', action: () => chooseOperator('×'), kind: 'operator', testId: 'button-multiply' },
    { label: '4', action: () => inputDigit('4'), testId: 'button-digit-4' },
    { label: '5', action: () => inputDigit('5'), testId: 'button-digit-5' },
    { label: '6', action: () => inputDigit('6'), testId: 'button-digit-6' },
    { label: '−', action: () => chooseOperator('−'), kind: 'operator', testId: 'button-subtract' },
    { label: '1', action: () => inputDigit('1'), testId: 'button-digit-1' },
    { label: '2', action: () => inputDigit('2'), testId: 'button-digit-2' },
    { label: '3', action: () => inputDigit('3'), testId: 'button-digit-3' },
    { label: '+', action: () => chooseOperator('+'), kind: 'operator', testId: 'button-add' },
    { label: '0', action: () => inputDigit('0'), kind: 'zero', testId: 'button-digit-0' },
    { label: '.', action: inputDecimal, testId: 'button-decimal' },
    { label: '=', action: equals, kind: 'equals', testId: 'button-equals' },
  ];

  const scientificButtons: { label: string; action: () => void; kind?: string; testId: string; ariaLabel?: string }[] = [
    { label: 'sin', action: () => inputScientificFunction('sin'), kind: 'utility small-symbol', testId: 'button-scientific-sin' },
    { label: 'cos', action: () => inputScientificFunction('cos'), kind: 'utility small-symbol', testId: 'button-scientific-cos' },
    { label: 'tan', action: () => inputScientificFunction('tan'), kind: 'utility small-symbol', testId: 'button-scientific-tan' },
    { label: 'log', action: () => inputScientificFunction('log'), kind: 'utility small-symbol', testId: 'button-scientific-log' },
    { label: 'ln', action: () => inputScientificFunction('ln'), kind: 'utility small-symbol', testId: 'button-scientific-ln' },
    { label: '√', action: () => inputScientificFunction('sqrt'), kind: 'utility', testId: 'button-scientific-sqrt' },
    { label: 'x²', action: () => { const base = scientificJustEvaluated ? display : scientificExpression; if (base && !/[+\-×÷^(]$/.test(base)) commitScientificExpression(`${base}^2`); }, kind: 'utility small-symbol', testId: 'button-scientific-square' },
    { label: 'xʸ', action: () => chooseScientificOperator('^'), kind: 'utility small-symbol', testId: 'button-scientific-power' },
    { label: 'π', action: () => inputScientificConstant('π'), kind: 'utility', testId: 'button-scientific-pi' },
    { label: 'e', action: () => inputScientificConstant('e'), kind: 'utility', testId: 'button-scientific-e' },
    { label: '%', action: () => inputScientificPostfix('%'), kind: 'utility', testId: 'button-scientific-percent' },
    { label: '!', action: () => inputScientificPostfix('!'), kind: 'utility', testId: 'button-scientific-factorial' },
    { label: '(', action: () => inputScientificParenthesis('('), kind: 'utility', testId: 'button-scientific-open-parenthesis' },
    { label: ')', action: () => inputScientificParenthesis(')'), kind: 'utility', testId: 'button-scientific-close-parenthesis' },
    { label: 'DEG/RAD', action: () => setAngleMode((current) => current === 'DEG' ? 'RAD' : 'DEG'), kind: 'utility small-symbol', testId: 'button-scientific-angle-mode', ariaLabel: `Toggle angle mode, currently ${angleMode}` },
  ];

  const toggleScientificMode = () => {
    setScientificMode((current) => {
      reset();
      return !current;
    });
  };

  const resultLengthClass = display.length > 15
    ? 'result-compact'
    : display.length > 11
      ? 'result-small'
      : display.length > 8
        ? 'result-medium'
        : display.length > 6
          ? 'result-large'
          : '';

  return (
    <main className="app-frame">
      <section className="calculator-shell" aria-label="Calculator">
        <header className="topbar">
          <div className="brand-copy">
            <strong>Small steps</strong>
            <span>Big results</span>
          </div>
          <div className="top-actions">
            <button type="button" className="icon-button" aria-label="Open settings" data-testid="button-open-settings" onClick={() => setTab('more')}><Settings size={23} /></button>
          </div>
        </header>

        {tab === 'calculator' && (
          <>
            <div className="display" aria-live="polite">
              <div className={`display-illustration ${resultLengthClass ? 'behind-long-result' : ''}`} aria-hidden="true">
                <Sprout className="display-sprout" size={66} strokeWidth={1.55} />
                <Cat className="display-cat" size={76} strokeWidth={1.7} />
              </div>
              <div className="expression" data-testid="text-expression">{expression || ' '}</div>
              <div className={`result ${resultLengthClass}`} data-testid="text-result">{display}</div>
            </div>
              <div className="calculator-controls">
                <div className="mode-control">
                  <span>Scientific mode</span>
                  <button type="button" className={`switch ${scientificMode ? 'on' : ''}`} aria-label="Toggle Scientific Mode" aria-pressed={scientificMode} data-testid="switch-scientific-mode" onClick={() => { playClick(); toggleScientificMode(); }} />
                </div>
                <button type="button" className="backspace-key" aria-label="Backspace" data-testid="button-backspace" onClick={() => { playClick(); backspace(); }}>⌫</button>
              </div>
              {scientificMode && (
                <div className="scientific-keypad" role="group" aria-label="Scientific calculator keypad">
                  {scientificButtons.map((button) => (
                    <button type="button" key={button.testId} className={`key ${button.kind ?? ''}`} aria-label={button.ariaLabel} data-testid={button.testId} onClick={() => { playClick(); button.action(); }}>{button.label === 'DEG/RAD' ? `${button.label} (${angleMode})` : button.label}</button>
                  ))}
                </div>
              )}
            <div className="keypad" role="group" aria-label="Calculator keypad">
              {buttons.map((button) => (
                <button type="button" key={button.testId} className={`key ${button.kind ?? ''}`} data-testid={button.testId} onClick={() => { playClick(); button.action(); }}>{button.label}</button>
              ))}
            </div>
          </>
        )}

        {tab === 'history' && (
          <section className="panel" aria-labelledby="history-heading">
            <div className="panel-heading">
              <div><h1 id="history-heading">Your history</h1><p>Little wins, saved for later.</p></div>
              {history.length > 0 && <button type="button" className="text-button" data-testid="button-clear-history" onClick={() => setConfirmClear(true)}>Clear all</button>}
            </div>
            {history.length > 0 ? (
              <div className="history-list" data-testid="list-history">
                {history.map((item) => (
                  <button type="button" className="history-row" key={item.id} data-testid={`history-item-${item.id}`} onClick={() => selectHistory(item)}>
                    <span className="history-expression">{item.expression.replace(/\s+/g, '')}=<strong className="history-result">{item.result}</strong></span>
                    <span className="history-date">{new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state" data-testid="empty-history"><div><RotateCcw /><strong>No calculations yet</strong><p>Your finished calculations will settle here.</p></div></div>
            )}
            {confirmClear && (
              <div className="confirm-card" role="alertdialog" aria-label="Confirm clear history">
                <p>Clear every saved calculation?</p>
                <div className="confirm-actions">
                  <button type="button" data-testid="button-cancel-clear-history" onClick={() => setConfirmClear(false)}>Keep them</button>
                  <button type="button" className="danger" data-testid="button-confirm-clear-history" onClick={clearHistory}>Clear history</button>
                </div>
              </div>
            )}
          </section>
        )}

        {tab === 'theme' && (
          <section className="panel" aria-labelledby="theme-heading">
            <div className="panel-heading"><div><h1 id="theme-heading">Set the mood</h1><p>Choose a little atmosphere for your day.</p></div><Palette size={25} /></div>
            <div className="theme-grid">
              {(Object.keys(themeNames) as Theme[]).map((themeOption) => (
                <button type="button" className={`theme-card ${theme === themeOption ? 'selected' : ''}`} key={themeOption} data-testid={`button-theme-${themeOption}`} onClick={() => changeTheme(themeOption)}>
                  <span className={`swatch ${themeOption}`} />
                  <span><strong>{themeNames[themeOption].title}</strong><span>{themeNames[themeOption].description}</span></span>
                  {theme === themeOption && <Check className="check" size={22} />}
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === 'more' && (
          <section className="panel" aria-labelledby="settings-heading">
            <div className="panel-heading"><div><h1 id="settings-heading">A few settings</h1><p>Make this small tool feel like yours.</p></div><Settings size={25} /></div>
            <div className="settings">
              <div className="setting-row"><span className="setting-label"><strong>Key sounds</strong><span>A tiny cue with each tap</span></span><button type="button" className={`switch ${soundOn ? 'on' : ''}`} aria-label="Toggle key sounds" aria-pressed={soundOn} data-testid="switch-key-sounds" onClick={() => setSoundOn(!soundOn)} /></div>
              <div className="setting-row"><span className="setting-label"><strong>Keyboard shortcuts</strong><span>{keyboardShortcutsOn ? 'Numbers, operators, and Enter' : 'Keyboard input is off'}</span></span><button type="button" className={`switch ${keyboardShortcutsOn ? 'on' : ''}`} aria-label="Toggle keyboard shortcuts" aria-pressed={keyboardShortcutsOn} data-testid="switch-keyboard-shortcuts" onClick={() => setKeyboardShortcutsOn(!keyboardShortcutsOn)} /></div>
              <button type="button" className="setting-row" data-testid="button-saved-calculations" onClick={() => setTab('history')}><span className="setting-label"><strong>Saved calculations</strong><span>{history.length} {history.length === 1 ? 'calculation' : 'calculations'} on this device</span></span><Volume2 size={21} color="var(--operator)" /></button>
              <button type="button" className="setting-row" data-testid="button-settings-theme" onClick={() => setTab('theme')}><span className="setting-label"><strong>Appearance</strong><span>{themeNames[theme].title}</span></span><Palette size={21} color="var(--operator)" /></button>
            </div>
          </section>
        )}

        <nav className="bottom-nav" aria-label="Main navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button type="button" className={`nav-button ${tab === id ? 'active' : ''}`} key={id} data-testid={`nav-${id}`} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}><Icon /><span>{label}</span></button>
          ))}
        </nav>
      </section>
    </main>
  );
}
