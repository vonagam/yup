import { getter } from 'property-expr';

function makeBaseGetter(reference) {
  if (reference.isContext) return ({ context }) => context;
  if (reference.isSelf) return ({ value }) => value;
  if (reference.isParent) return ({ parent }) => parent;
  if (reference.isSibling)
    return ({ parent, context }) => parent || context || {};
}

function wrapGetter(base, ...wrappers) {
  return wrappers.reduce(
    (base, wrapper) => (wrapper ? options => wrapper(base(options)) : base),
    base,
  );
}

export default class Reference {
  constructor(key, mapFn, options = {}) {
    if (typeof key !== 'string')
      throw new TypeError("ref's must be strings, got: " + key);

    this.key = key.trim();
    this.contextPrefix = options.contextPrefix || '$';
    this.selfPrefix = options.selfPrefix || '.';

    this.isContext = this.key.indexOf(this.contextPrefix) === 0;
    this.isSelf = this.key.indexOf(this.selfPrefix) === 0;
    this.isParent = this.key === '';
    this.isSibling = !this.isContext && !this.isParent && !this.isSelf;

    this.prefix = this.isContext
      ? this.contextPrefix
      : this.isSelf
        ? this.selfPrefix
        : '';
    this.path = this.key.slice(this.prefix.length);

    this.getter = wrapGetter(
      makeBaseGetter(this),
      this.path && getter(this.path, true),
      mapFn,
    );
  }

  getValue(options) {
    return this.getter(options);
  }

  cast(value, options) {
    return this.getValue({ ...options, value });
  }

  resolve() {
    return this;
  }

  toString() {
    return `Ref(${this.key})`;
  }

  static isRef(value) {
    return value && value.__isYupRef;
  }
}

Reference.prototype.__isYupRef = true;
