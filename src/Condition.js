import has from 'lodash/has';
import isSchema from './util/isSchema';

function wrapCusomFn(fn) {
  return function() {
    let base = this;
    let schema = fn.apply(base, arguments);

    if (schema === undefined) return base;

    if (!isSchema(schema))
      throw new TypeError('conditions must return a schema object');

    let options = arguments[arguments.length - 1];

    return schema.resolve(options);
  };
}

function makePredicate(is) {
  if (typeof is === 'function') return is;

  if (isSchema(is))
    return function(...values) {
      let { options } = this;
      let schema = is.resolve(options);
      return values.every(value => schema.isValidSync(value, options));
    };

  return (...values) => values.every(value => value === is);
}

function makeCustomizer(branch) {
  if (typeof branch === 'function') return branch;
  if (!branch) return schema => schema;
  return (schema, options) => schema.concat(branch.resolve(options));
}

function makeFn(options) {
  if (typeof options === 'function') return wrapCusomFn(options);

  if (!has(options, 'is'))
    throw new TypeError('`is:` is required for `when()` conditions');

  if (!options.then && !options.otherwise)
    throw new TypeError(
      'either `then:` or `otherwise:` is required for `when()` conditions',
    );

  let { is, then, otherwise } = options;

  is = makePredicate(is);
  then = makeCustomizer(then);
  otherwise = makeCustomizer(otherwise);

  let fn = function(...values) {
    let options = values.pop();
    let schema = values.pop();
    let customizer = is.apply({ options }, values) ? then : otherwise;

    return customizer(schema, options);
  };

  return fn;
}

class Condition {
  constructor(refs, options) {
    this.refs = [].concat(refs);
    this.fn = makeFn(options);
  }

  resolve(schema, options) {
    let values = this.refs.map(ref => ref.getValue(options));

    schema = this.fn.apply(schema, values.concat(schema, options));

    return schema;
  }
}

export default Condition;
