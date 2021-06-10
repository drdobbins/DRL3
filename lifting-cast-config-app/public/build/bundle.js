
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                if (info.blocks[i] === block) {
                                    info.blocks[i] = null;
                                }
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.34.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /**
     * A function that always returns `false`. Any passed in parameters are ignored.
     *
     * @func
     * @memberOf R
     * @since v0.9.0
     * @category Function
     * @sig * -> Boolean
     * @param {*}
     * @return {Boolean}
     * @see R.T
     * @example
     *
     *      R.F(); //=> false
     */
    var F = function () {
      return false;
    };

    /**
     * A function that always returns `true`. Any passed in parameters are ignored.
     *
     * @func
     * @memberOf R
     * @since v0.9.0
     * @category Function
     * @sig * -> Boolean
     * @param {*}
     * @return {Boolean}
     * @see R.F
     * @example
     *
     *      R.T(); //=> true
     */
    var T = function () {
      return true;
    };

    /**
     * A special placeholder value used to specify "gaps" within curried functions,
     * allowing partial application of any combination of arguments, regardless of
     * their positions.
     *
     * If `g` is a curried ternary function and `_` is `R.__`, the following are
     * equivalent:
     *
     *   - `g(1, 2, 3)`
     *   - `g(_, 2, 3)(1)`
     *   - `g(_, _, 3)(1)(2)`
     *   - `g(_, _, 3)(1, 2)`
     *   - `g(_, 2, _)(1, 3)`
     *   - `g(_, 2)(1)(3)`
     *   - `g(_, 2)(1, 3)`
     *   - `g(_, 2)(_, 3)(1)`
     *
     * @name __
     * @constant
     * @memberOf R
     * @since v0.6.0
     * @category Function
     * @example
     *
     *      const greet = R.replace('{name}', R.__, 'Hello, {name}!');
     *      greet('Alice'); //=> 'Hello, Alice!'
     */
    var __ = {
      '@@functional/placeholder': true
    };

    function _isPlaceholder(a) {
      return a != null && typeof a === 'object' && a['@@functional/placeholder'] === true;
    }

    /**
     * Optimized internal one-arity curry function.
     *
     * @private
     * @category Function
     * @param {Function} fn The function to curry.
     * @return {Function} The curried function.
     */

    function _curry1(fn) {
      return function f1(a) {
        if (arguments.length === 0 || _isPlaceholder(a)) {
          return f1;
        } else {
          return fn.apply(this, arguments);
        }
      };
    }

    /**
     * Optimized internal two-arity curry function.
     *
     * @private
     * @category Function
     * @param {Function} fn The function to curry.
     * @return {Function} The curried function.
     */

    function _curry2(fn) {
      return function f2(a, b) {
        switch (arguments.length) {
          case 0:
            return f2;

          case 1:
            return _isPlaceholder(a) ? f2 : _curry1(function (_b) {
              return fn(a, _b);
            });

          default:
            return _isPlaceholder(a) && _isPlaceholder(b) ? f2 : _isPlaceholder(a) ? _curry1(function (_a) {
              return fn(_a, b);
            }) : _isPlaceholder(b) ? _curry1(function (_b) {
              return fn(a, _b);
            }) : fn(a, b);
        }
      };
    }

    /**
     * Adds two values.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Math
     * @sig Number -> Number -> Number
     * @param {Number} a
     * @param {Number} b
     * @return {Number}
     * @see R.subtract
     * @example
     *
     *      R.add(2, 3);       //=>  5
     *      R.add(7)(10);      //=> 17
     */

    var add =
    /*#__PURE__*/
    _curry2(function add(a, b) {
      return Number(a) + Number(b);
    });

    /**
     * Private `concat` function to merge two array-like objects.
     *
     * @private
     * @param {Array|Arguments} [set1=[]] An array-like object.
     * @param {Array|Arguments} [set2=[]] An array-like object.
     * @return {Array} A new, merged array.
     * @example
     *
     *      _concat([4, 5, 6], [1, 2, 3]); //=> [4, 5, 6, 1, 2, 3]
     */
    function _concat(set1, set2) {
      set1 = set1 || [];
      set2 = set2 || [];
      var idx;
      var len1 = set1.length;
      var len2 = set2.length;
      var result = [];
      idx = 0;

      while (idx < len1) {
        result[result.length] = set1[idx];
        idx += 1;
      }

      idx = 0;

      while (idx < len2) {
        result[result.length] = set2[idx];
        idx += 1;
      }

      return result;
    }

    function _arity(n, fn) {
      /* eslint-disable no-unused-vars */
      switch (n) {
        case 0:
          return function () {
            return fn.apply(this, arguments);
          };

        case 1:
          return function (a0) {
            return fn.apply(this, arguments);
          };

        case 2:
          return function (a0, a1) {
            return fn.apply(this, arguments);
          };

        case 3:
          return function (a0, a1, a2) {
            return fn.apply(this, arguments);
          };

        case 4:
          return function (a0, a1, a2, a3) {
            return fn.apply(this, arguments);
          };

        case 5:
          return function (a0, a1, a2, a3, a4) {
            return fn.apply(this, arguments);
          };

        case 6:
          return function (a0, a1, a2, a3, a4, a5) {
            return fn.apply(this, arguments);
          };

        case 7:
          return function (a0, a1, a2, a3, a4, a5, a6) {
            return fn.apply(this, arguments);
          };

        case 8:
          return function (a0, a1, a2, a3, a4, a5, a6, a7) {
            return fn.apply(this, arguments);
          };

        case 9:
          return function (a0, a1, a2, a3, a4, a5, a6, a7, a8) {
            return fn.apply(this, arguments);
          };

        case 10:
          return function (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            return fn.apply(this, arguments);
          };

        default:
          throw new Error('First argument to _arity must be a non-negative integer no greater than ten');
      }
    }

    /**
     * Internal curryN function.
     *
     * @private
     * @category Function
     * @param {Number} length The arity of the curried function.
     * @param {Array} received An array of arguments received thus far.
     * @param {Function} fn The function to curry.
     * @return {Function} The curried function.
     */

    function _curryN(length, received, fn) {
      return function () {
        var combined = [];
        var argsIdx = 0;
        var left = length;
        var combinedIdx = 0;

        while (combinedIdx < received.length || argsIdx < arguments.length) {
          var result;

          if (combinedIdx < received.length && (!_isPlaceholder(received[combinedIdx]) || argsIdx >= arguments.length)) {
            result = received[combinedIdx];
          } else {
            result = arguments[argsIdx];
            argsIdx += 1;
          }

          combined[combinedIdx] = result;

          if (!_isPlaceholder(result)) {
            left -= 1;
          }

          combinedIdx += 1;
        }

        return left <= 0 ? fn.apply(this, combined) : _arity(left, _curryN(length, combined, fn));
      };
    }

    /**
     * Returns a curried equivalent of the provided function, with the specified
     * arity. The curried function has two unusual capabilities. First, its
     * arguments needn't be provided one at a time. If `g` is `R.curryN(3, f)`, the
     * following are equivalent:
     *
     *   - `g(1)(2)(3)`
     *   - `g(1)(2, 3)`
     *   - `g(1, 2)(3)`
     *   - `g(1, 2, 3)`
     *
     * Secondly, the special placeholder value [`R.__`](#__) may be used to specify
     * "gaps", allowing partial application of any combination of arguments,
     * regardless of their positions. If `g` is as above and `_` is [`R.__`](#__),
     * the following are equivalent:
     *
     *   - `g(1, 2, 3)`
     *   - `g(_, 2, 3)(1)`
     *   - `g(_, _, 3)(1)(2)`
     *   - `g(_, _, 3)(1, 2)`
     *   - `g(_, 2)(1)(3)`
     *   - `g(_, 2)(1, 3)`
     *   - `g(_, 2)(_, 3)(1)`
     *
     * @func
     * @memberOf R
     * @since v0.5.0
     * @category Function
     * @sig Number -> (* -> a) -> (* -> a)
     * @param {Number} length The arity for the returned function.
     * @param {Function} fn The function to curry.
     * @return {Function} A new, curried function.
     * @see R.curry
     * @example
     *
     *      const sumArgs = (...args) => R.sum(args);
     *
     *      const curriedAddFourNumbers = R.curryN(4, sumArgs);
     *      const f = curriedAddFourNumbers(1, 2);
     *      const g = f(3);
     *      g(4); //=> 10
     */

    var curryN =
    /*#__PURE__*/
    _curry2(function curryN(length, fn) {
      if (length === 1) {
        return _curry1(fn);
      }

      return _arity(length, _curryN(length, [], fn));
    });

    /**
     * Creates a new list iteration function from an existing one by adding two new
     * parameters to its callback function: the current index, and the entire list.
     *
     * This would turn, for instance, [`R.map`](#map) function into one that
     * more closely resembles `Array.prototype.map`. Note that this will only work
     * for functions in which the iteration callback function is the first
     * parameter, and where the list is the last parameter. (This latter might be
     * unimportant if the list parameter is not used.)
     *
     * @func
     * @memberOf R
     * @since v0.15.0
     * @category Function
     * @category List
     * @sig ((a ... -> b) ... -> [a] -> *) -> ((a ..., Int, [a] -> b) ... -> [a] -> *)
     * @param {Function} fn A list iteration function that does not pass index or list to its callback
     * @return {Function} An altered list iteration function that passes (item, index, list) to its callback
     * @example
     *
     *      const mapIndexed = R.addIndex(R.map);
     *      mapIndexed((val, idx) => idx + '-' + val, ['f', 'o', 'o', 'b', 'a', 'r']);
     *      //=> ['0-f', '1-o', '2-o', '3-b', '4-a', '5-r']
     */

    var addIndex =
    /*#__PURE__*/
    _curry1(function addIndex(fn) {
      return curryN(fn.length, function () {
        var idx = 0;
        var origFn = arguments[0];
        var list = arguments[arguments.length - 1];
        var args = Array.prototype.slice.call(arguments, 0);

        args[0] = function () {
          var result = origFn.apply(this, _concat(arguments, [idx, list]));
          idx += 1;
          return result;
        };

        return fn.apply(this, args);
      });
    });

    /**
     * Optimized internal three-arity curry function.
     *
     * @private
     * @category Function
     * @param {Function} fn The function to curry.
     * @return {Function} The curried function.
     */

    function _curry3(fn) {
      return function f3(a, b, c) {
        switch (arguments.length) {
          case 0:
            return f3;

          case 1:
            return _isPlaceholder(a) ? f3 : _curry2(function (_b, _c) {
              return fn(a, _b, _c);
            });

          case 2:
            return _isPlaceholder(a) && _isPlaceholder(b) ? f3 : _isPlaceholder(a) ? _curry2(function (_a, _c) {
              return fn(_a, b, _c);
            }) : _isPlaceholder(b) ? _curry2(function (_b, _c) {
              return fn(a, _b, _c);
            }) : _curry1(function (_c) {
              return fn(a, b, _c);
            });

          default:
            return _isPlaceholder(a) && _isPlaceholder(b) && _isPlaceholder(c) ? f3 : _isPlaceholder(a) && _isPlaceholder(b) ? _curry2(function (_a, _b) {
              return fn(_a, _b, c);
            }) : _isPlaceholder(a) && _isPlaceholder(c) ? _curry2(function (_a, _c) {
              return fn(_a, b, _c);
            }) : _isPlaceholder(b) && _isPlaceholder(c) ? _curry2(function (_b, _c) {
              return fn(a, _b, _c);
            }) : _isPlaceholder(a) ? _curry1(function (_a) {
              return fn(_a, b, c);
            }) : _isPlaceholder(b) ? _curry1(function (_b) {
              return fn(a, _b, c);
            }) : _isPlaceholder(c) ? _curry1(function (_c) {
              return fn(a, b, _c);
            }) : fn(a, b, c);
        }
      };
    }

    /**
     * Applies a function to the value at the given index of an array, returning a
     * new copy of the array with the element at the given index replaced with the
     * result of the function application.
     *
     * @func
     * @memberOf R
     * @since v0.14.0
     * @category List
     * @sig Number -> (a -> a) -> [a] -> [a]
     * @param {Number} idx The index.
     * @param {Function} fn The function to apply.
     * @param {Array|Arguments} list An array-like object whose value
     *        at the supplied index will be replaced.
     * @return {Array} A copy of the supplied array-like object with
     *         the element at index `idx` replaced with the value
     *         returned by applying `fn` to the existing element.
     * @see R.update
     * @example
     *
     *      R.adjust(1, R.toUpper, ['a', 'b', 'c', 'd']);      //=> ['a', 'B', 'c', 'd']
     *      R.adjust(-1, R.toUpper, ['a', 'b', 'c', 'd']);     //=> ['a', 'b', 'c', 'D']
     * @symb R.adjust(-1, f, [a, b]) = [a, f(b)]
     * @symb R.adjust(0, f, [a, b]) = [f(a), b]
     */

    var adjust =
    /*#__PURE__*/
    _curry3(function adjust(idx, fn, list) {
      if (idx >= list.length || idx < -list.length) {
        return list;
      }

      var start = idx < 0 ? list.length : 0;

      var _idx = start + idx;

      var _list = _concat(list);

      _list[_idx] = fn(list[_idx]);
      return _list;
    });

    /**
     * Tests whether or not an object is an array.
     *
     * @private
     * @param {*} val The object to test.
     * @return {Boolean} `true` if `val` is an array, `false` otherwise.
     * @example
     *
     *      _isArray([]); //=> true
     *      _isArray(null); //=> false
     *      _isArray({}); //=> false
     */
    var _isArray = Array.isArray || function _isArray(val) {
      return val != null && val.length >= 0 && Object.prototype.toString.call(val) === '[object Array]';
    };

    function _isTransformer(obj) {
      return obj != null && typeof obj['@@transducer/step'] === 'function';
    }

    /**
     * Returns a function that dispatches with different strategies based on the
     * object in list position (last argument). If it is an array, executes [fn].
     * Otherwise, if it has a function with one of the given method names, it will
     * execute that function (functor case). Otherwise, if it is a transformer,
     * uses transducer [xf] to return a new transformer (transducer case).
     * Otherwise, it will default to executing [fn].
     *
     * @private
     * @param {Array} methodNames properties to check for a custom implementation
     * @param {Function} xf transducer to initialize if object is transformer
     * @param {Function} fn default ramda implementation
     * @return {Function} A function that dispatches on object in list position
     */

    function _dispatchable(methodNames, xf, fn) {
      return function () {
        if (arguments.length === 0) {
          return fn();
        }

        var args = Array.prototype.slice.call(arguments, 0);
        var obj = args.pop();

        if (!_isArray(obj)) {
          var idx = 0;

          while (idx < methodNames.length) {
            if (typeof obj[methodNames[idx]] === 'function') {
              return obj[methodNames[idx]].apply(obj, args);
            }

            idx += 1;
          }

          if (_isTransformer(obj)) {
            var transducer = xf.apply(null, args);
            return transducer(obj);
          }
        }

        return fn.apply(this, arguments);
      };
    }

    function _reduced(x) {
      return x && x['@@transducer/reduced'] ? x : {
        '@@transducer/value': x,
        '@@transducer/reduced': true
      };
    }

    var _xfBase = {
      init: function () {
        return this.xf['@@transducer/init']();
      },
      result: function (result) {
        return this.xf['@@transducer/result'](result);
      }
    };

    var XAll =
    /*#__PURE__*/
    function () {
      function XAll(f, xf) {
        this.xf = xf;
        this.f = f;
        this.all = true;
      }

      XAll.prototype['@@transducer/init'] = _xfBase.init;

      XAll.prototype['@@transducer/result'] = function (result) {
        if (this.all) {
          result = this.xf['@@transducer/step'](result, true);
        }

        return this.xf['@@transducer/result'](result);
      };

      XAll.prototype['@@transducer/step'] = function (result, input) {
        if (!this.f(input)) {
          this.all = false;
          result = _reduced(this.xf['@@transducer/step'](result, false));
        }

        return result;
      };

      return XAll;
    }();

    var _xall =
    /*#__PURE__*/
    _curry2(function _xall(f, xf) {
      return new XAll(f, xf);
    });

    /**
     * Returns `true` if all elements of the list match the predicate, `false` if
     * there are any that don't.
     *
     * Dispatches to the `all` method of the second argument, if present.
     *
     * Acts as a transducer if a transformer is given in list position.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig (a -> Boolean) -> [a] -> Boolean
     * @param {Function} fn The predicate function.
     * @param {Array} list The array to consider.
     * @return {Boolean} `true` if the predicate is satisfied by every element, `false`
     *         otherwise.
     * @see R.any, R.none, R.transduce
     * @example
     *
     *      const equals3 = R.equals(3);
     *      R.all(equals3)([3, 3, 3, 3]); //=> true
     *      R.all(equals3)([3, 3, 1, 3]); //=> false
     */

    var all =
    /*#__PURE__*/
    _curry2(
    /*#__PURE__*/
    _dispatchable(['all'], _xall, function all(fn, list) {
      var idx = 0;

      while (idx < list.length) {
        if (!fn(list[idx])) {
          return false;
        }

        idx += 1;
      }

      return true;
    }));

    /**
     * Returns the larger of its two arguments.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Relation
     * @sig Ord a => a -> a -> a
     * @param {*} a
     * @param {*} b
     * @return {*}
     * @see R.maxBy, R.min
     * @example
     *
     *      R.max(789, 123); //=> 789
     *      R.max('a', 'b'); //=> 'b'
     */

    var max =
    /*#__PURE__*/
    _curry2(function max(a, b) {
      return b > a ? b : a;
    });

    function _map(fn, functor) {
      var idx = 0;
      var len = functor.length;
      var result = Array(len);

      while (idx < len) {
        result[idx] = fn(functor[idx]);
        idx += 1;
      }

      return result;
    }

    function _isString(x) {
      return Object.prototype.toString.call(x) === '[object String]';
    }

    /**
     * Tests whether or not an object is similar to an array.
     *
     * @private
     * @category Type
     * @category List
     * @sig * -> Boolean
     * @param {*} x The object to test.
     * @return {Boolean} `true` if `x` has a numeric length property and extreme indices defined; `false` otherwise.
     * @example
     *
     *      _isArrayLike([]); //=> true
     *      _isArrayLike(true); //=> false
     *      _isArrayLike({}); //=> false
     *      _isArrayLike({length: 10}); //=> false
     *      _isArrayLike({0: 'zero', 9: 'nine', length: 10}); //=> true
     */

    var _isArrayLike =
    /*#__PURE__*/
    _curry1(function isArrayLike(x) {
      if (_isArray(x)) {
        return true;
      }

      if (!x) {
        return false;
      }

      if (typeof x !== 'object') {
        return false;
      }

      if (_isString(x)) {
        return false;
      }

      if (x.nodeType === 1) {
        return !!x.length;
      }

      if (x.length === 0) {
        return true;
      }

      if (x.length > 0) {
        return x.hasOwnProperty(0) && x.hasOwnProperty(x.length - 1);
      }

      return false;
    });

    var XWrap =
    /*#__PURE__*/
    function () {
      function XWrap(fn) {
        this.f = fn;
      }

      XWrap.prototype['@@transducer/init'] = function () {
        throw new Error('init not implemented on XWrap');
      };

      XWrap.prototype['@@transducer/result'] = function (acc) {
        return acc;
      };

      XWrap.prototype['@@transducer/step'] = function (acc, x) {
        return this.f(acc, x);
      };

      return XWrap;
    }();

    function _xwrap(fn) {
      return new XWrap(fn);
    }

    /**
     * Creates a function that is bound to a context.
     * Note: `R.bind` does not provide the additional argument-binding capabilities of
     * [Function.prototype.bind](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind).
     *
     * @func
     * @memberOf R
     * @since v0.6.0
     * @category Function
     * @category Object
     * @sig (* -> *) -> {*} -> (* -> *)
     * @param {Function} fn The function to bind to context
     * @param {Object} thisObj The context to bind `fn` to
     * @return {Function} A function that will execute in the context of `thisObj`.
     * @see R.partial
     * @example
     *
     *      const log = R.bind(console.log, console);
     *      R.pipe(R.assoc('a', 2), R.tap(log), R.assoc('a', 3))({a: 1}); //=> {a: 3}
     *      // logs {a: 2}
     * @symb R.bind(f, o)(a, b) = f.call(o, a, b)
     */

    var bind =
    /*#__PURE__*/
    _curry2(function bind(fn, thisObj) {
      return _arity(fn.length, function () {
        return fn.apply(thisObj, arguments);
      });
    });

    function _arrayReduce(xf, acc, list) {
      var idx = 0;
      var len = list.length;

      while (idx < len) {
        acc = xf['@@transducer/step'](acc, list[idx]);

        if (acc && acc['@@transducer/reduced']) {
          acc = acc['@@transducer/value'];
          break;
        }

        idx += 1;
      }

      return xf['@@transducer/result'](acc);
    }

    function _iterableReduce(xf, acc, iter) {
      var step = iter.next();

      while (!step.done) {
        acc = xf['@@transducer/step'](acc, step.value);

        if (acc && acc['@@transducer/reduced']) {
          acc = acc['@@transducer/value'];
          break;
        }

        step = iter.next();
      }

      return xf['@@transducer/result'](acc);
    }

    function _methodReduce(xf, acc, obj, methodName) {
      return xf['@@transducer/result'](obj[methodName](bind(xf['@@transducer/step'], xf), acc));
    }

    var symIterator = typeof Symbol !== 'undefined' ? Symbol.iterator : '@@iterator';
    function _reduce(fn, acc, list) {
      if (typeof fn === 'function') {
        fn = _xwrap(fn);
      }

      if (_isArrayLike(list)) {
        return _arrayReduce(fn, acc, list);
      }

      if (typeof list['fantasy-land/reduce'] === 'function') {
        return _methodReduce(fn, acc, list, 'fantasy-land/reduce');
      }

      if (list[symIterator] != null) {
        return _iterableReduce(fn, acc, list[symIterator]());
      }

      if (typeof list.next === 'function') {
        return _iterableReduce(fn, acc, list);
      }

      if (typeof list.reduce === 'function') {
        return _methodReduce(fn, acc, list, 'reduce');
      }

      throw new TypeError('reduce: list must be array or iterable');
    }

    var XMap =
    /*#__PURE__*/
    function () {
      function XMap(f, xf) {
        this.xf = xf;
        this.f = f;
      }

      XMap.prototype['@@transducer/init'] = _xfBase.init;
      XMap.prototype['@@transducer/result'] = _xfBase.result;

      XMap.prototype['@@transducer/step'] = function (result, input) {
        return this.xf['@@transducer/step'](result, this.f(input));
      };

      return XMap;
    }();

    var _xmap =
    /*#__PURE__*/
    _curry2(function _xmap(f, xf) {
      return new XMap(f, xf);
    });

    function _has(prop, obj) {
      return Object.prototype.hasOwnProperty.call(obj, prop);
    }

    var toString = Object.prototype.toString;

    var _isArguments =
    /*#__PURE__*/
    function () {
      return toString.call(arguments) === '[object Arguments]' ? function _isArguments(x) {
        return toString.call(x) === '[object Arguments]';
      } : function _isArguments(x) {
        return _has('callee', x);
      };
    }();

    var hasEnumBug = !
    /*#__PURE__*/
    {
      toString: null
    }.propertyIsEnumerable('toString');
    var nonEnumerableProps = ['constructor', 'valueOf', 'isPrototypeOf', 'toString', 'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString']; // Safari bug

    var hasArgsEnumBug =
    /*#__PURE__*/
    function () {

      return arguments.propertyIsEnumerable('length');
    }();

    var contains = function contains(list, item) {
      var idx = 0;

      while (idx < list.length) {
        if (list[idx] === item) {
          return true;
        }

        idx += 1;
      }

      return false;
    };
    /**
     * Returns a list containing the names of all the enumerable own properties of
     * the supplied object.
     * Note that the order of the output array is not guaranteed to be consistent
     * across different JS platforms.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Object
     * @sig {k: v} -> [k]
     * @param {Object} obj The object to extract properties from
     * @return {Array} An array of the object's own properties.
     * @see R.keysIn, R.values
     * @example
     *
     *      R.keys({a: 1, b: 2, c: 3}); //=> ['a', 'b', 'c']
     */


    var keys = typeof Object.keys === 'function' && !hasArgsEnumBug ?
    /*#__PURE__*/
    _curry1(function keys(obj) {
      return Object(obj) !== obj ? [] : Object.keys(obj);
    }) :
    /*#__PURE__*/
    _curry1(function keys(obj) {
      if (Object(obj) !== obj) {
        return [];
      }

      var prop, nIdx;
      var ks = [];

      var checkArgsLength = hasArgsEnumBug && _isArguments(obj);

      for (prop in obj) {
        if (_has(prop, obj) && (!checkArgsLength || prop !== 'length')) {
          ks[ks.length] = prop;
        }
      }

      if (hasEnumBug) {
        nIdx = nonEnumerableProps.length - 1;

        while (nIdx >= 0) {
          prop = nonEnumerableProps[nIdx];

          if (_has(prop, obj) && !contains(ks, prop)) {
            ks[ks.length] = prop;
          }

          nIdx -= 1;
        }
      }

      return ks;
    });

    /**
     * Takes a function and
     * a [functor](https://github.com/fantasyland/fantasy-land#functor),
     * applies the function to each of the functor's values, and returns
     * a functor of the same shape.
     *
     * Ramda provides suitable `map` implementations for `Array` and `Object`,
     * so this function may be applied to `[1, 2, 3]` or `{x: 1, y: 2, z: 3}`.
     *
     * Dispatches to the `map` method of the second argument, if present.
     *
     * Acts as a transducer if a transformer is given in list position.
     *
     * Also treats functions as functors and will compose them together.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig Functor f => (a -> b) -> f a -> f b
     * @param {Function} fn The function to be called on every element of the input `list`.
     * @param {Array} list The list to be iterated over.
     * @return {Array} The new list.
     * @see R.transduce, R.addIndex
     * @example
     *
     *      const double = x => x * 2;
     *
     *      R.map(double, [1, 2, 3]); //=> [2, 4, 6]
     *
     *      R.map(double, {x: 1, y: 2, z: 3}); //=> {x: 2, y: 4, z: 6}
     * @symb R.map(f, [a, b]) = [f(a), f(b)]
     * @symb R.map(f, { x: a, y: b }) = { x: f(a), y: f(b) }
     * @symb R.map(f, functor_o) = functor_o.map(f)
     */

    var map =
    /*#__PURE__*/
    _curry2(
    /*#__PURE__*/
    _dispatchable(['fantasy-land/map', 'map'], _xmap, function map(fn, functor) {
      switch (Object.prototype.toString.call(functor)) {
        case '[object Function]':
          return curryN(functor.length, function () {
            return fn.call(this, functor.apply(this, arguments));
          });

        case '[object Object]':
          return _reduce(function (acc, key) {
            acc[key] = fn(functor[key]);
            return acc;
          }, {}, keys(functor));

        default:
          return _map(fn, functor);
      }
    }));

    /**
     * Determine if the passed argument is an integer.
     *
     * @private
     * @param {*} n
     * @category Type
     * @return {Boolean}
     */
    var _isInteger = Number.isInteger || function _isInteger(n) {
      return n << 0 === n;
    };

    /**
     * Returns the nth element of the given list or string. If n is negative the
     * element at index length + n is returned.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig Number -> [a] -> a | Undefined
     * @sig Number -> String -> String
     * @param {Number} offset
     * @param {*} list
     * @return {*}
     * @example
     *
     *      const list = ['foo', 'bar', 'baz', 'quux'];
     *      R.nth(1, list); //=> 'bar'
     *      R.nth(-1, list); //=> 'quux'
     *      R.nth(-99, list); //=> undefined
     *
     *      R.nth(2, 'abc'); //=> 'c'
     *      R.nth(3, 'abc'); //=> ''
     * @symb R.nth(-1, [a, b, c]) = c
     * @symb R.nth(0, [a, b, c]) = a
     * @symb R.nth(1, [a, b, c]) = b
     */

    var nth =
    /*#__PURE__*/
    _curry2(function nth(offset, list) {
      var idx = offset < 0 ? list.length + offset : offset;
      return _isString(list) ? list.charAt(idx) : list[idx];
    });

    /**
     * Retrieves the values at given paths of an object.
     *
     * @func
     * @memberOf R
     * @since v0.27.1
     * @category Object
     * @typedefn Idx = [String | Int]
     * @sig [Idx] -> {a} -> [a | Undefined]
     * @param {Array} pathsArray The array of paths to be fetched.
     * @param {Object} obj The object to retrieve the nested properties from.
     * @return {Array} A list consisting of values at paths specified by "pathsArray".
     * @see R.path
     * @example
     *
     *      R.paths([['a', 'b'], ['p', 0, 'q']], {a: {b: 2}, p: [{q: 3}]}); //=> [2, 3]
     *      R.paths([['a', 'b'], ['p', 'r']], {a: {b: 2}, p: [{q: 3}]}); //=> [2, undefined]
     */

    var paths =
    /*#__PURE__*/
    _curry2(function paths(pathsArray, obj) {
      return pathsArray.map(function (paths) {
        var val = obj;
        var idx = 0;
        var p;

        while (idx < paths.length) {
          if (val == null) {
            return;
          }

          p = paths[idx];
          val = _isInteger(p) ? nth(p, val) : val[p];
          idx += 1;
        }

        return val;
      });
    });

    /**
     * Retrieve the value at a given path.
     *
     * @func
     * @memberOf R
     * @since v0.2.0
     * @category Object
     * @typedefn Idx = String | Int
     * @sig [Idx] -> {a} -> a | Undefined
     * @param {Array} path The path to use.
     * @param {Object} obj The object to retrieve the nested property from.
     * @return {*} The data at `path`.
     * @see R.prop, R.nth
     * @example
     *
     *      R.path(['a', 'b'], {a: {b: 2}}); //=> 2
     *      R.path(['a', 'b'], {c: {b: 2}}); //=> undefined
     *      R.path(['a', 'b', 0], {a: {b: [1, 2, 3]}}); //=> 1
     *      R.path(['a', 'b', -2], {a: {b: [1, 2, 3]}}); //=> 2
     */

    var path =
    /*#__PURE__*/
    _curry2(function path(pathAr, obj) {
      return paths([pathAr], obj)[0];
    });

    /**
     * Returns a function that when supplied an object returns the indicated
     * property of that object, if it exists.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Object
     * @typedefn Idx = String | Int
     * @sig Idx -> {s: a} -> a | Undefined
     * @param {String|Number} p The property name or array index
     * @param {Object} obj The object to query
     * @return {*} The value at `obj.p`.
     * @see R.path, R.nth
     * @example
     *
     *      R.prop('x', {x: 100}); //=> 100
     *      R.prop('x', {}); //=> undefined
     *      R.prop(0, [100]); //=> 100
     *      R.compose(R.inc, R.prop('x'))({ x: 3 }) //=> 4
     */

    var prop =
    /*#__PURE__*/
    _curry2(function prop(p, obj) {
      return path([p], obj);
    });

    /**
     * Returns a new list by plucking the same named property off all objects in
     * the list supplied.
     *
     * `pluck` will work on
     * any [functor](https://github.com/fantasyland/fantasy-land#functor) in
     * addition to arrays, as it is equivalent to `R.map(R.prop(k), f)`.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig Functor f => k -> f {k: v} -> f v
     * @param {Number|String} key The key name to pluck off of each object.
     * @param {Array} f The array or functor to consider.
     * @return {Array} The list of values for the given key.
     * @see R.props
     * @example
     *
     *      var getAges = R.pluck('age');
     *      getAges([{name: 'fred', age: 29}, {name: 'wilma', age: 27}]); //=> [29, 27]
     *
     *      R.pluck(0, [[1, 2], [3, 4]]);               //=> [1, 3]
     *      R.pluck('val', {a: {val: 3}, b: {val: 5}}); //=> {a: 3, b: 5}
     * @symb R.pluck('x', [{x: 1, y: 2}, {x: 3, y: 4}, {x: 5, y: 6}]) = [1, 3, 5]
     * @symb R.pluck(0, [[1, 2], [3, 4], [5, 6]]) = [1, 3, 5]
     */

    var pluck =
    /*#__PURE__*/
    _curry2(function pluck(p, list) {
      return map(prop(p), list);
    });

    /**
     * Returns a single item by iterating through the list, successively calling
     * the iterator function and passing it an accumulator value and the current
     * value from the array, and then passing the result to the next call.
     *
     * The iterator function receives two values: *(acc, value)*. It may use
     * [`R.reduced`](#reduced) to shortcut the iteration.
     *
     * The arguments' order of [`reduceRight`](#reduceRight)'s iterator function
     * is *(value, acc)*.
     *
     * Note: `R.reduce` does not skip deleted or unassigned indices (sparse
     * arrays), unlike the native `Array.prototype.reduce` method. For more details
     * on this behavior, see:
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce#Description
     *
     * Dispatches to the `reduce` method of the third argument, if present. When
     * doing so, it is up to the user to handle the [`R.reduced`](#reduced)
     * shortcuting, as this is not implemented by `reduce`.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig ((a, b) -> a) -> a -> [b] -> a
     * @param {Function} fn The iterator function. Receives two values, the accumulator and the
     *        current element from the array.
     * @param {*} acc The accumulator value.
     * @param {Array} list The list to iterate over.
     * @return {*} The final, accumulated value.
     * @see R.reduced, R.addIndex, R.reduceRight
     * @example
     *
     *      R.reduce(R.subtract, 0, [1, 2, 3, 4]) // => ((((0 - 1) - 2) - 3) - 4) = -10
     *      //          -               -10
     *      //         / \              / \
     *      //        -   4           -6   4
     *      //       / \              / \
     *      //      -   3   ==>     -3   3
     *      //     / \              / \
     *      //    -   2           -1   2
     *      //   / \              / \
     *      //  0   1            0   1
     *
     * @symb R.reduce(f, a, [b, c, d]) = f(f(f(a, b), c), d)
     */

    var reduce =
    /*#__PURE__*/
    _curry3(_reduce);

    /**
     * Takes a list of predicates and returns a predicate that returns true for a
     * given list of arguments if every one of the provided predicates is satisfied
     * by those arguments.
     *
     * The function returned is a curried function whose arity matches that of the
     * highest-arity predicate.
     *
     * @func
     * @memberOf R
     * @since v0.9.0
     * @category Logic
     * @sig [(*... -> Boolean)] -> (*... -> Boolean)
     * @param {Array} predicates An array of predicates to check
     * @return {Function} The combined predicate
     * @see R.anyPass
     * @example
     *
     *      const isQueen = R.propEq('rank', 'Q');
     *      const isSpade = R.propEq('suit', '♠︎');
     *      const isQueenOfSpades = R.allPass([isQueen, isSpade]);
     *
     *      isQueenOfSpades({rank: 'Q', suit: '♣︎'}); //=> false
     *      isQueenOfSpades({rank: 'Q', suit: '♠︎'}); //=> true
     */

    var allPass =
    /*#__PURE__*/
    _curry1(function allPass(preds) {
      return curryN(reduce(max, 0, pluck('length', preds)), function () {
        var idx = 0;
        var len = preds.length;

        while (idx < len) {
          if (!preds[idx].apply(this, arguments)) {
            return false;
          }

          idx += 1;
        }

        return true;
      });
    });

    /**
     * Returns a function that always returns the given value. Note that for
     * non-primitives the value returned is a reference to the original value.
     *
     * This function is known as `const`, `constant`, or `K` (for K combinator) in
     * other languages and libraries.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Function
     * @sig a -> (* -> a)
     * @param {*} val The value to wrap in a function
     * @return {Function} A Function :: * -> val.
     * @example
     *
     *      const t = R.always('Tee');
     *      t(); //=> 'Tee'
     */

    var always =
    /*#__PURE__*/
    _curry1(function always(val) {
      return function () {
        return val;
      };
    });

    /**
     * Returns `true` if both arguments are `true`; `false` otherwise.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Logic
     * @sig a -> b -> a | b
     * @param {Any} a
     * @param {Any} b
     * @return {Any} the first argument if it is falsy, otherwise the second argument.
     * @see R.both, R.xor
     * @example
     *
     *      R.and(true, true); //=> true
     *      R.and(true, false); //=> false
     *      R.and(false, true); //=> false
     *      R.and(false, false); //=> false
     */

    var and =
    /*#__PURE__*/
    _curry2(function and(a, b) {
      return a && b;
    });

    var XAny =
    /*#__PURE__*/
    function () {
      function XAny(f, xf) {
        this.xf = xf;
        this.f = f;
        this.any = false;
      }

      XAny.prototype['@@transducer/init'] = _xfBase.init;

      XAny.prototype['@@transducer/result'] = function (result) {
        if (!this.any) {
          result = this.xf['@@transducer/step'](result, false);
        }

        return this.xf['@@transducer/result'](result);
      };

      XAny.prototype['@@transducer/step'] = function (result, input) {
        if (this.f(input)) {
          this.any = true;
          result = _reduced(this.xf['@@transducer/step'](result, true));
        }

        return result;
      };

      return XAny;
    }();

    var _xany =
    /*#__PURE__*/
    _curry2(function _xany(f, xf) {
      return new XAny(f, xf);
    });

    /**
     * Returns `true` if at least one of the elements of the list match the predicate,
     * `false` otherwise.
     *
     * Dispatches to the `any` method of the second argument, if present.
     *
     * Acts as a transducer if a transformer is given in list position.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig (a -> Boolean) -> [a] -> Boolean
     * @param {Function} fn The predicate function.
     * @param {Array} list The array to consider.
     * @return {Boolean} `true` if the predicate is satisfied by at least one element, `false`
     *         otherwise.
     * @see R.all, R.none, R.transduce
     * @example
     *
     *      const lessThan0 = R.flip(R.lt)(0);
     *      const lessThan2 = R.flip(R.lt)(2);
     *      R.any(lessThan0)([1, 2]); //=> false
     *      R.any(lessThan2)([1, 2]); //=> true
     */

    var any =
    /*#__PURE__*/
    _curry2(
    /*#__PURE__*/
    _dispatchable(['any'], _xany, function any(fn, list) {
      var idx = 0;

      while (idx < list.length) {
        if (fn(list[idx])) {
          return true;
        }

        idx += 1;
      }

      return false;
    }));

    /**
     * Takes a list of predicates and returns a predicate that returns true for a
     * given list of arguments if at least one of the provided predicates is
     * satisfied by those arguments.
     *
     * The function returned is a curried function whose arity matches that of the
     * highest-arity predicate.
     *
     * @func
     * @memberOf R
     * @since v0.9.0
     * @category Logic
     * @sig [(*... -> Boolean)] -> (*... -> Boolean)
     * @param {Array} predicates An array of predicates to check
     * @return {Function} The combined predicate
     * @see R.allPass
     * @example
     *
     *      const isClub = R.propEq('suit', '♣');
     *      const isSpade = R.propEq('suit', '♠');
     *      const isBlackCard = R.anyPass([isClub, isSpade]);
     *
     *      isBlackCard({rank: '10', suit: '♣'}); //=> true
     *      isBlackCard({rank: 'Q', suit: '♠'}); //=> true
     *      isBlackCard({rank: 'Q', suit: '♦'}); //=> false
     */

    var anyPass =
    /*#__PURE__*/
    _curry1(function anyPass(preds) {
      return curryN(reduce(max, 0, pluck('length', preds)), function () {
        var idx = 0;
        var len = preds.length;

        while (idx < len) {
          if (preds[idx].apply(this, arguments)) {
            return true;
          }

          idx += 1;
        }

        return false;
      });
    });

    /**
     * ap applies a list of functions to a list of values.
     *
     * Dispatches to the `ap` method of the second argument, if present. Also
     * treats curried functions as applicatives.
     *
     * @func
     * @memberOf R
     * @since v0.3.0
     * @category Function
     * @sig [a -> b] -> [a] -> [b]
     * @sig Apply f => f (a -> b) -> f a -> f b
     * @sig (r -> a -> b) -> (r -> a) -> (r -> b)
     * @param {*} applyF
     * @param {*} applyX
     * @return {*}
     * @example
     *
     *      R.ap([R.multiply(2), R.add(3)], [1,2,3]); //=> [2, 4, 6, 4, 5, 6]
     *      R.ap([R.concat('tasty '), R.toUpper], ['pizza', 'salad']); //=> ["tasty pizza", "tasty salad", "PIZZA", "SALAD"]
     *
     *      // R.ap can also be used as S combinator
     *      // when only two functions are passed
     *      R.ap(R.concat, R.toUpper)('Ramda') //=> 'RamdaRAMDA'
     * @symb R.ap([f, g], [a, b]) = [f(a), f(b), g(a), g(b)]
     */

    var ap =
    /*#__PURE__*/
    _curry2(function ap(applyF, applyX) {
      return typeof applyX['fantasy-land/ap'] === 'function' ? applyX['fantasy-land/ap'](applyF) : typeof applyF.ap === 'function' ? applyF.ap(applyX) : typeof applyF === 'function' ? function (x) {
        return applyF(x)(applyX(x));
      } : _reduce(function (acc, f) {
        return _concat(acc, map(f, applyX));
      }, [], applyF);
    });

    function _aperture(n, list) {
      var idx = 0;
      var limit = list.length - (n - 1);
      var acc = new Array(limit >= 0 ? limit : 0);

      while (idx < limit) {
        acc[idx] = Array.prototype.slice.call(list, idx, idx + n);
        idx += 1;
      }

      return acc;
    }

    var XAperture =
    /*#__PURE__*/
    function () {
      function XAperture(n, xf) {
        this.xf = xf;
        this.pos = 0;
        this.full = false;
        this.acc = new Array(n);
      }

      XAperture.prototype['@@transducer/init'] = _xfBase.init;

      XAperture.prototype['@@transducer/result'] = function (result) {
        this.acc = null;
        return this.xf['@@transducer/result'](result);
      };

      XAperture.prototype['@@transducer/step'] = function (result, input) {
        this.store(input);
        return this.full ? this.xf['@@transducer/step'](result, this.getCopy()) : result;
      };

      XAperture.prototype.store = function (input) {
        this.acc[this.pos] = input;
        this.pos += 1;

        if (this.pos === this.acc.length) {
          this.pos = 0;
          this.full = true;
        }
      };

      XAperture.prototype.getCopy = function () {
        return _concat(Array.prototype.slice.call(this.acc, this.pos), Array.prototype.slice.call(this.acc, 0, this.pos));
      };

      return XAperture;
    }();

    var _xaperture =
    /*#__PURE__*/
    _curry2(function _xaperture(n, xf) {
      return new XAperture(n, xf);
    });

    /**
     * Returns a new list, composed of n-tuples of consecutive elements. If `n` is
     * greater than the length of the list, an empty list is returned.
     *
     * Acts as a transducer if a transformer is given in list position.
     *
     * @func
     * @memberOf R
     * @since v0.12.0
     * @category List
     * @sig Number -> [a] -> [[a]]
     * @param {Number} n The size of the tuples to create
     * @param {Array} list The list to split into `n`-length tuples
     * @return {Array} The resulting list of `n`-length tuples
     * @see R.transduce
     * @example
     *
     *      R.aperture(2, [1, 2, 3, 4, 5]); //=> [[1, 2], [2, 3], [3, 4], [4, 5]]
     *      R.aperture(3, [1, 2, 3, 4, 5]); //=> [[1, 2, 3], [2, 3, 4], [3, 4, 5]]
     *      R.aperture(7, [1, 2, 3, 4, 5]); //=> []
     */

    var aperture =
    /*#__PURE__*/
    _curry2(
    /*#__PURE__*/
    _dispatchable([], _xaperture, _aperture));

    /**
     * Returns a new list containing the contents of the given list, followed by
     * the given element.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig a -> [a] -> [a]
     * @param {*} el The element to add to the end of the new list.
     * @param {Array} list The list of elements to add a new item to.
     *        list.
     * @return {Array} A new list containing the elements of the old list followed by `el`.
     * @see R.prepend
     * @example
     *
     *      R.append('tests', ['write', 'more']); //=> ['write', 'more', 'tests']
     *      R.append('tests', []); //=> ['tests']
     *      R.append(['tests'], ['write', 'more']); //=> ['write', 'more', ['tests']]
     */

    var append$1 =
    /*#__PURE__*/
    _curry2(function append(el, list) {
      return _concat(list, [el]);
    });

    /**
     * Applies function `fn` to the argument list `args`. This is useful for
     * creating a fixed-arity function from a variadic function. `fn` should be a
     * bound function if context is significant.
     *
     * @func
     * @memberOf R
     * @since v0.7.0
     * @category Function
     * @sig (*... -> a) -> [*] -> a
     * @param {Function} fn The function which will be called with `args`
     * @param {Array} args The arguments to call `fn` with
     * @return {*} result The result, equivalent to `fn(...args)`
     * @see R.call, R.unapply
     * @example
     *
     *      const nums = [1, 2, 3, -99, 42, 6, 7];
     *      R.apply(Math.max, nums); //=> 42
     * @symb R.apply(f, [a, b, c]) = f(a, b, c)
     */

    var apply =
    /*#__PURE__*/
    _curry2(function apply(fn, args) {
      return fn.apply(this, args);
    });

    /**
     * Returns a list of all the enumerable own properties of the supplied object.
     * Note that the order of the output array is not guaranteed across different
     * JS platforms.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Object
     * @sig {k: v} -> [v]
     * @param {Object} obj The object to extract values from
     * @return {Array} An array of the values of the object's own properties.
     * @see R.valuesIn, R.keys
     * @example
     *
     *      R.values({a: 1, b: 2, c: 3}); //=> [1, 2, 3]
     */

    var values =
    /*#__PURE__*/
    _curry1(function values(obj) {
      var props = keys(obj);
      var len = props.length;
      var vals = [];
      var idx = 0;

      while (idx < len) {
        vals[idx] = obj[props[idx]];
        idx += 1;
      }

      return vals;
    });

    // delegating calls to .map

    function mapValues(fn, obj) {
      return keys(obj).reduce(function (acc, key) {
        acc[key] = fn(obj[key]);
        return acc;
      }, {});
    }
    /**
     * Given a spec object recursively mapping properties to functions, creates a
     * function producing an object of the same structure, by mapping each property
     * to the result of calling its associated function with the supplied arguments.
     *
     * @func
     * @memberOf R
     * @since v0.20.0
     * @category Function
     * @sig {k: ((a, b, ..., m) -> v)} -> ((a, b, ..., m) -> {k: v})
     * @param {Object} spec an object recursively mapping properties to functions for
     *        producing the values for these properties.
     * @return {Function} A function that returns an object of the same structure
     * as `spec', with each property set to the value returned by calling its
     * associated function with the supplied arguments.
     * @see R.converge, R.juxt
     * @example
     *
     *      const getMetrics = R.applySpec({
     *        sum: R.add,
     *        nested: { mul: R.multiply }
     *      });
     *      getMetrics(2, 4); // => { sum: 6, nested: { mul: 8 } }
     * @symb R.applySpec({ x: f, y: { z: g } })(a, b) = { x: f(a, b), y: { z: g(a, b) } }
     */


    var applySpec =
    /*#__PURE__*/
    _curry1(function applySpec(spec) {
      spec = mapValues(function (v) {
        return typeof v == 'function' ? v : applySpec(v);
      }, spec);
      return curryN(reduce(max, 0, pluck('length', values(spec))), function () {
        var args = arguments;
        return mapValues(function (f) {
          return apply(f, args);
        }, spec);
      });
    });

    /**
     * Takes a value and applies a function to it.
     *
     * This function is also known as the `thrush` combinator.
     *
     * @func
     * @memberOf R
     * @since v0.25.0
     * @category Function
     * @sig a -> (a -> b) -> b
     * @param {*} x The value
     * @param {Function} f The function to apply
     * @return {*} The result of applying `f` to `x`
     * @example
     *
     *      const t42 = R.applyTo(42);
     *      t42(R.identity); //=> 42
     *      t42(R.add(1)); //=> 43
     */

    var applyTo =
    /*#__PURE__*/
    _curry2(function applyTo(x, f) {
      return f(x);
    });

    /**
     * Makes an ascending comparator function out of a function that returns a value
     * that can be compared with `<` and `>`.
     *
     * @func
     * @memberOf R
     * @since v0.23.0
     * @category Function
     * @sig Ord b => (a -> b) -> a -> a -> Number
     * @param {Function} fn A function of arity one that returns a value that can be compared
     * @param {*} a The first item to be compared.
     * @param {*} b The second item to be compared.
     * @return {Number} `-1` if fn(a) < fn(b), `1` if fn(b) < fn(a), otherwise `0`
     * @see R.descend
     * @example
     *
     *      const byAge = R.ascend(R.prop('age'));
     *      const people = [
     *        { name: 'Emma', age: 70 },
     *        { name: 'Peter', age: 78 },
     *        { name: 'Mikhail', age: 62 },
     *      ];
     *      const peopleByYoungestFirst = R.sort(byAge, people);
     *        //=> [{ name: 'Mikhail', age: 62 },{ name: 'Emma', age: 70 }, { name: 'Peter', age: 78 }]
     */

    var ascend =
    /*#__PURE__*/
    _curry3(function ascend(fn, a, b) {
      var aa = fn(a);
      var bb = fn(b);
      return aa < bb ? -1 : aa > bb ? 1 : 0;
    });

    /**
     * Makes a shallow clone of an object, setting or overriding the specified
     * property with the given value. Note that this copies and flattens prototype
     * properties onto the new object as well. All non-primitive properties are
     * copied by reference.
     *
     * @func
     * @memberOf R
     * @since v0.8.0
     * @category Object
     * @sig String -> a -> {k: v} -> {k: v}
     * @param {String} prop The property name to set
     * @param {*} val The new value
     * @param {Object} obj The object to clone
     * @return {Object} A new object equivalent to the original except for the changed property.
     * @see R.dissoc, R.pick
     * @example
     *
     *      R.assoc('c', 3, {a: 1, b: 2}); //=> {a: 1, b: 2, c: 3}
     */

    var assoc =
    /*#__PURE__*/
    _curry3(function assoc(prop, val, obj) {
      var result = {};

      for (var p in obj) {
        result[p] = obj[p];
      }

      result[prop] = val;
      return result;
    });

    /**
     * Checks if the input value is `null` or `undefined`.
     *
     * @func
     * @memberOf R
     * @since v0.9.0
     * @category Type
     * @sig * -> Boolean
     * @param {*} x The value to test.
     * @return {Boolean} `true` if `x` is `undefined` or `null`, otherwise `false`.
     * @example
     *
     *      R.isNil(null); //=> true
     *      R.isNil(undefined); //=> true
     *      R.isNil(0); //=> false
     *      R.isNil([]); //=> false
     */

    var isNil =
    /*#__PURE__*/
    _curry1(function isNil(x) {
      return x == null;
    });

    /**
     * Makes a shallow clone of an object, setting or overriding the nodes required
     * to create the given path, and placing the specific value at the tail end of
     * that path. Note that this copies and flattens prototype properties onto the
     * new object as well. All non-primitive properties are copied by reference.
     *
     * @func
     * @memberOf R
     * @since v0.8.0
     * @category Object
     * @typedefn Idx = String | Int
     * @sig [Idx] -> a -> {a} -> {a}
     * @param {Array} path the path to set
     * @param {*} val The new value
     * @param {Object} obj The object to clone
     * @return {Object} A new object equivalent to the original except along the specified path.
     * @see R.dissocPath
     * @example
     *
     *      R.assocPath(['a', 'b', 'c'], 42, {a: {b: {c: 0}}}); //=> {a: {b: {c: 42}}}
     *
     *      // Any missing or non-object keys in path will be overridden
     *      R.assocPath(['a', 'b', 'c'], 42, {a: 5}); //=> {a: {b: {c: 42}}}
     */

    var assocPath =
    /*#__PURE__*/
    _curry3(function assocPath(path, val, obj) {
      if (path.length === 0) {
        return val;
      }

      var idx = path[0];

      if (path.length > 1) {
        var nextObj = !isNil(obj) && _has(idx, obj) ? obj[idx] : _isInteger(path[1]) ? [] : {};
        val = assocPath(Array.prototype.slice.call(path, 1), val, nextObj);
      }

      if (_isInteger(idx) && _isArray(obj)) {
        var arr = [].concat(obj);
        arr[idx] = val;
        return arr;
      } else {
        return assoc(idx, val, obj);
      }
    });

    /**
     * Wraps a function of any arity (including nullary) in a function that accepts
     * exactly `n` parameters. Any extraneous parameters will not be passed to the
     * supplied function.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Function
     * @sig Number -> (* -> a) -> (* -> a)
     * @param {Number} n The desired arity of the new function.
     * @param {Function} fn The function to wrap.
     * @return {Function} A new function wrapping `fn`. The new function is guaranteed to be of
     *         arity `n`.
     * @see R.binary, R.unary
     * @example
     *
     *      const takesTwoArgs = (a, b) => [a, b];
     *
     *      takesTwoArgs.length; //=> 2
     *      takesTwoArgs(1, 2); //=> [1, 2]
     *
     *      const takesOneArg = R.nAry(1, takesTwoArgs);
     *      takesOneArg.length; //=> 1
     *      // Only `n` arguments are passed to the wrapped function
     *      takesOneArg(1, 2); //=> [1, undefined]
     * @symb R.nAry(0, f)(a, b) = f()
     * @symb R.nAry(1, f)(a, b) = f(a)
     * @symb R.nAry(2, f)(a, b) = f(a, b)
     */

    var nAry =
    /*#__PURE__*/
    _curry2(function nAry(n, fn) {
      switch (n) {
        case 0:
          return function () {
            return fn.call(this);
          };

        case 1:
          return function (a0) {
            return fn.call(this, a0);
          };

        case 2:
          return function (a0, a1) {
            return fn.call(this, a0, a1);
          };

        case 3:
          return function (a0, a1, a2) {
            return fn.call(this, a0, a1, a2);
          };

        case 4:
          return function (a0, a1, a2, a3) {
            return fn.call(this, a0, a1, a2, a3);
          };

        case 5:
          return function (a0, a1, a2, a3, a4) {
            return fn.call(this, a0, a1, a2, a3, a4);
          };

        case 6:
          return function (a0, a1, a2, a3, a4, a5) {
            return fn.call(this, a0, a1, a2, a3, a4, a5);
          };

        case 7:
          return function (a0, a1, a2, a3, a4, a5, a6) {
            return fn.call(this, a0, a1, a2, a3, a4, a5, a6);
          };

        case 8:
          return function (a0, a1, a2, a3, a4, a5, a6, a7) {
            return fn.call(this, a0, a1, a2, a3, a4, a5, a6, a7);
          };

        case 9:
          return function (a0, a1, a2, a3, a4, a5, a6, a7, a8) {
            return fn.call(this, a0, a1, a2, a3, a4, a5, a6, a7, a8);
          };

        case 10:
          return function (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
            return fn.call(this, a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
          };

        default:
          throw new Error('First argument to nAry must be a non-negative integer no greater than ten');
      }
    });

    /**
     * Wraps a function of any arity (including nullary) in a function that accepts
     * exactly 2 parameters. Any extraneous parameters will not be passed to the
     * supplied function.
     *
     * @func
     * @memberOf R
     * @since v0.2.0
     * @category Function
     * @sig (* -> c) -> (a, b -> c)
     * @param {Function} fn The function to wrap.
     * @return {Function} A new function wrapping `fn`. The new function is guaranteed to be of
     *         arity 2.
     * @see R.nAry, R.unary
     * @example
     *
     *      const takesThreeArgs = function(a, b, c) {
     *        return [a, b, c];
     *      };
     *      takesThreeArgs.length; //=> 3
     *      takesThreeArgs(1, 2, 3); //=> [1, 2, 3]
     *
     *      const takesTwoArgs = R.binary(takesThreeArgs);
     *      takesTwoArgs.length; //=> 2
     *      // Only 2 arguments are passed to the wrapped function
     *      takesTwoArgs(1, 2, 3); //=> [1, 2, undefined]
     * @symb R.binary(f)(a, b, c) = f(a, b)
     */

    var binary =
    /*#__PURE__*/
    _curry1(function binary(fn) {
      return nAry(2, fn);
    });

    function _isFunction(x) {
      var type = Object.prototype.toString.call(x);
      return type === '[object Function]' || type === '[object AsyncFunction]' || type === '[object GeneratorFunction]' || type === '[object AsyncGeneratorFunction]';
    }

    /**
     * "lifts" a function to be the specified arity, so that it may "map over" that
     * many lists, Functions or other objects that satisfy the [FantasyLand Apply spec](https://github.com/fantasyland/fantasy-land#apply).
     *
     * @func
     * @memberOf R
     * @since v0.7.0
     * @category Function
     * @sig Number -> (*... -> *) -> ([*]... -> [*])
     * @param {Function} fn The function to lift into higher context
     * @return {Function} The lifted function.
     * @see R.lift, R.ap
     * @example
     *
     *      const madd3 = R.liftN(3, (...args) => R.sum(args));
     *      madd3([1,2,3], [1,2,3], [1]); //=> [3, 4, 5, 4, 5, 6, 5, 6, 7]
     */

    var liftN =
    /*#__PURE__*/
    _curry2(function liftN(arity, fn) {
      var lifted = curryN(arity, fn);
      return curryN(arity, function () {
        return _reduce(ap, map(lifted, arguments[0]), Array.prototype.slice.call(arguments, 1));
      });
    });

    /**
     * "lifts" a function of arity > 1 so that it may "map over" a list, Function or other
     * object that satisfies the [FantasyLand Apply spec](https://github.com/fantasyland/fantasy-land#apply).
     *
     * @func
     * @memberOf R
     * @since v0.7.0
     * @category Function
     * @sig (*... -> *) -> ([*]... -> [*])
     * @param {Function} fn The function to lift into higher context
     * @return {Function} The lifted function.
     * @see R.liftN
     * @example
     *
     *      const madd3 = R.lift((a, b, c) => a + b + c);
     *
     *      madd3([1,2,3], [1,2,3], [1]); //=> [3, 4, 5, 4, 5, 6, 5, 6, 7]
     *
     *      const madd5 = R.lift((a, b, c, d, e) => a + b + c + d + e);
     *
     *      madd5([1,2], [3], [4, 5], [6], [7, 8]); //=> [21, 22, 22, 23, 22, 23, 23, 24]
     */

    var lift =
    /*#__PURE__*/
    _curry1(function lift(fn) {
      return liftN(fn.length, fn);
    });

    /**
     * A function which calls the two provided functions and returns the `&&`
     * of the results.
     * It returns the result of the first function if it is false-y and the result
     * of the second function otherwise. Note that this is short-circuited,
     * meaning that the second function will not be invoked if the first returns a
     * false-y value.
     *
     * In addition to functions, `R.both` also accepts any fantasy-land compatible
     * applicative functor.
     *
     * @func
     * @memberOf R
     * @since v0.12.0
     * @category Logic
     * @sig (*... -> Boolean) -> (*... -> Boolean) -> (*... -> Boolean)
     * @param {Function} f A predicate
     * @param {Function} g Another predicate
     * @return {Function} a function that applies its arguments to `f` and `g` and `&&`s their outputs together.
     * @see R.and
     * @example
     *
     *      const gt10 = R.gt(R.__, 10)
     *      const lt20 = R.lt(R.__, 20)
     *      const f = R.both(gt10, lt20);
     *      f(15); //=> true
     *      f(30); //=> false
     *
     *      R.both(Maybe.Just(false), Maybe.Just(55)); // => Maybe.Just(false)
     *      R.both([false, false, 'a'], [11]); //=> [false, false, 11]
     */

    var both =
    /*#__PURE__*/
    _curry2(function both(f, g) {
      return _isFunction(f) ? function _both() {
        return f.apply(this, arguments) && g.apply(this, arguments);
      } : lift(and)(f, g);
    });

    /**
     * Returns a curried equivalent of the provided function. The curried function
     * has two unusual capabilities. First, its arguments needn't be provided one
     * at a time. If `f` is a ternary function and `g` is `R.curry(f)`, the
     * following are equivalent:
     *
     *   - `g(1)(2)(3)`
     *   - `g(1)(2, 3)`
     *   - `g(1, 2)(3)`
     *   - `g(1, 2, 3)`
     *
     * Secondly, the special placeholder value [`R.__`](#__) may be used to specify
     * "gaps", allowing partial application of any combination of arguments,
     * regardless of their positions. If `g` is as above and `_` is [`R.__`](#__),
     * the following are equivalent:
     *
     *   - `g(1, 2, 3)`
     *   - `g(_, 2, 3)(1)`
     *   - `g(_, _, 3)(1)(2)`
     *   - `g(_, _, 3)(1, 2)`
     *   - `g(_, 2)(1)(3)`
     *   - `g(_, 2)(1, 3)`
     *   - `g(_, 2)(_, 3)(1)`
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Function
     * @sig (* -> a) -> (* -> a)
     * @param {Function} fn The function to curry.
     * @return {Function} A new, curried function.
     * @see R.curryN, R.partial
     * @example
     *
     *      const addFourNumbers = (a, b, c, d) => a + b + c + d;
     *
     *      const curriedAddFourNumbers = R.curry(addFourNumbers);
     *      const f = curriedAddFourNumbers(1, 2);
     *      const g = f(3);
     *      g(4); //=> 10
     */

    var curry =
    /*#__PURE__*/
    _curry1(function curry(fn) {
      return curryN(fn.length, fn);
    });

    /**
     * Returns the result of calling its first argument with the remaining
     * arguments. This is occasionally useful as a converging function for
     * [`R.converge`](#converge): the first branch can produce a function while the
     * remaining branches produce values to be passed to that function as its
     * arguments.
     *
     * @func
     * @memberOf R
     * @since v0.9.0
     * @category Function
     * @sig (*... -> a),*... -> a
     * @param {Function} fn The function to apply to the remaining arguments.
     * @param {...*} args Any number of positional arguments.
     * @return {*}
     * @see R.apply
     * @example
     *
     *      R.call(R.add, 1, 2); //=> 3
     *
     *      const indentN = R.pipe(R.repeat(' '),
     *                           R.join(''),
     *                           R.replace(/^(?!$)/gm));
     *
     *      const format = R.converge(R.call, [
     *                                  R.pipe(R.prop('indent'), indentN),
     *                                  R.prop('value')
     *                              ]);
     *
     *      format({indent: 2, value: 'foo\nbar\nbaz\n'}); //=> '  foo\n  bar\n  baz\n'
     * @symb R.call(f, a, b) = f(a, b)
     */

    var call =
    /*#__PURE__*/
    curry(function call(fn) {
      return fn.apply(this, Array.prototype.slice.call(arguments, 1));
    });

    /**
     * `_makeFlat` is a helper function that returns a one-level or fully recursive
     * function based on the flag passed in.
     *
     * @private
     */

    function _makeFlat(recursive) {
      return function flatt(list) {
        var value, jlen, j;
        var result = [];
        var idx = 0;
        var ilen = list.length;

        while (idx < ilen) {
          if (_isArrayLike(list[idx])) {
            value = recursive ? flatt(list[idx]) : list[idx];
            j = 0;
            jlen = value.length;

            while (j < jlen) {
              result[result.length] = value[j];
              j += 1;
            }
          } else {
            result[result.length] = list[idx];
          }

          idx += 1;
        }

        return result;
      };
    }

    function _forceReduced(x) {
      return {
        '@@transducer/value': x,
        '@@transducer/reduced': true
      };
    }

    var preservingReduced = function (xf) {
      return {
        '@@transducer/init': _xfBase.init,
        '@@transducer/result': function (result) {
          return xf['@@transducer/result'](result);
        },
        '@@transducer/step': function (result, input) {
          var ret = xf['@@transducer/step'](result, input);
          return ret['@@transducer/reduced'] ? _forceReduced(ret) : ret;
        }
      };
    };

    var _flatCat = function _xcat(xf) {
      var rxf = preservingReduced(xf);
      return {
        '@@transducer/init': _xfBase.init,
        '@@transducer/result': function (result) {
          return rxf['@@transducer/result'](result);
        },
        '@@transducer/step': function (result, input) {
          return !_isArrayLike(input) ? _reduce(rxf, result, [input]) : _reduce(rxf, result, input);
        }
      };
    };

    var _xchain =
    /*#__PURE__*/
    _curry2(function _xchain(f, xf) {
      return map(f, _flatCat(xf));
    });

    /**
     * `chain` maps a function over a list and concatenates the results. `chain`
     * is also known as `flatMap` in some libraries.
     *
     * Dispatches to the `chain` method of the second argument, if present,
     * according to the [FantasyLand Chain spec](https://github.com/fantasyland/fantasy-land#chain).
     *
     * If second argument is a function, `chain(f, g)(x)` is equivalent to `f(g(x), x)`.
     *
     * Acts as a transducer if a transformer is given in list position.
     *
     * @func
     * @memberOf R
     * @since v0.3.0
     * @category List
     * @sig Chain m => (a -> m b) -> m a -> m b
     * @param {Function} fn The function to map with
     * @param {Array} list The list to map over
     * @return {Array} The result of flat-mapping `list` with `fn`
     * @example
     *
     *      const duplicate = n => [n, n];
     *      R.chain(duplicate, [1, 2, 3]); //=> [1, 1, 2, 2, 3, 3]
     *
     *      R.chain(R.append, R.head)([1, 2, 3]); //=> [1, 2, 3, 1]
     */

    var chain =
    /*#__PURE__*/
    _curry2(
    /*#__PURE__*/
    _dispatchable(['fantasy-land/chain', 'chain'], _xchain, function chain(fn, monad) {
      if (typeof monad === 'function') {
        return function (x) {
          return fn(monad(x))(x);
        };
      }

      return _makeFlat(false)(map(fn, monad));
    }));

    /**
     * Restricts a number to be within a range.
     *
     * Also works for other ordered types such as Strings and Dates.
     *
     * @func
     * @memberOf R
     * @since v0.20.0
     * @category Relation
     * @sig Ord a => a -> a -> a -> a
     * @param {Number} minimum The lower limit of the clamp (inclusive)
     * @param {Number} maximum The upper limit of the clamp (inclusive)
     * @param {Number} value Value to be clamped
     * @return {Number} Returns `minimum` when `val < minimum`, `maximum` when `val > maximum`, returns `val` otherwise
     * @example
     *
     *      R.clamp(1, 10, -5) // => 1
     *      R.clamp(1, 10, 15) // => 10
     *      R.clamp(1, 10, 4)  // => 4
     */

    var clamp =
    /*#__PURE__*/
    _curry3(function clamp(min, max, value) {
      if (min > max) {
        throw new Error('min must not be greater than max in clamp(min, max, value)');
      }

      return value < min ? min : value > max ? max : value;
    });

    function _cloneRegExp(pattern) {
      return new RegExp(pattern.source, (pattern.global ? 'g' : '') + (pattern.ignoreCase ? 'i' : '') + (pattern.multiline ? 'm' : '') + (pattern.sticky ? 'y' : '') + (pattern.unicode ? 'u' : ''));
    }

    /**
     * Gives a single-word string description of the (native) type of a value,
     * returning such answers as 'Object', 'Number', 'Array', or 'Null'. Does not
     * attempt to distinguish user Object types any further, reporting them all as
     * 'Object'.
     *
     * @func
     * @memberOf R
     * @since v0.8.0
     * @category Type
     * @sig (* -> {*}) -> String
     * @param {*} val The value to test
     * @return {String}
     * @example
     *
     *      R.type({}); //=> "Object"
     *      R.type(1); //=> "Number"
     *      R.type(false); //=> "Boolean"
     *      R.type('s'); //=> "String"
     *      R.type(null); //=> "Null"
     *      R.type([]); //=> "Array"
     *      R.type(/[A-z]/); //=> "RegExp"
     *      R.type(() => {}); //=> "Function"
     *      R.type(undefined); //=> "Undefined"
     */

    var type =
    /*#__PURE__*/
    _curry1(function type(val) {
      return val === null ? 'Null' : val === undefined ? 'Undefined' : Object.prototype.toString.call(val).slice(8, -1);
    });

    /**
     * Copies an object.
     *
     * @private
     * @param {*} value The value to be copied
     * @param {Array} refFrom Array containing the source references
     * @param {Array} refTo Array containing the copied source references
     * @param {Boolean} deep Whether or not to perform deep cloning.
     * @return {*} The copied value.
     */

    function _clone(value, refFrom, refTo, deep) {
      var copy = function copy(copiedValue) {
        var len = refFrom.length;
        var idx = 0;

        while (idx < len) {
          if (value === refFrom[idx]) {
            return refTo[idx];
          }

          idx += 1;
        }

        refFrom[idx + 1] = value;
        refTo[idx + 1] = copiedValue;

        for (var key in value) {
          copiedValue[key] = deep ? _clone(value[key], refFrom, refTo, true) : value[key];
        }

        return copiedValue;
      };

      switch (type(value)) {
        case 'Object':
          return copy({});

        case 'Array':
          return copy([]);

        case 'Date':
          return new Date(value.valueOf());

        case 'RegExp':
          return _cloneRegExp(value);

        default:
          return value;
      }
    }

    /**
     * Creates a deep copy of the value which may contain (nested) `Array`s and
     * `Object`s, `Number`s, `String`s, `Boolean`s and `Date`s. `Function`s are
     * assigned by reference rather than copied
     *
     * Dispatches to a `clone` method if present.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Object
     * @sig {*} -> {*}
     * @param {*} value The object or array to clone
     * @return {*} A deeply cloned copy of `val`
     * @example
     *
     *      const objects = [{}, {}, {}];
     *      const objectsClone = R.clone(objects);
     *      objects === objectsClone; //=> false
     *      objects[0] === objectsClone[0]; //=> false
     */

    var clone =
    /*#__PURE__*/
    _curry1(function clone(value) {
      return value != null && typeof value.clone === 'function' ? value.clone() : _clone(value, [], [], true);
    });

    /**
     * Makes a comparator function out of a function that reports whether the first
     * element is less than the second.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Function
     * @sig ((a, b) -> Boolean) -> ((a, b) -> Number)
     * @param {Function} pred A predicate function of arity two which will return `true` if the first argument
     * is less than the second, `false` otherwise
     * @return {Function} A Function :: a -> b -> Int that returns `-1` if a < b, `1` if b < a, otherwise `0`
     * @example
     *
     *      const byAge = R.comparator((a, b) => a.age < b.age);
     *      const people = [
     *        { name: 'Emma', age: 70 },
     *        { name: 'Peter', age: 78 },
     *        { name: 'Mikhail', age: 62 },
     *      ];
     *      const peopleByIncreasingAge = R.sort(byAge, people);
     *        //=> [{ name: 'Mikhail', age: 62 },{ name: 'Emma', age: 70 }, { name: 'Peter', age: 78 }]
     */

    var comparator =
    /*#__PURE__*/
    _curry1(function comparator(pred) {
      return function (a, b) {
        return pred(a, b) ? -1 : pred(b, a) ? 1 : 0;
      };
    });

    /**
     * A function that returns the `!` of its argument. It will return `true` when
     * passed false-y value, and `false` when passed a truth-y one.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Logic
     * @sig * -> Boolean
     * @param {*} a any value
     * @return {Boolean} the logical inverse of passed argument.
     * @see R.complement
     * @example
     *
     *      R.not(true); //=> false
     *      R.not(false); //=> true
     *      R.not(0); //=> true
     *      R.not(1); //=> false
     */

    var not =
    /*#__PURE__*/
    _curry1(function not(a) {
      return !a;
    });

    /**
     * Takes a function `f` and returns a function `g` such that if called with the same arguments
     * when `f` returns a "truthy" value, `g` returns `false` and when `f` returns a "falsy" value `g` returns `true`.
     *
     * `R.complement` may be applied to any functor
     *
     * @func
     * @memberOf R
     * @since v0.12.0
     * @category Logic
     * @sig (*... -> *) -> (*... -> Boolean)
     * @param {Function} f
     * @return {Function}
     * @see R.not
     * @example
     *
     *      const isNotNil = R.complement(R.isNil);
     *      isNil(null); //=> true
     *      isNotNil(null); //=> false
     *      isNil(7); //=> false
     *      isNotNil(7); //=> true
     */

    var complement =
    /*#__PURE__*/
    lift(not);

    function _pipe(f, g) {
      return function () {
        return g.call(this, f.apply(this, arguments));
      };
    }

    /**
     * This checks whether a function has a [methodname] function. If it isn't an
     * array it will execute that function otherwise it will default to the ramda
     * implementation.
     *
     * @private
     * @param {Function} fn ramda implemtation
     * @param {String} methodname property to check for a custom implementation
     * @return {Object} Whatever the return value of the method is.
     */

    function _checkForMethod(methodname, fn) {
      return function () {
        var length = arguments.length;

        if (length === 0) {
          return fn();
        }

        var obj = arguments[length - 1];
        return _isArray(obj) || typeof obj[methodname] !== 'function' ? fn.apply(this, arguments) : obj[methodname].apply(obj, Array.prototype.slice.call(arguments, 0, length - 1));
      };
    }

    /**
     * Returns the elements of the given list or string (or object with a `slice`
     * method) from `fromIndex` (inclusive) to `toIndex` (exclusive).
     *
     * Dispatches to the `slice` method of the third argument, if present.
     *
     * @func
     * @memberOf R
     * @since v0.1.4
     * @category List
     * @sig Number -> Number -> [a] -> [a]
     * @sig Number -> Number -> String -> String
     * @param {Number} fromIndex The start index (inclusive).
     * @param {Number} toIndex The end index (exclusive).
     * @param {*} list
     * @return {*}
     * @example
     *
     *      R.slice(1, 3, ['a', 'b', 'c', 'd']);        //=> ['b', 'c']
     *      R.slice(1, Infinity, ['a', 'b', 'c', 'd']); //=> ['b', 'c', 'd']
     *      R.slice(0, -1, ['a', 'b', 'c', 'd']);       //=> ['a', 'b', 'c']
     *      R.slice(-3, -1, ['a', 'b', 'c', 'd']);      //=> ['b', 'c']
     *      R.slice(0, 3, 'ramda');                     //=> 'ram'
     */

    var slice =
    /*#__PURE__*/
    _curry3(
    /*#__PURE__*/
    _checkForMethod('slice', function slice(fromIndex, toIndex, list) {
      return Array.prototype.slice.call(list, fromIndex, toIndex);
    }));

    /**
     * Returns all but the first element of the given list or string (or object
     * with a `tail` method).
     *
     * Dispatches to the `slice` method of the first argument, if present.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig [a] -> [a]
     * @sig String -> String
     * @param {*} list
     * @return {*}
     * @see R.head, R.init, R.last
     * @example
     *
     *      R.tail([1, 2, 3]);  //=> [2, 3]
     *      R.tail([1, 2]);     //=> [2]
     *      R.tail([1]);        //=> []
     *      R.tail([]);         //=> []
     *
     *      R.tail('abc');  //=> 'bc'
     *      R.tail('ab');   //=> 'b'
     *      R.tail('a');    //=> ''
     *      R.tail('');     //=> ''
     */

    var tail =
    /*#__PURE__*/
    _curry1(
    /*#__PURE__*/
    _checkForMethod('tail',
    /*#__PURE__*/
    slice(1, Infinity)));

    /**
     * Performs left-to-right function composition. The first argument may have
     * any arity; the remaining arguments must be unary.
     *
     * In some libraries this function is named `sequence`.
     *
     * **Note:** The result of pipe is not automatically curried.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Function
     * @sig (((a, b, ..., n) -> o), (o -> p), ..., (x -> y), (y -> z)) -> ((a, b, ..., n) -> z)
     * @param {...Function} functions
     * @return {Function}
     * @see R.compose
     * @example
     *
     *      const f = R.pipe(Math.pow, R.negate, R.inc);
     *
     *      f(3, 4); // -(3^4) + 1
     * @symb R.pipe(f, g, h)(a, b) = h(g(f(a, b)))
     */

    function pipe() {
      if (arguments.length === 0) {
        throw new Error('pipe requires at least one argument');
      }

      return _arity(arguments[0].length, reduce(_pipe, arguments[0], tail(arguments)));
    }

    /**
     * Returns a new list or string with the elements or characters in reverse
     * order.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig [a] -> [a]
     * @sig String -> String
     * @param {Array|String} list
     * @return {Array|String}
     * @example
     *
     *      R.reverse([1, 2, 3]);  //=> [3, 2, 1]
     *      R.reverse([1, 2]);     //=> [2, 1]
     *      R.reverse([1]);        //=> [1]
     *      R.reverse([]);         //=> []
     *
     *      R.reverse('abc');      //=> 'cba'
     *      R.reverse('ab');       //=> 'ba'
     *      R.reverse('a');        //=> 'a'
     *      R.reverse('');         //=> ''
     */

    var reverse =
    /*#__PURE__*/
    _curry1(function reverse(list) {
      return _isString(list) ? list.split('').reverse().join('') : Array.prototype.slice.call(list, 0).reverse();
    });

    /**
     * Performs right-to-left function composition. The last argument may have
     * any arity; the remaining arguments must be unary.
     *
     * **Note:** The result of compose is not automatically curried.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Function
     * @sig ((y -> z), (x -> y), ..., (o -> p), ((a, b, ..., n) -> o)) -> ((a, b, ..., n) -> z)
     * @param {...Function} ...functions The functions to compose
     * @return {Function}
     * @see R.pipe
     * @example
     *
     *      const classyGreeting = (firstName, lastName) => "The name's " + lastName + ", " + firstName + " " + lastName
     *      const yellGreeting = R.compose(R.toUpper, classyGreeting);
     *      yellGreeting('James', 'Bond'); //=> "THE NAME'S BOND, JAMES BOND"
     *
     *      R.compose(Math.abs, R.add(1), R.multiply(2))(-4) //=> 7
     *
     * @symb R.compose(f, g, h)(a, b) = f(g(h(a, b)))
     */

    function compose() {
      if (arguments.length === 0) {
        throw new Error('compose requires at least one argument');
      }

      return pipe.apply(this, reverse(arguments));
    }

    /**
     * Returns the right-to-left Kleisli composition of the provided functions,
     * each of which must return a value of a type supported by [`chain`](#chain).
     *
     * `R.composeK(h, g, f)` is equivalent to `R.compose(R.chain(h), R.chain(g), f)`.
     *
     * @func
     * @memberOf R
     * @since v0.16.0
     * @category Function
     * @sig Chain m => ((y -> m z), (x -> m y), ..., (a -> m b)) -> (a -> m z)
     * @param {...Function} ...functions The functions to compose
     * @return {Function}
     * @see R.pipeK
     * @deprecated since v0.26.0
     * @example
     *
     *       //  get :: String -> Object -> Maybe *
     *       const get = R.curry((propName, obj) => Maybe(obj[propName]))
     *
     *       //  getStateCode :: Maybe String -> Maybe String
     *       const getStateCode = R.composeK(
     *         R.compose(Maybe.of, R.toUpper),
     *         get('state'),
     *         get('address'),
     *         get('user'),
     *       );
     *       getStateCode({"user":{"address":{"state":"ny"}}}); //=> Maybe.Just("NY")
     *       getStateCode({}); //=> Maybe.Nothing()
     * @symb R.composeK(f, g, h)(a) = R.chain(f, R.chain(g, h(a)))
     */

    function composeK() {
      if (arguments.length === 0) {
        throw new Error('composeK requires at least one argument');
      }

      var init = Array.prototype.slice.call(arguments);
      var last = init.pop();
      return compose(compose.apply(this, map(chain, init)), last);
    }

    function _pipeP(f, g) {
      return function () {
        var ctx = this;
        return f.apply(ctx, arguments).then(function (x) {
          return g.call(ctx, x);
        });
      };
    }

    /**
     * Performs left-to-right composition of one or more Promise-returning
     * functions. The first argument may have any arity; the remaining arguments
     * must be unary.
     *
     * @func
     * @memberOf R
     * @since v0.10.0
     * @category Function
     * @sig ((a -> Promise b), (b -> Promise c), ..., (y -> Promise z)) -> (a -> Promise z)
     * @param {...Function} functions
     * @return {Function}
     * @see R.composeP
     * @deprecated since v0.26.0
     * @example
     *
     *      //  followersForUser :: String -> Promise [User]
     *      const followersForUser = R.pipeP(db.getUserById, db.getFollowers);
     */

    function pipeP() {
      if (arguments.length === 0) {
        throw new Error('pipeP requires at least one argument');
      }

      return _arity(arguments[0].length, reduce(_pipeP, arguments[0], tail(arguments)));
    }

    /**
     * Performs right-to-left composition of one or more Promise-returning
     * functions. The last arguments may have any arity; the remaining
     * arguments must be unary.
     *
     * @func
     * @memberOf R
     * @since v0.10.0
     * @category Function
     * @sig ((y -> Promise z), (x -> Promise y), ..., (a -> Promise b)) -> (a -> Promise z)
     * @param {...Function} functions The functions to compose
     * @return {Function}
     * @see R.pipeP
     * @deprecated since v0.26.0
     * @example
     *
     *      const db = {
     *        users: {
     *          JOE: {
     *            name: 'Joe',
     *            followers: ['STEVE', 'SUZY']
     *          }
     *        }
     *      }
     *
     *      // We'll pretend to do a db lookup which returns a promise
     *      const lookupUser = (userId) => Promise.resolve(db.users[userId])
     *      const lookupFollowers = (user) => Promise.resolve(user.followers)
     *      lookupUser('JOE').then(lookupFollowers)
     *
     *      //  followersForUser :: String -> Promise [UserId]
     *      const followersForUser = R.composeP(lookupFollowers, lookupUser);
     *      followersForUser('JOE').then(followers => console.log('Followers:', followers))
     *      // Followers: ["STEVE","SUZY"]
     */

    function composeP() {
      if (arguments.length === 0) {
        throw new Error('composeP requires at least one argument');
      }

      return pipeP.apply(this, reverse(arguments));
    }

    /**
     * Returns the first element of the given list or string. In some libraries
     * this function is named `first`.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig [a] -> a | Undefined
     * @sig String -> String
     * @param {Array|String} list
     * @return {*}
     * @see R.tail, R.init, R.last
     * @example
     *
     *      R.head(['fi', 'fo', 'fum']); //=> 'fi'
     *      R.head([]); //=> undefined
     *
     *      R.head('abc'); //=> 'a'
     *      R.head(''); //=> ''
     */

    var head =
    /*#__PURE__*/
    nth(0);

    function _identity(x) {
      return x;
    }

    /**
     * A function that does nothing but return the parameter supplied to it. Good
     * as a default or placeholder function.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Function
     * @sig a -> a
     * @param {*} x The value to return.
     * @return {*} The input value, `x`.
     * @example
     *
     *      R.identity(1); //=> 1
     *
     *      const obj = {};
     *      R.identity(obj) === obj; //=> true
     * @symb R.identity(a) = a
     */

    var identity =
    /*#__PURE__*/
    _curry1(_identity);

    /**
     * Performs left-to-right function composition using transforming function. The first argument may have
     * any arity; the remaining arguments must be unary.
     *
     * **Note:** The result of pipeWith is not automatically curried. Transforming function is not used on the
     * first argument.
     *
     * @func
     * @memberOf R
     * @since v0.26.0
     * @category Function
     * @sig ((* -> *), [((a, b, ..., n) -> o), (o -> p), ..., (x -> y), (y -> z)]) -> ((a, b, ..., n) -> z)
     * @param {...Function} functions
     * @return {Function}
     * @see R.composeWith, R.pipe
     * @example
     *
     *      const pipeWhileNotNil = R.pipeWith((f, res) => R.isNil(res) ? res : f(res));
     *      const f = pipeWhileNotNil([Math.pow, R.negate, R.inc])
     *
     *      f(3, 4); // -(3^4) + 1
     * @symb R.pipeWith(f)([g, h, i])(...args) = f(i, f(h, g(...args)))
     */

    var pipeWith =
    /*#__PURE__*/
    _curry2(function pipeWith(xf, list) {
      if (list.length <= 0) {
        return identity;
      }

      var headList = head(list);
      var tailList = tail(list);
      return _arity(headList.length, function () {
        return _reduce(function (result, f) {
          return xf.call(this, f, result);
        }, headList.apply(this, arguments), tailList);
      });
    });

    /**
     * Performs right-to-left function composition using transforming function. The last argument may have
     * any arity; the remaining arguments must be unary.
     *
     * **Note:** The result of compose is not automatically curried. Transforming function is not used on the
     * last argument.
     *
     * @func
     * @memberOf R
     * @since v0.26.0
     * @category Function
     * @sig ((* -> *), [(y -> z), (x -> y), ..., (o -> p), ((a, b, ..., n) -> o)]) -> ((a, b, ..., n) -> z)
     * @param {...Function} ...functions The functions to compose
     * @return {Function}
     * @see R.compose, R.pipeWith
     * @example
     *
     *      const composeWhileNotNil = R.composeWith((f, res) => R.isNil(res) ? res : f(res));
     *
     *      composeWhileNotNil([R.inc, R.prop('age')])({age: 1}) //=> 2
     *      composeWhileNotNil([R.inc, R.prop('age')])({}) //=> undefined
     *
     * @symb R.composeWith(f)([g, h, i])(...args) = f(g, f(h, i(...args)))
     */

    var composeWith =
    /*#__PURE__*/
    _curry2(function composeWith(xf, list) {
      return pipeWith.apply(this, [xf, reverse(list)]);
    });

    function _arrayFromIterator(iter) {
      var list = [];
      var next;

      while (!(next = iter.next()).done) {
        list.push(next.value);
      }

      return list;
    }

    function _includesWith(pred, x, list) {
      var idx = 0;
      var len = list.length;

      while (idx < len) {
        if (pred(x, list[idx])) {
          return true;
        }

        idx += 1;
      }

      return false;
    }

    function _functionName(f) {
      // String(x => x) evaluates to "x => x", so the pattern may not match.
      var match = String(f).match(/^function (\w*)/);
      return match == null ? '' : match[1];
    }

    // Based on https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
    function _objectIs(a, b) {
      // SameValue algorithm
      if (a === b) {
        // Steps 1-5, 7-10
        // Steps 6.b-6.e: +0 != -0
        return a !== 0 || 1 / a === 1 / b;
      } else {
        // Step 6.a: NaN == NaN
        return a !== a && b !== b;
      }
    }

    var _objectIs$1 = typeof Object.is === 'function' ? Object.is : _objectIs;

    /**
     * private _uniqContentEquals function.
     * That function is checking equality of 2 iterator contents with 2 assumptions
     * - iterators lengths are the same
     * - iterators values are unique
     *
     * false-positive result will be returned for comparision of, e.g.
     * - [1,2,3] and [1,2,3,4]
     * - [1,1,1] and [1,2,3]
     * */

    function _uniqContentEquals(aIterator, bIterator, stackA, stackB) {
      var a = _arrayFromIterator(aIterator);

      var b = _arrayFromIterator(bIterator);

      function eq(_a, _b) {
        return _equals(_a, _b, stackA.slice(), stackB.slice());
      } // if *a* array contains any element that is not included in *b*


      return !_includesWith(function (b, aItem) {
        return !_includesWith(eq, aItem, b);
      }, b, a);
    }

    function _equals(a, b, stackA, stackB) {
      if (_objectIs$1(a, b)) {
        return true;
      }

      var typeA = type(a);

      if (typeA !== type(b)) {
        return false;
      }

      if (a == null || b == null) {
        return false;
      }

      if (typeof a['fantasy-land/equals'] === 'function' || typeof b['fantasy-land/equals'] === 'function') {
        return typeof a['fantasy-land/equals'] === 'function' && a['fantasy-land/equals'](b) && typeof b['fantasy-land/equals'] === 'function' && b['fantasy-land/equals'](a);
      }

      if (typeof a.equals === 'function' || typeof b.equals === 'function') {
        return typeof a.equals === 'function' && a.equals(b) && typeof b.equals === 'function' && b.equals(a);
      }

      switch (typeA) {
        case 'Arguments':
        case 'Array':
        case 'Object':
          if (typeof a.constructor === 'function' && _functionName(a.constructor) === 'Promise') {
            return a === b;
          }

          break;

        case 'Boolean':
        case 'Number':
        case 'String':
          if (!(typeof a === typeof b && _objectIs$1(a.valueOf(), b.valueOf()))) {
            return false;
          }

          break;

        case 'Date':
          if (!_objectIs$1(a.valueOf(), b.valueOf())) {
            return false;
          }

          break;

        case 'Error':
          return a.name === b.name && a.message === b.message;

        case 'RegExp':
          if (!(a.source === b.source && a.global === b.global && a.ignoreCase === b.ignoreCase && a.multiline === b.multiline && a.sticky === b.sticky && a.unicode === b.unicode)) {
            return false;
          }

          break;
      }

      var idx = stackA.length - 1;

      while (idx >= 0) {
        if (stackA[idx] === a) {
          return stackB[idx] === b;
        }

        idx -= 1;
      }

      switch (typeA) {
        case 'Map':
          if (a.size !== b.size) {
            return false;
          }

          return _uniqContentEquals(a.entries(), b.entries(), stackA.concat([a]), stackB.concat([b]));

        case 'Set':
          if (a.size !== b.size) {
            return false;
          }

          return _uniqContentEquals(a.values(), b.values(), stackA.concat([a]), stackB.concat([b]));

        case 'Arguments':
        case 'Array':
        case 'Object':
        case 'Boolean':
        case 'Number':
        case 'String':
        case 'Date':
        case 'Error':
        case 'RegExp':
        case 'Int8Array':
        case 'Uint8Array':
        case 'Uint8ClampedArray':
        case 'Int16Array':
        case 'Uint16Array':
        case 'Int32Array':
        case 'Uint32Array':
        case 'Float32Array':
        case 'Float64Array':
        case 'ArrayBuffer':
          break;

        default:
          // Values of other types are only equal if identical.
          return false;
      }

      var keysA = keys(a);

      if (keysA.length !== keys(b).length) {
        return false;
      }

      var extendedStackA = stackA.concat([a]);
      var extendedStackB = stackB.concat([b]);
      idx = keysA.length - 1;

      while (idx >= 0) {
        var key = keysA[idx];

        if (!(_has(key, b) && _equals(b[key], a[key], extendedStackA, extendedStackB))) {
          return false;
        }

        idx -= 1;
      }

      return true;
    }

    /**
     * Returns `true` if its arguments are equivalent, `false` otherwise. Handles
     * cyclical data structures.
     *
     * Dispatches symmetrically to the `equals` methods of both arguments, if
     * present.
     *
     * @func
     * @memberOf R
     * @since v0.15.0
     * @category Relation
     * @sig a -> b -> Boolean
     * @param {*} a
     * @param {*} b
     * @return {Boolean}
     * @example
     *
     *      R.equals(1, 1); //=> true
     *      R.equals(1, '1'); //=> false
     *      R.equals([1, 2, 3], [1, 2, 3]); //=> true
     *
     *      const a = {}; a.v = a;
     *      const b = {}; b.v = b;
     *      R.equals(a, b); //=> true
     */

    var equals =
    /*#__PURE__*/
    _curry2(function equals(a, b) {
      return _equals(a, b, [], []);
    });

    function _indexOf(list, a, idx) {
      var inf, item; // Array.prototype.indexOf doesn't exist below IE9

      if (typeof list.indexOf === 'function') {
        switch (typeof a) {
          case 'number':
            if (a === 0) {
              // manually crawl the list to distinguish between +0 and -0
              inf = 1 / a;

              while (idx < list.length) {
                item = list[idx];

                if (item === 0 && 1 / item === inf) {
                  return idx;
                }

                idx += 1;
              }

              return -1;
            } else if (a !== a) {
              // NaN
              while (idx < list.length) {
                item = list[idx];

                if (typeof item === 'number' && item !== item) {
                  return idx;
                }

                idx += 1;
              }

              return -1;
            } // non-zero numbers can utilise Set


            return list.indexOf(a, idx);
          // all these types can utilise Set

          case 'string':
          case 'boolean':
          case 'function':
          case 'undefined':
            return list.indexOf(a, idx);

          case 'object':
            if (a === null) {
              // null can utilise Set
              return list.indexOf(a, idx);
            }

        }
      } // anything else not covered above, defer to R.equals


      while (idx < list.length) {
        if (equals(list[idx], a)) {
          return idx;
        }

        idx += 1;
      }

      return -1;
    }

    function _includes(a, list) {
      return _indexOf(list, a, 0) >= 0;
    }

    function _quote(s) {
      var escaped = s.replace(/\\/g, '\\\\').replace(/[\b]/g, '\\b') // \b matches word boundary; [\b] matches backspace
      .replace(/\f/g, '\\f').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t').replace(/\v/g, '\\v').replace(/\0/g, '\\0');
      return '"' + escaped.replace(/"/g, '\\"') + '"';
    }

    /**
     * Polyfill from <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString>.
     */
    var pad = function pad(n) {
      return (n < 10 ? '0' : '') + n;
    };

    var _toISOString = typeof Date.prototype.toISOString === 'function' ? function _toISOString(d) {
      return d.toISOString();
    } : function _toISOString(d) {
      return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + '.' + (d.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) + 'Z';
    };

    function _complement(f) {
      return function () {
        return !f.apply(this, arguments);
      };
    }

    function _filter(fn, list) {
      var idx = 0;
      var len = list.length;
      var result = [];

      while (idx < len) {
        if (fn(list[idx])) {
          result[result.length] = list[idx];
        }

        idx += 1;
      }

      return result;
    }

    function _isObject(x) {
      return Object.prototype.toString.call(x) === '[object Object]';
    }

    var XFilter =
    /*#__PURE__*/
    function () {
      function XFilter(f, xf) {
        this.xf = xf;
        this.f = f;
      }

      XFilter.prototype['@@transducer/init'] = _xfBase.init;
      XFilter.prototype['@@transducer/result'] = _xfBase.result;

      XFilter.prototype['@@transducer/step'] = function (result, input) {
        return this.f(input) ? this.xf['@@transducer/step'](result, input) : result;
      };

      return XFilter;
    }();

    var _xfilter =
    /*#__PURE__*/
    _curry2(function _xfilter(f, xf) {
      return new XFilter(f, xf);
    });

    /**
     * Takes a predicate and a `Filterable`, and returns a new filterable of the
     * same type containing the members of the given filterable which satisfy the
     * given predicate. Filterable objects include plain objects or any object
     * that has a filter method such as `Array`.
     *
     * Dispatches to the `filter` method of the second argument, if present.
     *
     * Acts as a transducer if a transformer is given in list position.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig Filterable f => (a -> Boolean) -> f a -> f a
     * @param {Function} pred
     * @param {Array} filterable
     * @return {Array} Filterable
     * @see R.reject, R.transduce, R.addIndex
     * @example
     *
     *      const isEven = n => n % 2 === 0;
     *
     *      R.filter(isEven, [1, 2, 3, 4]); //=> [2, 4]
     *
     *      R.filter(isEven, {a: 1, b: 2, c: 3, d: 4}); //=> {b: 2, d: 4}
     */

    var filter =
    /*#__PURE__*/
    _curry2(
    /*#__PURE__*/
    _dispatchable(['filter'], _xfilter, function (pred, filterable) {
      return _isObject(filterable) ? _reduce(function (acc, key) {
        if (pred(filterable[key])) {
          acc[key] = filterable[key];
        }

        return acc;
      }, {}, keys(filterable)) : // else
      _filter(pred, filterable);
    }));

    /**
     * The complement of [`filter`](#filter).
     *
     * Acts as a transducer if a transformer is given in list position. Filterable
     * objects include plain objects or any object that has a filter method such
     * as `Array`.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig Filterable f => (a -> Boolean) -> f a -> f a
     * @param {Function} pred
     * @param {Array} filterable
     * @return {Array}
     * @see R.filter, R.transduce, R.addIndex
     * @example
     *
     *      const isOdd = (n) => n % 2 === 1;
     *
     *      R.reject(isOdd, [1, 2, 3, 4]); //=> [2, 4]
     *
     *      R.reject(isOdd, {a: 1, b: 2, c: 3, d: 4}); //=> {b: 2, d: 4}
     */

    var reject =
    /*#__PURE__*/
    _curry2(function reject(pred, filterable) {
      return filter(_complement(pred), filterable);
    });

    function _toString(x, seen) {
      var recur = function recur(y) {
        var xs = seen.concat([x]);
        return _includes(y, xs) ? '<Circular>' : _toString(y, xs);
      }; //  mapPairs :: (Object, [String]) -> [String]


      var mapPairs = function (obj, keys) {
        return _map(function (k) {
          return _quote(k) + ': ' + recur(obj[k]);
        }, keys.slice().sort());
      };

      switch (Object.prototype.toString.call(x)) {
        case '[object Arguments]':
          return '(function() { return arguments; }(' + _map(recur, x).join(', ') + '))';

        case '[object Array]':
          return '[' + _map(recur, x).concat(mapPairs(x, reject(function (k) {
            return /^\d+$/.test(k);
          }, keys(x)))).join(', ') + ']';

        case '[object Boolean]':
          return typeof x === 'object' ? 'new Boolean(' + recur(x.valueOf()) + ')' : x.toString();

        case '[object Date]':
          return 'new Date(' + (isNaN(x.valueOf()) ? recur(NaN) : _quote(_toISOString(x))) + ')';

        case '[object Null]':
          return 'null';

        case '[object Number]':
          return typeof x === 'object' ? 'new Number(' + recur(x.valueOf()) + ')' : 1 / x === -Infinity ? '-0' : x.toString(10);

        case '[object String]':
          return typeof x === 'object' ? 'new String(' + recur(x.valueOf()) + ')' : _quote(x);

        case '[object Undefined]':
          return 'undefined';

        default:
          if (typeof x.toString === 'function') {
            var repr = x.toString();

            if (repr !== '[object Object]') {
              return repr;
            }
          }

          return '{' + mapPairs(x, keys(x)).join(', ') + '}';
      }
    }

    /**
     * Returns the string representation of the given value. `eval`'ing the output
     * should result in a value equivalent to the input value. Many of the built-in
     * `toString` methods do not satisfy this requirement.
     *
     * If the given value is an `[object Object]` with a `toString` method other
     * than `Object.prototype.toString`, this method is invoked with no arguments
     * to produce the return value. This means user-defined constructor functions
     * can provide a suitable `toString` method. For example:
     *
     *     function Point(x, y) {
     *       this.x = x;
     *       this.y = y;
     *     }
     *
     *     Point.prototype.toString = function() {
     *       return 'new Point(' + this.x + ', ' + this.y + ')';
     *     };
     *
     *     R.toString(new Point(1, 2)); //=> 'new Point(1, 2)'
     *
     * @func
     * @memberOf R
     * @since v0.14.0
     * @category String
     * @sig * -> String
     * @param {*} val
     * @return {String}
     * @example
     *
     *      R.toString(42); //=> '42'
     *      R.toString('abc'); //=> '"abc"'
     *      R.toString([1, 2, 3]); //=> '[1, 2, 3]'
     *      R.toString({foo: 1, bar: 2, baz: 3}); //=> '{"bar": 2, "baz": 3, "foo": 1}'
     *      R.toString(new Date('2001-02-03T04:05:06Z')); //=> 'new Date("2001-02-03T04:05:06.000Z")'
     */

    var toString$1 =
    /*#__PURE__*/
    _curry1(function toString(val) {
      return _toString(val, []);
    });

    /**
     * Returns the result of concatenating the given lists or strings.
     *
     * Note: `R.concat` expects both arguments to be of the same type,
     * unlike the native `Array.prototype.concat` method. It will throw
     * an error if you `concat` an Array with a non-Array value.
     *
     * Dispatches to the `concat` method of the first argument, if present.
     * Can also concatenate two members of a [fantasy-land
     * compatible semigroup](https://github.com/fantasyland/fantasy-land#semigroup).
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig [a] -> [a] -> [a]
     * @sig String -> String -> String
     * @param {Array|String} firstList The first list
     * @param {Array|String} secondList The second list
     * @return {Array|String} A list consisting of the elements of `firstList` followed by the elements of
     * `secondList`.
     *
     * @example
     *
     *      R.concat('ABC', 'DEF'); // 'ABCDEF'
     *      R.concat([4, 5, 6], [1, 2, 3]); //=> [4, 5, 6, 1, 2, 3]
     *      R.concat([], []); //=> []
     */

    var concat =
    /*#__PURE__*/
    _curry2(function concat(a, b) {
      if (_isArray(a)) {
        if (_isArray(b)) {
          return a.concat(b);
        }

        throw new TypeError(toString$1(b) + ' is not an array');
      }

      if (_isString(a)) {
        if (_isString(b)) {
          return a + b;
        }

        throw new TypeError(toString$1(b) + ' is not a string');
      }

      if (a != null && _isFunction(a['fantasy-land/concat'])) {
        return a['fantasy-land/concat'](b);
      }

      if (a != null && _isFunction(a.concat)) {
        return a.concat(b);
      }

      throw new TypeError(toString$1(a) + ' does not have a method named "concat" or "fantasy-land/concat"');
    });

    /**
     * Returns a function, `fn`, which encapsulates `if/else, if/else, ...` logic.
     * `R.cond` takes a list of [predicate, transformer] pairs. All of the arguments
     * to `fn` are applied to each of the predicates in turn until one returns a
     * "truthy" value, at which point `fn` returns the result of applying its
     * arguments to the corresponding transformer. If none of the predicates
     * matches, `fn` returns undefined.
     *
     * @func
     * @memberOf R
     * @since v0.6.0
     * @category Logic
     * @sig [[(*... -> Boolean),(*... -> *)]] -> (*... -> *)
     * @param {Array} pairs A list of [predicate, transformer]
     * @return {Function}
     * @see R.ifElse, R.unless, R.when
     * @example
     *
     *      const fn = R.cond([
     *        [R.equals(0),   R.always('water freezes at 0°C')],
     *        [R.equals(100), R.always('water boils at 100°C')],
     *        [R.T,           temp => 'nothing special happens at ' + temp + '°C']
     *      ]);
     *      fn(0); //=> 'water freezes at 0°C'
     *      fn(50); //=> 'nothing special happens at 50°C'
     *      fn(100); //=> 'water boils at 100°C'
     */

    var cond =
    /*#__PURE__*/
    _curry1(function cond(pairs) {
      var arity = reduce(max, 0, map(function (pair) {
        return pair[0].length;
      }, pairs));
      return _arity(arity, function () {
        var idx = 0;

        while (idx < pairs.length) {
          if (pairs[idx][0].apply(this, arguments)) {
            return pairs[idx][1].apply(this, arguments);
          }

          idx += 1;
        }
      });
    });

    /**
     * Wraps a constructor function inside a curried function that can be called
     * with the same arguments and returns the same type. The arity of the function
     * returned is specified to allow using variadic constructor functions.
     *
     * @func
     * @memberOf R
     * @since v0.4.0
     * @category Function
     * @sig Number -> (* -> {*}) -> (* -> {*})
     * @param {Number} n The arity of the constructor function.
     * @param {Function} Fn The constructor function to wrap.
     * @return {Function} A wrapped, curried constructor function.
     * @example
     *
     *      // Variadic Constructor function
     *      function Salad() {
     *        this.ingredients = arguments;
     *      }
     *
     *      Salad.prototype.recipe = function() {
     *        const instructions = R.map(ingredient => 'Add a dollop of ' + ingredient, this.ingredients);
     *        return R.join('\n', instructions);
     *      };
     *
     *      const ThreeLayerSalad = R.constructN(3, Salad);
     *
     *      // Notice we no longer need the 'new' keyword, and the constructor is curried for 3 arguments.
     *      const salad = ThreeLayerSalad('Mayonnaise')('Potato Chips')('Ketchup');
     *
     *      console.log(salad.recipe());
     *      // Add a dollop of Mayonnaise
     *      // Add a dollop of Potato Chips
     *      // Add a dollop of Ketchup
     */

    var constructN =
    /*#__PURE__*/
    _curry2(function constructN(n, Fn) {
      if (n > 10) {
        throw new Error('Constructor with greater than ten arguments');
      }

      if (n === 0) {
        return function () {
          return new Fn();
        };
      }

      return curry(nAry(n, function ($0, $1, $2, $3, $4, $5, $6, $7, $8, $9) {
        switch (arguments.length) {
          case 1:
            return new Fn($0);

          case 2:
            return new Fn($0, $1);

          case 3:
            return new Fn($0, $1, $2);

          case 4:
            return new Fn($0, $1, $2, $3);

          case 5:
            return new Fn($0, $1, $2, $3, $4);

          case 6:
            return new Fn($0, $1, $2, $3, $4, $5);

          case 7:
            return new Fn($0, $1, $2, $3, $4, $5, $6);

          case 8:
            return new Fn($0, $1, $2, $3, $4, $5, $6, $7);

          case 9:
            return new Fn($0, $1, $2, $3, $4, $5, $6, $7, $8);

          case 10:
            return new Fn($0, $1, $2, $3, $4, $5, $6, $7, $8, $9);
        }
      }));
    });

    /**
     * Wraps a constructor function inside a curried function that can be called
     * with the same arguments and returns the same type.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Function
     * @sig (* -> {*}) -> (* -> {*})
     * @param {Function} fn The constructor function to wrap.
     * @return {Function} A wrapped, curried constructor function.
     * @see R.invoker
     * @example
     *
     *      // Constructor function
     *      function Animal(kind) {
     *        this.kind = kind;
     *      };
     *      Animal.prototype.sighting = function() {
     *        return "It's a " + this.kind + "!";
     *      }
     *
     *      const AnimalConstructor = R.construct(Animal)
     *
     *      // Notice we no longer need the 'new' keyword:
     *      AnimalConstructor('Pig'); //=> {"kind": "Pig", "sighting": function (){...}};
     *
     *      const animalTypes = ["Lion", "Tiger", "Bear"];
     *      const animalSighting = R.invoker(0, 'sighting');
     *      const sightNewAnimal = R.compose(animalSighting, AnimalConstructor);
     *      R.map(sightNewAnimal, animalTypes); //=> ["It's a Lion!", "It's a Tiger!", "It's a Bear!"]
     */

    var construct =
    /*#__PURE__*/
    _curry1(function construct(Fn) {
      return constructN(Fn.length, Fn);
    });

    /**
     * Returns `true` if the specified value is equal, in [`R.equals`](#equals)
     * terms, to at least one element of the given list; `false` otherwise.
     * Works also with strings.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig a -> [a] -> Boolean
     * @param {Object} a The item to compare against.
     * @param {Array} list The array to consider.
     * @return {Boolean} `true` if an equivalent item is in the list, `false` otherwise.
     * @see R.includes
     * @deprecated since v0.26.0
     * @example
     *
     *      R.contains(3, [1, 2, 3]); //=> true
     *      R.contains(4, [1, 2, 3]); //=> false
     *      R.contains({ name: 'Fred' }, [{ name: 'Fred' }]); //=> true
     *      R.contains([42], [[42]]); //=> true
     *      R.contains('ba', 'banana'); //=>true
     */

    var contains$1 =
    /*#__PURE__*/
    _curry2(_includes);

    /**
     * Accepts a converging function and a list of branching functions and returns
     * a new function. The arity of the new function is the same as the arity of
     * the longest branching function. When invoked, this new function is applied
     * to some arguments, and each branching function is applied to those same
     * arguments. The results of each branching function are passed as arguments
     * to the converging function to produce the return value.
     *
     * @func
     * @memberOf R
     * @since v0.4.2
     * @category Function
     * @sig ((x1, x2, ...) -> z) -> [((a, b, ...) -> x1), ((a, b, ...) -> x2), ...] -> (a -> b -> ... -> z)
     * @param {Function} after A function. `after` will be invoked with the return values of
     *        `fn1` and `fn2` as its arguments.
     * @param {Array} functions A list of functions.
     * @return {Function} A new function.
     * @see R.useWith
     * @example
     *
     *      const average = R.converge(R.divide, [R.sum, R.length])
     *      average([1, 2, 3, 4, 5, 6, 7]) //=> 4
     *
     *      const strangeConcat = R.converge(R.concat, [R.toUpper, R.toLower])
     *      strangeConcat("Yodel") //=> "YODELyodel"
     *
     * @symb R.converge(f, [g, h])(a, b) = f(g(a, b), h(a, b))
     */

    var converge =
    /*#__PURE__*/
    _curry2(function converge(after, fns) {
      return curryN(reduce(max, 0, pluck('length', fns)), function () {
        var args = arguments;
        var context = this;
        return after.apply(context, _map(function (fn) {
          return fn.apply(context, args);
        }, fns));
      });
    });

    var XReduceBy =
    /*#__PURE__*/
    function () {
      function XReduceBy(valueFn, valueAcc, keyFn, xf) {
        this.valueFn = valueFn;
        this.valueAcc = valueAcc;
        this.keyFn = keyFn;
        this.xf = xf;
        this.inputs = {};
      }

      XReduceBy.prototype['@@transducer/init'] = _xfBase.init;

      XReduceBy.prototype['@@transducer/result'] = function (result) {
        var key;

        for (key in this.inputs) {
          if (_has(key, this.inputs)) {
            result = this.xf['@@transducer/step'](result, this.inputs[key]);

            if (result['@@transducer/reduced']) {
              result = result['@@transducer/value'];
              break;
            }
          }
        }

        this.inputs = null;
        return this.xf['@@transducer/result'](result);
      };

      XReduceBy.prototype['@@transducer/step'] = function (result, input) {
        var key = this.keyFn(input);
        this.inputs[key] = this.inputs[key] || [key, this.valueAcc];
        this.inputs[key][1] = this.valueFn(this.inputs[key][1], input);
        return result;
      };

      return XReduceBy;
    }();

    var _xreduceBy =
    /*#__PURE__*/
    _curryN(4, [], function _xreduceBy(valueFn, valueAcc, keyFn, xf) {
      return new XReduceBy(valueFn, valueAcc, keyFn, xf);
    });

    /**
     * Groups the elements of the list according to the result of calling
     * the String-returning function `keyFn` on each element and reduces the elements
     * of each group to a single value via the reducer function `valueFn`.
     *
     * This function is basically a more general [`groupBy`](#groupBy) function.
     *
     * Acts as a transducer if a transformer is given in list position.
     *
     * @func
     * @memberOf R
     * @since v0.20.0
     * @category List
     * @sig ((a, b) -> a) -> a -> (b -> String) -> [b] -> {String: a}
     * @param {Function} valueFn The function that reduces the elements of each group to a single
     *        value. Receives two values, accumulator for a particular group and the current element.
     * @param {*} acc The (initial) accumulator value for each group.
     * @param {Function} keyFn The function that maps the list's element into a key.
     * @param {Array} list The array to group.
     * @return {Object} An object with the output of `keyFn` for keys, mapped to the output of
     *         `valueFn` for elements which produced that key when passed to `keyFn`.
     * @see R.groupBy, R.reduce
     * @example
     *
     *      const groupNames = (acc, {name}) => acc.concat(name)
     *      const toGrade = ({score}) =>
     *        score < 65 ? 'F' :
     *        score < 70 ? 'D' :
     *        score < 80 ? 'C' :
     *        score < 90 ? 'B' : 'A'
     *
     *      var students = [
     *        {name: 'Abby', score: 83},
     *        {name: 'Bart', score: 62},
     *        {name: 'Curt', score: 88},
     *        {name: 'Dora', score: 92},
     *      ]
     *
     *      reduceBy(groupNames, [], toGrade, students)
     *      //=> {"A": ["Dora"], "B": ["Abby", "Curt"], "F": ["Bart"]}
     */

    var reduceBy =
    /*#__PURE__*/
    _curryN(4, [],
    /*#__PURE__*/
    _dispatchable([], _xreduceBy, function reduceBy(valueFn, valueAcc, keyFn, list) {
      return _reduce(function (acc, elt) {
        var key = keyFn(elt);
        acc[key] = valueFn(_has(key, acc) ? acc[key] : _clone(valueAcc, [], [], false), elt);
        return acc;
      }, {}, list);
    }));

    /**
     * Counts the elements of a list according to how many match each value of a
     * key generated by the supplied function. Returns an object mapping the keys
     * produced by `fn` to the number of occurrences in the list. Note that all
     * keys are coerced to strings because of how JavaScript objects work.
     *
     * Acts as a transducer if a transformer is given in list position.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Relation
     * @sig (a -> String) -> [a] -> {*}
     * @param {Function} fn The function used to map values to keys.
     * @param {Array} list The list to count elements from.
     * @return {Object} An object mapping keys to number of occurrences in the list.
     * @example
     *
     *      const numbers = [1.0, 1.1, 1.2, 2.0, 3.0, 2.2];
     *      R.countBy(Math.floor)(numbers);    //=> {'1': 3, '2': 2, '3': 1}
     *
     *      const letters = ['a', 'b', 'A', 'a', 'B', 'c'];
     *      R.countBy(R.toLower)(letters);   //=> {'a': 3, 'b': 2, 'c': 1}
     */

    var countBy =
    /*#__PURE__*/
    reduceBy(function (acc, elem) {
      return acc + 1;
    }, 0);

    /**
     * Decrements its argument.
     *
     * @func
     * @memberOf R
     * @since v0.9.0
     * @category Math
     * @sig Number -> Number
     * @param {Number} n
     * @return {Number} n - 1
     * @see R.inc
     * @example
     *
     *      R.dec(42); //=> 41
     */

    var dec =
    /*#__PURE__*/
    add(-1);

    /**
     * Returns the second argument if it is not `null`, `undefined` or `NaN`;
     * otherwise the first argument is returned.
     *
     * @func
     * @memberOf R
     * @since v0.10.0
     * @category Logic
     * @sig a -> b -> a | b
     * @param {a} default The default value.
     * @param {b} val `val` will be returned instead of `default` unless `val` is `null`, `undefined` or `NaN`.
     * @return {*} The second value if it is not `null`, `undefined` or `NaN`, otherwise the default value
     * @example
     *
     *      const defaultTo42 = R.defaultTo(42);
     *
     *      defaultTo42(null);  //=> 42
     *      defaultTo42(undefined);  //=> 42
     *      defaultTo42(false);  //=> false
     *      defaultTo42('Ramda');  //=> 'Ramda'
     *      // parseInt('string') results in NaN
     *      defaultTo42(parseInt('string')); //=> 42
     */

    var defaultTo =
    /*#__PURE__*/
    _curry2(function defaultTo(d, v) {
      return v == null || v !== v ? d : v;
    });

    /**
     * Makes a descending comparator function out of a function that returns a value
     * that can be compared with `<` and `>`.
     *
     * @func
     * @memberOf R
     * @since v0.23.0
     * @category Function
     * @sig Ord b => (a -> b) -> a -> a -> Number
     * @param {Function} fn A function of arity one that returns a value that can be compared
     * @param {*} a The first item to be compared.
     * @param {*} b The second item to be compared.
     * @return {Number} `-1` if fn(a) > fn(b), `1` if fn(b) > fn(a), otherwise `0`
     * @see R.ascend
     * @example
     *
     *      const byAge = R.descend(R.prop('age'));
     *      const people = [
     *        { name: 'Emma', age: 70 },
     *        { name: 'Peter', age: 78 },
     *        { name: 'Mikhail', age: 62 },
     *      ];
     *      const peopleByOldestFirst = R.sort(byAge, people);
     *        //=> [{ name: 'Peter', age: 78 }, { name: 'Emma', age: 70 }, { name: 'Mikhail', age: 62 }]
     */

    var descend =
    /*#__PURE__*/
    _curry3(function descend(fn, a, b) {
      var aa = fn(a);
      var bb = fn(b);
      return aa > bb ? -1 : aa < bb ? 1 : 0;
    });

    var _Set =
    /*#__PURE__*/
    function () {
      function _Set() {
        /* globals Set */
        this._nativeSet = typeof Set === 'function' ? new Set() : null;
        this._items = {};
      }

      // until we figure out why jsdoc chokes on this
      // @param item The item to add to the Set
      // @returns {boolean} true if the item did not exist prior, otherwise false
      //
      _Set.prototype.add = function (item) {
        return !hasOrAdd(item, true, this);
      }; //
      // @param item The item to check for existence in the Set
      // @returns {boolean} true if the item exists in the Set, otherwise false
      //


      _Set.prototype.has = function (item) {
        return hasOrAdd(item, false, this);
      }; //
      // Combines the logic for checking whether an item is a member of the set and
      // for adding a new item to the set.
      //
      // @param item       The item to check or add to the Set instance.
      // @param shouldAdd  If true, the item will be added to the set if it doesn't
      //                   already exist.
      // @param set        The set instance to check or add to.
      // @return {boolean} true if the item already existed, otherwise false.
      //


      return _Set;
    }();

    function hasOrAdd(item, shouldAdd, set) {
      var type = typeof item;
      var prevSize, newSize;

      switch (type) {
        case 'string':
        case 'number':
          // distinguish between +0 and -0
          if (item === 0 && 1 / item === -Infinity) {
            if (set._items['-0']) {
              return true;
            } else {
              if (shouldAdd) {
                set._items['-0'] = true;
              }

              return false;
            }
          } // these types can all utilise the native Set


          if (set._nativeSet !== null) {
            if (shouldAdd) {
              prevSize = set._nativeSet.size;

              set._nativeSet.add(item);

              newSize = set._nativeSet.size;
              return newSize === prevSize;
            } else {
              return set._nativeSet.has(item);
            }
          } else {
            if (!(type in set._items)) {
              if (shouldAdd) {
                set._items[type] = {};
                set._items[type][item] = true;
              }

              return false;
            } else if (item in set._items[type]) {
              return true;
            } else {
              if (shouldAdd) {
                set._items[type][item] = true;
              }

              return false;
            }
          }

        case 'boolean':
          // set._items['boolean'] holds a two element array
          // representing [ falseExists, trueExists ]
          if (type in set._items) {
            var bIdx = item ? 1 : 0;

            if (set._items[type][bIdx]) {
              return true;
            } else {
              if (shouldAdd) {
                set._items[type][bIdx] = true;
              }

              return false;
            }
          } else {
            if (shouldAdd) {
              set._items[type] = item ? [false, true] : [true, false];
            }

            return false;
          }

        case 'function':
          // compare functions for reference equality
          if (set._nativeSet !== null) {
            if (shouldAdd) {
              prevSize = set._nativeSet.size;

              set._nativeSet.add(item);

              newSize = set._nativeSet.size;
              return newSize === prevSize;
            } else {
              return set._nativeSet.has(item);
            }
          } else {
            if (!(type in set._items)) {
              if (shouldAdd) {
                set._items[type] = [item];
              }

              return false;
            }

            if (!_includes(item, set._items[type])) {
              if (shouldAdd) {
                set._items[type].push(item);
              }

              return false;
            }

            return true;
          }

        case 'undefined':
          if (set._items[type]) {
            return true;
          } else {
            if (shouldAdd) {
              set._items[type] = true;
            }

            return false;
          }

        case 'object':
          if (item === null) {
            if (!set._items['null']) {
              if (shouldAdd) {
                set._items['null'] = true;
              }

              return false;
            }

            return true;
          }

        /* falls through */

        default:
          // reduce the search size of heterogeneous sets by creating buckets
          // for each type.
          type = Object.prototype.toString.call(item);

          if (!(type in set._items)) {
            if (shouldAdd) {
              set._items[type] = [item];
            }

            return false;
          } // scan through all previously applied items


          if (!_includes(item, set._items[type])) {
            if (shouldAdd) {
              set._items[type].push(item);
            }

            return false;
          }

          return true;
      }
    } // A simple Set type that honours R.equals semantics

    /**
     * Finds the set (i.e. no duplicates) of all elements in the first list not
     * contained in the second list. Objects and Arrays are compared in terms of
     * value equality, not reference equality.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Relation
     * @sig [*] -> [*] -> [*]
     * @param {Array} list1 The first list.
     * @param {Array} list2 The second list.
     * @return {Array} The elements in `list1` that are not in `list2`.
     * @see R.differenceWith, R.symmetricDifference, R.symmetricDifferenceWith, R.without
     * @example
     *
     *      R.difference([1,2,3,4], [7,6,5,4,3]); //=> [1,2]
     *      R.difference([7,6,5,4,3], [1,2,3,4]); //=> [7,6,5]
     *      R.difference([{a: 1}, {b: 2}], [{a: 1}, {c: 3}]) //=> [{b: 2}]
     */

    var difference =
    /*#__PURE__*/
    _curry2(function difference(first, second) {
      var out = [];
      var idx = 0;
      var firstLen = first.length;
      var secondLen = second.length;
      var toFilterOut = new _Set();

      for (var i = 0; i < secondLen; i += 1) {
        toFilterOut.add(second[i]);
      }

      while (idx < firstLen) {
        if (toFilterOut.add(first[idx])) {
          out[out.length] = first[idx];
        }

        idx += 1;
      }

      return out;
    });

    /**
     * Finds the set (i.e. no duplicates) of all elements in the first list not
     * contained in the second list. Duplication is determined according to the
     * value returned by applying the supplied predicate to two list elements.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Relation
     * @sig ((a, a) -> Boolean) -> [a] -> [a] -> [a]
     * @param {Function} pred A predicate used to test whether two items are equal.
     * @param {Array} list1 The first list.
     * @param {Array} list2 The second list.
     * @return {Array} The elements in `list1` that are not in `list2`.
     * @see R.difference, R.symmetricDifference, R.symmetricDifferenceWith
     * @example
     *
     *      const cmp = (x, y) => x.a === y.a;
     *      const l1 = [{a: 1}, {a: 2}, {a: 3}];
     *      const l2 = [{a: 3}, {a: 4}];
     *      R.differenceWith(cmp, l1, l2); //=> [{a: 1}, {a: 2}]
     */

    var differenceWith =
    /*#__PURE__*/
    _curry3(function differenceWith(pred, first, second) {
      var out = [];
      var idx = 0;
      var firstLen = first.length;

      while (idx < firstLen) {
        if (!_includesWith(pred, first[idx], second) && !_includesWith(pred, first[idx], out)) {
          out.push(first[idx]);
        }

        idx += 1;
      }

      return out;
    });

    /**
     * Returns a new object that does not contain a `prop` property.
     *
     * @func
     * @memberOf R
     * @since v0.10.0
     * @category Object
     * @sig String -> {k: v} -> {k: v}
     * @param {String} prop The name of the property to dissociate
     * @param {Object} obj The object to clone
     * @return {Object} A new object equivalent to the original but without the specified property
     * @see R.assoc, R.omit
     * @example
     *
     *      R.dissoc('b', {a: 1, b: 2, c: 3}); //=> {a: 1, c: 3}
     */

    var dissoc =
    /*#__PURE__*/
    _curry2(function dissoc(prop, obj) {
      var result = {};

      for (var p in obj) {
        result[p] = obj[p];
      }

      delete result[prop];
      return result;
    });

    /**
     * Removes the sub-list of `list` starting at index `start` and containing
     * `count` elements. _Note that this is not destructive_: it returns a copy of
     * the list with the changes.
     * <small>No lists have been harmed in the application of this function.</small>
     *
     * @func
     * @memberOf R
     * @since v0.2.2
     * @category List
     * @sig Number -> Number -> [a] -> [a]
     * @param {Number} start The position to start removing elements
     * @param {Number} count The number of elements to remove
     * @param {Array} list The list to remove from
     * @return {Array} A new Array with `count` elements from `start` removed.
     * @see R.without
     * @example
     *
     *      R.remove(2, 3, [1,2,3,4,5,6,7,8]); //=> [1,2,6,7,8]
     */

    var remove =
    /*#__PURE__*/
    _curry3(function remove(start, count, list) {
      var result = Array.prototype.slice.call(list, 0);
      result.splice(start, count);
      return result;
    });

    /**
     * Returns a new copy of the array with the element at the provided index
     * replaced with the given value.
     *
     * @func
     * @memberOf R
     * @since v0.14.0
     * @category List
     * @sig Number -> a -> [a] -> [a]
     * @param {Number} idx The index to update.
     * @param {*} x The value to exist at the given index of the returned array.
     * @param {Array|Arguments} list The source array-like object to be updated.
     * @return {Array} A copy of `list` with the value at index `idx` replaced with `x`.
     * @see R.adjust
     * @example
     *
     *      R.update(1, '_', ['a', 'b', 'c']);      //=> ['a', '_', 'c']
     *      R.update(-1, '_', ['a', 'b', 'c']);     //=> ['a', 'b', '_']
     * @symb R.update(-1, a, [b, c]) = [b, a]
     * @symb R.update(0, a, [b, c]) = [a, c]
     * @symb R.update(1, a, [b, c]) = [b, a]
     */

    var update$1 =
    /*#__PURE__*/
    _curry3(function update(idx, x, list) {
      return adjust(idx, always(x), list);
    });

    /**
     * Makes a shallow clone of an object, omitting the property at the given path.
     * Note that this copies and flattens prototype properties onto the new object
     * as well. All non-primitive properties are copied by reference.
     *
     * @func
     * @memberOf R
     * @since v0.11.0
     * @category Object
     * @typedefn Idx = String | Int
     * @sig [Idx] -> {k: v} -> {k: v}
     * @param {Array} path The path to the value to omit
     * @param {Object} obj The object to clone
     * @return {Object} A new object without the property at path
     * @see R.assocPath
     * @example
     *
     *      R.dissocPath(['a', 'b', 'c'], {a: {b: {c: 42}}}); //=> {a: {b: {}}}
     */

    var dissocPath =
    /*#__PURE__*/
    _curry2(function dissocPath(path, obj) {
      switch (path.length) {
        case 0:
          return obj;

        case 1:
          return _isInteger(path[0]) && _isArray(obj) ? remove(path[0], 1, obj) : dissoc(path[0], obj);

        default:
          var head = path[0];
          var tail = Array.prototype.slice.call(path, 1);

          if (obj[head] == null) {
            return obj;
          } else if (_isInteger(head) && _isArray(obj)) {
            return update$1(head, dissocPath(tail, obj[head]), obj);
          } else {
            return assoc(head, dissocPath(tail, obj[head]), obj);
          }

      }
    });

    /**
     * Divides two numbers. Equivalent to `a / b`.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Math
     * @sig Number -> Number -> Number
     * @param {Number} a The first value.
     * @param {Number} b The second value.
     * @return {Number} The result of `a / b`.
     * @see R.multiply
     * @example
     *
     *      R.divide(71, 100); //=> 0.71
     *
     *      const half = R.divide(R.__, 2);
     *      half(42); //=> 21
     *
     *      const reciprocal = R.divide(1);
     *      reciprocal(4);   //=> 0.25
     */

    var divide =
    /*#__PURE__*/
    _curry2(function divide(a, b) {
      return a / b;
    });

    var XDrop =
    /*#__PURE__*/
    function () {
      function XDrop(n, xf) {
        this.xf = xf;
        this.n = n;
      }

      XDrop.prototype['@@transducer/init'] = _xfBase.init;
      XDrop.prototype['@@transducer/result'] = _xfBase.result;

      XDrop.prototype['@@transducer/step'] = function (result, input) {
        if (this.n > 0) {
          this.n -= 1;
          return result;
        }

        return this.xf['@@transducer/step'](result, input);
      };

      return XDrop;
    }();

    var _xdrop =
    /*#__PURE__*/
    _curry2(function _xdrop(n, xf) {
      return new XDrop(n, xf);
    });

    /**
     * Returns all but the first `n` elements of the given list, string, or
     * transducer/transformer (or object with a `drop` method).
     *
     * Dispatches to the `drop` method of the second argument, if present.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig Number -> [a] -> [a]
     * @sig Number -> String -> String
     * @param {Number} n
     * @param {*} list
     * @return {*} A copy of list without the first `n` elements
     * @see R.take, R.transduce, R.dropLast, R.dropWhile
     * @example
     *
     *      R.drop(1, ['foo', 'bar', 'baz']); //=> ['bar', 'baz']
     *      R.drop(2, ['foo', 'bar', 'baz']); //=> ['baz']
     *      R.drop(3, ['foo', 'bar', 'baz']); //=> []
     *      R.drop(4, ['foo', 'bar', 'baz']); //=> []
     *      R.drop(3, 'ramda');               //=> 'da'
     */

    var drop =
    /*#__PURE__*/
    _curry2(
    /*#__PURE__*/
    _dispatchable(['drop'], _xdrop, function drop(n, xs) {
      return slice(Math.max(0, n), Infinity, xs);
    }));

    var XTake =
    /*#__PURE__*/
    function () {
      function XTake(n, xf) {
        this.xf = xf;
        this.n = n;
        this.i = 0;
      }

      XTake.prototype['@@transducer/init'] = _xfBase.init;
      XTake.prototype['@@transducer/result'] = _xfBase.result;

      XTake.prototype['@@transducer/step'] = function (result, input) {
        this.i += 1;
        var ret = this.n === 0 ? result : this.xf['@@transducer/step'](result, input);
        return this.n >= 0 && this.i >= this.n ? _reduced(ret) : ret;
      };

      return XTake;
    }();

    var _xtake =
    /*#__PURE__*/
    _curry2(function _xtake(n, xf) {
      return new XTake(n, xf);
    });

    /**
     * Returns the first `n` elements of the given list, string, or
     * transducer/transformer (or object with a `take` method).
     *
     * Dispatches to the `take` method of the second argument, if present.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig Number -> [a] -> [a]
     * @sig Number -> String -> String
     * @param {Number} n
     * @param {*} list
     * @return {*}
     * @see R.drop
     * @example
     *
     *      R.take(1, ['foo', 'bar', 'baz']); //=> ['foo']
     *      R.take(2, ['foo', 'bar', 'baz']); //=> ['foo', 'bar']
     *      R.take(3, ['foo', 'bar', 'baz']); //=> ['foo', 'bar', 'baz']
     *      R.take(4, ['foo', 'bar', 'baz']); //=> ['foo', 'bar', 'baz']
     *      R.take(3, 'ramda');               //=> 'ram'
     *
     *      const personnel = [
     *        'Dave Brubeck',
     *        'Paul Desmond',
     *        'Eugene Wright',
     *        'Joe Morello',
     *        'Gerry Mulligan',
     *        'Bob Bates',
     *        'Joe Dodge',
     *        'Ron Crotty'
     *      ];
     *
     *      const takeFive = R.take(5);
     *      takeFive(personnel);
     *      //=> ['Dave Brubeck', 'Paul Desmond', 'Eugene Wright', 'Joe Morello', 'Gerry Mulligan']
     * @symb R.take(-1, [a, b]) = [a, b]
     * @symb R.take(0, [a, b]) = []
     * @symb R.take(1, [a, b]) = [a]
     * @symb R.take(2, [a, b]) = [a, b]
     */

    var take =
    /*#__PURE__*/
    _curry2(
    /*#__PURE__*/
    _dispatchable(['take'], _xtake, function take(n, xs) {
      return slice(0, n < 0 ? Infinity : n, xs);
    }));

    function dropLast(n, xs) {
      return take(n < xs.length ? xs.length - n : 0, xs);
    }

    var XDropLast =
    /*#__PURE__*/
    function () {
      function XDropLast(n, xf) {
        this.xf = xf;
        this.pos = 0;
        this.full = false;
        this.acc = new Array(n);
      }

      XDropLast.prototype['@@transducer/init'] = _xfBase.init;

      XDropLast.prototype['@@transducer/result'] = function (result) {
        this.acc = null;
        return this.xf['@@transducer/result'](result);
      };

      XDropLast.prototype['@@transducer/step'] = function (result, input) {
        if (this.full) {
          result = this.xf['@@transducer/step'](result, this.acc[this.pos]);
        }

        this.store(input);
        return result;
      };

      XDropLast.prototype.store = function (input) {
        this.acc[this.pos] = input;
        this.pos += 1;

        if (this.pos === this.acc.length) {
          this.pos = 0;
          this.full = true;
        }
      };

      return XDropLast;
    }();

    var _xdropLast =
    /*#__PURE__*/
    _curry2(function _xdropLast(n, xf) {
      return new XDropLast(n, xf);
    });

    /**
     * Returns a list containing all but the last `n` elements of the given `list`.
     *
     * Acts as a transducer if a transformer is given in list position.
     *
     * @func
     * @memberOf R
     * @since v0.16.0
     * @category List
     * @sig Number -> [a] -> [a]
     * @sig Number -> String -> String
     * @param {Number} n The number of elements of `list` to skip.
     * @param {Array} list The list of elements to consider.
     * @return {Array} A copy of the list with only the first `list.length - n` elements
     * @see R.takeLast, R.drop, R.dropWhile, R.dropLastWhile
     * @example
     *
     *      R.dropLast(1, ['foo', 'bar', 'baz']); //=> ['foo', 'bar']
     *      R.dropLast(2, ['foo', 'bar', 'baz']); //=> ['foo']
     *      R.dropLast(3, ['foo', 'bar', 'baz']); //=> []
     *      R.dropLast(4, ['foo', 'bar', 'baz']); //=> []
     *      R.dropLast(3, 'ramda');               //=> 'ra'
     */

    var dropLast$1 =
    /*#__PURE__*/
    _curry2(
    /*#__PURE__*/
    _dispatchable([], _xdropLast, dropLast));

    function dropLastWhile(pred, xs) {
      var idx = xs.length - 1;

      while (idx >= 0 && pred(xs[idx])) {
        idx -= 1;
      }

      return slice(0, idx + 1, xs);
    }

    var XDropLastWhile =
    /*#__PURE__*/
    function () {
      function XDropLastWhile(fn, xf) {
        this.f = fn;
        this.retained = [];
        this.xf = xf;
      }

      XDropLastWhile.prototype['@@transducer/init'] = _xfBase.init;

      XDropLastWhile.prototype['@@transducer/result'] = function (result) {
        this.retained = null;
        return this.xf['@@transducer/result'](result);
      };

      XDropLastWhile.prototype['@@transducer/step'] = function (result, input) {
        return this.f(input) ? this.retain(result, input) : this.flush(result, input);
      };

      XDropLastWhile.prototype.flush = function (result, input) {
        result = _reduce(this.xf['@@transducer/step'], result, this.retained);
        this.retained = [];
        return this.xf['@@transducer/step'](result, input);
      };

      XDropLastWhile.prototype.retain = function (result, input) {
        this.retained.push(input);
        return result;
      };

      return XDropLastWhile;
    }();

    var _xdropLastWhile =
    /*#__PURE__*/
    _curry2(function _xdropLastWhile(fn, xf) {
      return new XDropLastWhile(fn, xf);
    });

    /**
     * Returns a new list excluding all the tailing elements of a given list which
     * satisfy the supplied predicate function. It passes each value from the right
     * to the supplied predicate function, skipping elements until the predicate
     * function returns a `falsy` value. The predicate function is applied to one argument:
     * *(value)*.
     *
     * Acts as a transducer if a transformer is given in list position.
     *
     * @func
     * @memberOf R
     * @since v0.16.0
     * @category List
     * @sig (a -> Boolean) -> [a] -> [a]
     * @sig (a -> Boolean) -> String -> String
     * @param {Function} predicate The function to be called on each element
     * @param {Array} xs The collection to iterate over.
     * @return {Array} A new array without any trailing elements that return `falsy` values from the `predicate`.
     * @see R.takeLastWhile, R.addIndex, R.drop, R.dropWhile
     * @example
     *
     *      const lteThree = x => x <= 3;
     *
     *      R.dropLastWhile(lteThree, [1, 2, 3, 4, 3, 2, 1]); //=> [1, 2, 3, 4]
     *
     *      R.dropLastWhile(x => x !== 'd' , 'Ramda'); //=> 'Ramd'
     */

    var dropLastWhile$1 =
    /*#__PURE__*/
    _curry2(
    /*#__PURE__*/
    _dispatchable([], _xdropLastWhile, dropLastWhile));

    var XDropRepeatsWith =
    /*#__PURE__*/
    function () {
      function XDropRepeatsWith(pred, xf) {
        this.xf = xf;
        this.pred = pred;
        this.lastValue = undefined;
        this.seenFirstValue = false;
      }

      XDropRepeatsWith.prototype['@@transducer/init'] = _xfBase.init;
      XDropRepeatsWith.prototype['@@transducer/result'] = _xfBase.result;

      XDropRepeatsWith.prototype['@@transducer/step'] = function (result, input) {
        var sameAsLast = false;

        if (!this.seenFirstValue) {
          this.seenFirstValue = true;
        } else if (this.pred(this.lastValue, input)) {
          sameAsLast = true;
        }

        this.lastValue = input;
        return sameAsLast ? result : this.xf['@@transducer/step'](result, input);
      };

      return XDropRepeatsWith;
    }();

    var _xdropRepeatsWith =
    /*#__PURE__*/
    _curry2(function _xdropRepeatsWith(pred, xf) {
      return new XDropRepeatsWith(pred, xf);
    });

    /**
     * Returns the last element of the given list or string.
     *
     * @func
     * @memberOf R
     * @since v0.1.4
     * @category List
     * @sig [a] -> a | Undefined
     * @sig String -> String
     * @param {*} list
     * @return {*}
     * @see R.init, R.head, R.tail
     * @example
     *
     *      R.last(['fi', 'fo', 'fum']); //=> 'fum'
     *      R.last([]); //=> undefined
     *
     *      R.last('abc'); //=> 'c'
     *      R.last(''); //=> ''
     */

    var last =
    /*#__PURE__*/
    nth(-1);

    /**
     * Returns a new list without any consecutively repeating elements. Equality is
     * determined by applying the supplied predicate to each pair of consecutive elements. The
     * first element in a series of equal elements will be preserved.
     *
     * Acts as a transducer if a transformer is given in list position.
     *
     * @func
     * @memberOf R
     * @since v0.14.0
     * @category List
     * @sig ((a, a) -> Boolean) -> [a] -> [a]
     * @param {Function} pred A predicate used to test whether two items are equal.
     * @param {Array} list The array to consider.
     * @return {Array} `list` without repeating elements.
     * @see R.transduce
     * @example
     *
     *      const l = [1, -1, 1, 3, 4, -4, -4, -5, 5, 3, 3];
     *      R.dropRepeatsWith(R.eqBy(Math.abs), l); //=> [1, 3, 4, -5, 3]
     */

    var dropRepeatsWith =
    /*#__PURE__*/
    _curry2(
    /*#__PURE__*/
    _dispatchable([], _xdropRepeatsWith, function dropRepeatsWith(pred, list) {
      var result = [];
      var idx = 1;
      var len = list.length;

      if (len !== 0) {
        result[0] = list[0];

        while (idx < len) {
          if (!pred(last(result), list[idx])) {
            result[result.length] = list[idx];
          }

          idx += 1;
        }
      }

      return result;
    }));

    /**
     * Returns a new list without any consecutively repeating elements.
     * [`R.equals`](#equals) is used to determine equality.
     *
     * Acts as a transducer if a transformer is given in list position.
     *
     * @func
     * @memberOf R
     * @since v0.14.0
     * @category List
     * @sig [a] -> [a]
     * @param {Array} list The array to consider.
     * @return {Array} `list` without repeating elements.
     * @see R.transduce
     * @example
     *
     *     R.dropRepeats([1, 1, 1, 2, 3, 4, 4, 2, 2]); //=> [1, 2, 3, 4, 2]
     */

    var dropRepeats =
    /*#__PURE__*/
    _curry1(
    /*#__PURE__*/
    _dispatchable([],
    /*#__PURE__*/
    _xdropRepeatsWith(equals),
    /*#__PURE__*/
    dropRepeatsWith(equals)));

    var XDropWhile =
    /*#__PURE__*/
    function () {
      function XDropWhile(f, xf) {
        this.xf = xf;
        this.f = f;
      }

      XDropWhile.prototype['@@transducer/init'] = _xfBase.init;
      XDropWhile.prototype['@@transducer/result'] = _xfBase.result;

      XDropWhile.prototype['@@transducer/step'] = function (result, input) {
        if (this.f) {
          if (this.f(input)) {
            return result;
          }

          this.f = null;
        }

        return this.xf['@@transducer/step'](result, input);
      };

      return XDropWhile;
    }();

    var _xdropWhile =
    /*#__PURE__*/
    _curry2(function _xdropWhile(f, xf) {
      return new XDropWhile(f, xf);
    });

    /**
     * Returns a new list excluding the leading elements of a given list which
     * satisfy the supplied predicate function. It passes each value to the supplied
     * predicate function, skipping elements while the predicate function returns
     * `true`. The predicate function is applied to one argument: *(value)*.
     *
     * Dispatches to the `dropWhile` method of the second argument, if present.
     *
     * Acts as a transducer if a transformer is given in list position.
     *
     * @func
     * @memberOf R
     * @since v0.9.0
     * @category List
     * @sig (a -> Boolean) -> [a] -> [a]
     * @sig (a -> Boolean) -> String -> String
     * @param {Function} fn The function called per iteration.
     * @param {Array} xs The collection to iterate over.
     * @return {Array} A new array.
     * @see R.takeWhile, R.transduce, R.addIndex
     * @example
     *
     *      const lteTwo = x => x <= 2;
     *
     *      R.dropWhile(lteTwo, [1, 2, 3, 4, 3, 2, 1]); //=> [3, 4, 3, 2, 1]
     *
     *      R.dropWhile(x => x !== 'd' , 'Ramda'); //=> 'da'
     */

    var dropWhile =
    /*#__PURE__*/
    _curry2(
    /*#__PURE__*/
    _dispatchable(['dropWhile'], _xdropWhile, function dropWhile(pred, xs) {
      var idx = 0;
      var len = xs.length;

      while (idx < len && pred(xs[idx])) {
        idx += 1;
      }

      return slice(idx, Infinity, xs);
    }));

    /**
     * Returns `true` if one or both of its arguments are `true`. Returns `false`
     * if both arguments are `false`.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Logic
     * @sig a -> b -> a | b
     * @param {Any} a
     * @param {Any} b
     * @return {Any} the first argument if truthy, otherwise the second argument.
     * @see R.either, R.xor
     * @example
     *
     *      R.or(true, true); //=> true
     *      R.or(true, false); //=> true
     *      R.or(false, true); //=> true
     *      R.or(false, false); //=> false
     */

    var or =
    /*#__PURE__*/
    _curry2(function or(a, b) {
      return a || b;
    });

    /**
     * A function wrapping calls to the two functions in an `||` operation,
     * returning the result of the first function if it is truth-y and the result
     * of the second function otherwise. Note that this is short-circuited,
     * meaning that the second function will not be invoked if the first returns a
     * truth-y value.
     *
     * In addition to functions, `R.either` also accepts any fantasy-land compatible
     * applicative functor.
     *
     * @func
     * @memberOf R
     * @since v0.12.0
     * @category Logic
     * @sig (*... -> Boolean) -> (*... -> Boolean) -> (*... -> Boolean)
     * @param {Function} f a predicate
     * @param {Function} g another predicate
     * @return {Function} a function that applies its arguments to `f` and `g` and `||`s their outputs together.
     * @see R.or
     * @example
     *
     *      const gt10 = x => x > 10;
     *      const even = x => x % 2 === 0;
     *      const f = R.either(gt10, even);
     *      f(101); //=> true
     *      f(8); //=> true
     *
     *      R.either(Maybe.Just(false), Maybe.Just(55)); // => Maybe.Just(55)
     *      R.either([false, false, 'a'], [11]) // => [11, 11, "a"]
     */

    var either =
    /*#__PURE__*/
    _curry2(function either(f, g) {
      return _isFunction(f) ? function _either() {
        return f.apply(this, arguments) || g.apply(this, arguments);
      } : lift(or)(f, g);
    });

    /**
     * Returns the empty value of its argument's type. Ramda defines the empty
     * value of Array (`[]`), Object (`{}`), String (`''`), and Arguments. Other
     * types are supported if they define `<Type>.empty`,
     * `<Type>.prototype.empty` or implement the
     * [FantasyLand Monoid spec](https://github.com/fantasyland/fantasy-land#monoid).
     *
     * Dispatches to the `empty` method of the first argument, if present.
     *
     * @func
     * @memberOf R
     * @since v0.3.0
     * @category Function
     * @sig a -> a
     * @param {*} x
     * @return {*}
     * @example
     *
     *      R.empty(Just(42));      //=> Nothing()
     *      R.empty([1, 2, 3]);     //=> []
     *      R.empty('unicorns');    //=> ''
     *      R.empty({x: 1, y: 2});  //=> {}
     */

    var empty$1 =
    /*#__PURE__*/
    _curry1(function empty(x) {
      return x != null && typeof x['fantasy-land/empty'] === 'function' ? x['fantasy-land/empty']() : x != null && x.constructor != null && typeof x.constructor['fantasy-land/empty'] === 'function' ? x.constructor['fantasy-land/empty']() : x != null && typeof x.empty === 'function' ? x.empty() : x != null && x.constructor != null && typeof x.constructor.empty === 'function' ? x.constructor.empty() : _isArray(x) ? [] : _isString(x) ? '' : _isObject(x) ? {} : _isArguments(x) ? function () {
        return arguments;
      }() : void 0 // else
      ;
    });

    /**
     * Returns a new list containing the last `n` elements of the given list.
     * If `n > list.length`, returns a list of `list.length` elements.
     *
     * @func
     * @memberOf R
     * @since v0.16.0
     * @category List
     * @sig Number -> [a] -> [a]
     * @sig Number -> String -> String
     * @param {Number} n The number of elements to return.
     * @param {Array} xs The collection to consider.
     * @return {Array}
     * @see R.dropLast
     * @example
     *
     *      R.takeLast(1, ['foo', 'bar', 'baz']); //=> ['baz']
     *      R.takeLast(2, ['foo', 'bar', 'baz']); //=> ['bar', 'baz']
     *      R.takeLast(3, ['foo', 'bar', 'baz']); //=> ['foo', 'bar', 'baz']
     *      R.takeLast(4, ['foo', 'bar', 'baz']); //=> ['foo', 'bar', 'baz']
     *      R.takeLast(3, 'ramda');               //=> 'mda'
     */

    var takeLast =
    /*#__PURE__*/
    _curry2(function takeLast(n, xs) {
      return drop(n >= 0 ? xs.length - n : 0, xs);
    });

    /**
     * Checks if a list ends with the provided sublist.
     *
     * Similarly, checks if a string ends with the provided substring.
     *
     * @func
     * @memberOf R
     * @since v0.24.0
     * @category List
     * @sig [a] -> [a] -> Boolean
     * @sig String -> String -> Boolean
     * @param {*} suffix
     * @param {*} list
     * @return {Boolean}
     * @see R.startsWith
     * @example
     *
     *      R.endsWith('c', 'abc')                //=> true
     *      R.endsWith('b', 'abc')                //=> false
     *      R.endsWith(['c'], ['a', 'b', 'c'])    //=> true
     *      R.endsWith(['b'], ['a', 'b', 'c'])    //=> false
     */

    var endsWith =
    /*#__PURE__*/
    _curry2(function (suffix, list) {
      return equals(takeLast(suffix.length, list), suffix);
    });

    /**
     * Takes a function and two values in its domain and returns `true` if the
     * values map to the same value in the codomain; `false` otherwise.
     *
     * @func
     * @memberOf R
     * @since v0.18.0
     * @category Relation
     * @sig (a -> b) -> a -> a -> Boolean
     * @param {Function} f
     * @param {*} x
     * @param {*} y
     * @return {Boolean}
     * @example
     *
     *      R.eqBy(Math.abs, 5, -5); //=> true
     */

    var eqBy =
    /*#__PURE__*/
    _curry3(function eqBy(f, x, y) {
      return equals(f(x), f(y));
    });

    /**
     * Reports whether two objects have the same value, in [`R.equals`](#equals)
     * terms, for the specified property. Useful as a curried predicate.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Object
     * @sig k -> {k: v} -> {k: v} -> Boolean
     * @param {String} prop The name of the property to compare
     * @param {Object} obj1
     * @param {Object} obj2
     * @return {Boolean}
     *
     * @example
     *
     *      const o1 = { a: 1, b: 2, c: 3, d: 4 };
     *      const o2 = { a: 10, b: 20, c: 3, d: 40 };
     *      R.eqProps('a', o1, o2); //=> false
     *      R.eqProps('c', o1, o2); //=> true
     */

    var eqProps =
    /*#__PURE__*/
    _curry3(function eqProps(prop, obj1, obj2) {
      return equals(obj1[prop], obj2[prop]);
    });

    /**
     * Creates a new object by recursively evolving a shallow copy of `object`,
     * according to the `transformation` functions. All non-primitive properties
     * are copied by reference.
     *
     * A `transformation` function will not be invoked if its corresponding key
     * does not exist in the evolved object.
     *
     * @func
     * @memberOf R
     * @since v0.9.0
     * @category Object
     * @sig {k: (v -> v)} -> {k: v} -> {k: v}
     * @param {Object} transformations The object specifying transformation functions to apply
     *        to the object.
     * @param {Object} object The object to be transformed.
     * @return {Object} The transformed object.
     * @example
     *
     *      const tomato = {firstName: '  Tomato ', data: {elapsed: 100, remaining: 1400}, id:123};
     *      const transformations = {
     *        firstName: R.trim,
     *        lastName: R.trim, // Will not get invoked.
     *        data: {elapsed: R.add(1), remaining: R.add(-1)}
     *      };
     *      R.evolve(transformations, tomato); //=> {firstName: 'Tomato', data: {elapsed: 101, remaining: 1399}, id:123}
     */

    var evolve =
    /*#__PURE__*/
    _curry2(function evolve(transformations, object) {
      var result = object instanceof Array ? [] : {};
      var transformation, key, type;

      for (key in object) {
        transformation = transformations[key];
        type = typeof transformation;
        result[key] = type === 'function' ? transformation(object[key]) : transformation && type === 'object' ? evolve(transformation, object[key]) : object[key];
      }

      return result;
    });

    var XFind =
    /*#__PURE__*/
    function () {
      function XFind(f, xf) {
        this.xf = xf;
        this.f = f;
        this.found = false;
      }

      XFind.prototype['@@transducer/init'] = _xfBase.init;

      XFind.prototype['@@transducer/result'] = function (result) {
        if (!this.found) {
          result = this.xf['@@transducer/step'](result, void 0);
        }

        return this.xf['@@transducer/result'](result);
      };

      XFind.prototype['@@transducer/step'] = function (result, input) {
        if (this.f(input)) {
          this.found = true;
          result = _reduced(this.xf['@@transducer/step'](result, input));
        }

        return result;
      };

      return XFind;
    }();

    var _xfind =
    /*#__PURE__*/
    _curry2(function _xfind(f, xf) {
      return new XFind(f, xf);
    });

    /**
     * Returns the first element of the list which matches the predicate, or
     * `undefined` if no element matches.
     *
     * Dispatches to the `find` method of the second argument, if present.
     *
     * Acts as a transducer if a transformer is given in list position.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig (a -> Boolean) -> [a] -> a | undefined
     * @param {Function} fn The predicate function used to determine if the element is the
     *        desired one.
     * @param {Array} list The array to consider.
     * @return {Object} The element found, or `undefined`.
     * @see R.transduce
     * @example
     *
     *      const xs = [{a: 1}, {a: 2}, {a: 3}];
     *      R.find(R.propEq('a', 2))(xs); //=> {a: 2}
     *      R.find(R.propEq('a', 4))(xs); //=> undefined
     */

    var find =
    /*#__PURE__*/
    _curry2(
    /*#__PURE__*/
    _dispatchable(['find'], _xfind, function find(fn, list) {
      var idx = 0;
      var len = list.length;

      while (idx < len) {
        if (fn(list[idx])) {
          return list[idx];
        }

        idx += 1;
      }
    }));

    var XFindIndex =
    /*#__PURE__*/
    function () {
      function XFindIndex(f, xf) {
        this.xf = xf;
        this.f = f;
        this.idx = -1;
        this.found = false;
      }

      XFindIndex.prototype['@@transducer/init'] = _xfBase.init;

      XFindIndex.prototype['@@transducer/result'] = function (result) {
        if (!this.found) {
          result = this.xf['@@transducer/step'](result, -1);
        }

        return this.xf['@@transducer/result'](result);
      };

      XFindIndex.prototype['@@transducer/step'] = function (result, input) {
        this.idx += 1;

        if (this.f(input)) {
          this.found = true;
          result = _reduced(this.xf['@@transducer/step'](result, this.idx));
        }

        return result;
      };

      return XFindIndex;
    }();

    var _xfindIndex =
    /*#__PURE__*/
    _curry2(function _xfindIndex(f, xf) {
      return new XFindIndex(f, xf);
    });

    /**
     * Returns the index of the first element of the list which matches the
     * predicate, or `-1` if no element matches.
     *
     * Acts as a transducer if a transformer is given in list position.
     *
     * @func
     * @memberOf R
     * @since v0.1.1
     * @category List
     * @sig (a -> Boolean) -> [a] -> Number
     * @param {Function} fn The predicate function used to determine if the element is the
     * desired one.
     * @param {Array} list The array to consider.
     * @return {Number} The index of the element found, or `-1`.
     * @see R.transduce
     * @example
     *
     *      const xs = [{a: 1}, {a: 2}, {a: 3}];
     *      R.findIndex(R.propEq('a', 2))(xs); //=> 1
     *      R.findIndex(R.propEq('a', 4))(xs); //=> -1
     */

    var findIndex =
    /*#__PURE__*/
    _curry2(
    /*#__PURE__*/
    _dispatchable([], _xfindIndex, function findIndex(fn, list) {
      var idx = 0;
      var len = list.length;

      while (idx < len) {
        if (fn(list[idx])) {
          return idx;
        }

        idx += 1;
      }

      return -1;
    }));

    var XFindLast =
    /*#__PURE__*/
    function () {
      function XFindLast(f, xf) {
        this.xf = xf;
        this.f = f;
      }

      XFindLast.prototype['@@transducer/init'] = _xfBase.init;

      XFindLast.prototype['@@transducer/result'] = function (result) {
        return this.xf['@@transducer/result'](this.xf['@@transducer/step'](result, this.last));
      };

      XFindLast.prototype['@@transducer/step'] = function (result, input) {
        if (this.f(input)) {
          this.last = input;
        }

        return result;
      };

      return XFindLast;
    }();

    var _xfindLast =
    /*#__PURE__*/
    _curry2(function _xfindLast(f, xf) {
      return new XFindLast(f, xf);
    });

    /**
     * Returns the last element of the list which matches the predicate, or
     * `undefined` if no element matches.
     *
     * Acts as a transducer if a transformer is given in list position.
     *
     * @func
     * @memberOf R
     * @since v0.1.1
     * @category List
     * @sig (a -> Boolean) -> [a] -> a | undefined
     * @param {Function} fn The predicate function used to determine if the element is the
     * desired one.
     * @param {Array} list The array to consider.
     * @return {Object} The element found, or `undefined`.
     * @see R.transduce
     * @example
     *
     *      const xs = [{a: 1, b: 0}, {a:1, b: 1}];
     *      R.findLast(R.propEq('a', 1))(xs); //=> {a: 1, b: 1}
     *      R.findLast(R.propEq('a', 4))(xs); //=> undefined
     */

    var findLast =
    /*#__PURE__*/
    _curry2(
    /*#__PURE__*/
    _dispatchable([], _xfindLast, function findLast(fn, list) {
      var idx = list.length - 1;

      while (idx >= 0) {
        if (fn(list[idx])) {
          return list[idx];
        }

        idx -= 1;
      }
    }));

    var XFindLastIndex =
    /*#__PURE__*/
    function () {
      function XFindLastIndex(f, xf) {
        this.xf = xf;
        this.f = f;
        this.idx = -1;
        this.lastIdx = -1;
      }

      XFindLastIndex.prototype['@@transducer/init'] = _xfBase.init;

      XFindLastIndex.prototype['@@transducer/result'] = function (result) {
        return this.xf['@@transducer/result'](this.xf['@@transducer/step'](result, this.lastIdx));
      };

      XFindLastIndex.prototype['@@transducer/step'] = function (result, input) {
        this.idx += 1;

        if (this.f(input)) {
          this.lastIdx = this.idx;
        }

        return result;
      };

      return XFindLastIndex;
    }();

    var _xfindLastIndex =
    /*#__PURE__*/
    _curry2(function _xfindLastIndex(f, xf) {
      return new XFindLastIndex(f, xf);
    });

    /**
     * Returns the index of the last element of the list which matches the
     * predicate, or `-1` if no element matches.
     *
     * Acts as a transducer if a transformer is given in list position.
     *
     * @func
     * @memberOf R
     * @since v0.1.1
     * @category List
     * @sig (a -> Boolean) -> [a] -> Number
     * @param {Function} fn The predicate function used to determine if the element is the
     * desired one.
     * @param {Array} list The array to consider.
     * @return {Number} The index of the element found, or `-1`.
     * @see R.transduce
     * @example
     *
     *      const xs = [{a: 1, b: 0}, {a:1, b: 1}];
     *      R.findLastIndex(R.propEq('a', 1))(xs); //=> 1
     *      R.findLastIndex(R.propEq('a', 4))(xs); //=> -1
     */

    var findLastIndex =
    /*#__PURE__*/
    _curry2(
    /*#__PURE__*/
    _dispatchable([], _xfindLastIndex, function findLastIndex(fn, list) {
      var idx = list.length - 1;

      while (idx >= 0) {
        if (fn(list[idx])) {
          return idx;
        }

        idx -= 1;
      }

      return -1;
    }));

    /**
     * Returns a new list by pulling every item out of it (and all its sub-arrays)
     * and putting them in a new array, depth-first.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig [a] -> [b]
     * @param {Array} list The array to consider.
     * @return {Array} The flattened list.
     * @see R.unnest
     * @example
     *
     *      R.flatten([1, 2, [3, 4], 5, [6, [7, 8, [9, [10, 11], 12]]]]);
     *      //=> [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
     */

    var flatten =
    /*#__PURE__*/
    _curry1(
    /*#__PURE__*/
    _makeFlat(true));

    /**
     * Returns a new function much like the supplied one, except that the first two
     * arguments' order is reversed.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Function
     * @sig ((a, b, c, ...) -> z) -> (b -> a -> c -> ... -> z)
     * @param {Function} fn The function to invoke with its first two parameters reversed.
     * @return {*} The result of invoking `fn` with its first two parameters' order reversed.
     * @example
     *
     *      const mergeThree = (a, b, c) => [].concat(a, b, c);
     *
     *      mergeThree(1, 2, 3); //=> [1, 2, 3]
     *
     *      R.flip(mergeThree)(1, 2, 3); //=> [2, 1, 3]
     * @symb R.flip(f)(a, b, c) = f(b, a, c)
     */

    var flip =
    /*#__PURE__*/
    _curry1(function flip(fn) {
      return curryN(fn.length, function (a, b) {
        var args = Array.prototype.slice.call(arguments, 0);
        args[0] = b;
        args[1] = a;
        return fn.apply(this, args);
      });
    });

    /**
     * Iterate over an input `list`, calling a provided function `fn` for each
     * element in the list.
     *
     * `fn` receives one argument: *(value)*.
     *
     * Note: `R.forEach` does not skip deleted or unassigned indices (sparse
     * arrays), unlike the native `Array.prototype.forEach` method. For more
     * details on this behavior, see:
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach#Description
     *
     * Also note that, unlike `Array.prototype.forEach`, Ramda's `forEach` returns
     * the original array. In some libraries this function is named `each`.
     *
     * Dispatches to the `forEach` method of the second argument, if present.
     *
     * @func
     * @memberOf R
     * @since v0.1.1
     * @category List
     * @sig (a -> *) -> [a] -> [a]
     * @param {Function} fn The function to invoke. Receives one argument, `value`.
     * @param {Array} list The list to iterate over.
     * @return {Array} The original list.
     * @see R.addIndex
     * @example
     *
     *      const printXPlusFive = x => console.log(x + 5);
     *      R.forEach(printXPlusFive, [1, 2, 3]); //=> [1, 2, 3]
     *      // logs 6
     *      // logs 7
     *      // logs 8
     * @symb R.forEach(f, [a, b, c]) = [a, b, c]
     */

    var forEach =
    /*#__PURE__*/
    _curry2(
    /*#__PURE__*/
    _checkForMethod('forEach', function forEach(fn, list) {
      var len = list.length;
      var idx = 0;

      while (idx < len) {
        fn(list[idx]);
        idx += 1;
      }

      return list;
    }));

    /**
     * Iterate over an input `object`, calling a provided function `fn` for each
     * key and value in the object.
     *
     * `fn` receives three argument: *(value, key, obj)*.
     *
     * @func
     * @memberOf R
     * @since v0.23.0
     * @category Object
     * @sig ((a, String, StrMap a) -> Any) -> StrMap a -> StrMap a
     * @param {Function} fn The function to invoke. Receives three argument, `value`, `key`, `obj`.
     * @param {Object} obj The object to iterate over.
     * @return {Object} The original object.
     * @example
     *
     *      const printKeyConcatValue = (value, key) => console.log(key + ':' + value);
     *      R.forEachObjIndexed(printKeyConcatValue, {x: 1, y: 2}); //=> {x: 1, y: 2}
     *      // logs x:1
     *      // logs y:2
     * @symb R.forEachObjIndexed(f, {x: a, y: b}) = {x: a, y: b}
     */

    var forEachObjIndexed =
    /*#__PURE__*/
    _curry2(function forEachObjIndexed(fn, obj) {
      var keyList = keys(obj);
      var idx = 0;

      while (idx < keyList.length) {
        var key = keyList[idx];
        fn(obj[key], key, obj);
        idx += 1;
      }

      return obj;
    });

    /**
     * Creates a new object from a list key-value pairs. If a key appears in
     * multiple pairs, the rightmost pair is included in the object.
     *
     * @func
     * @memberOf R
     * @since v0.3.0
     * @category List
     * @sig [[k,v]] -> {k: v}
     * @param {Array} pairs An array of two-element arrays that will be the keys and values of the output object.
     * @return {Object} The object made by pairing up `keys` and `values`.
     * @see R.toPairs, R.pair
     * @example
     *
     *      R.fromPairs([['a', 1], ['b', 2], ['c', 3]]); //=> {a: 1, b: 2, c: 3}
     */

    var fromPairs =
    /*#__PURE__*/
    _curry1(function fromPairs(pairs) {
      var result = {};
      var idx = 0;

      while (idx < pairs.length) {
        result[pairs[idx][0]] = pairs[idx][1];
        idx += 1;
      }

      return result;
    });

    /**
     * Splits a list into sub-lists stored in an object, based on the result of
     * calling a String-returning function on each element, and grouping the
     * results according to values returned.
     *
     * Dispatches to the `groupBy` method of the second argument, if present.
     *
     * Acts as a transducer if a transformer is given in list position.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig (a -> String) -> [a] -> {String: [a]}
     * @param {Function} fn Function :: a -> String
     * @param {Array} list The array to group
     * @return {Object} An object with the output of `fn` for keys, mapped to arrays of elements
     *         that produced that key when passed to `fn`.
     * @see R.reduceBy, R.transduce
     * @example
     *
     *      const byGrade = R.groupBy(function(student) {
     *        const score = student.score;
     *        return score < 65 ? 'F' :
     *               score < 70 ? 'D' :
     *               score < 80 ? 'C' :
     *               score < 90 ? 'B' : 'A';
     *      });
     *      const students = [{name: 'Abby', score: 84},
     *                      {name: 'Eddy', score: 58},
     *                      // ...
     *                      {name: 'Jack', score: 69}];
     *      byGrade(students);
     *      // {
     *      //   'A': [{name: 'Dianne', score: 99}],
     *      //   'B': [{name: 'Abby', score: 84}]
     *      //   // ...,
     *      //   'F': [{name: 'Eddy', score: 58}]
     *      // }
     */

    var groupBy =
    /*#__PURE__*/
    _curry2(
    /*#__PURE__*/
    _checkForMethod('groupBy',
    /*#__PURE__*/
    reduceBy(function (acc, item) {
      if (acc == null) {
        acc = [];
      }

      acc.push(item);
      return acc;
    }, null)));

    /**
     * Takes a list and returns a list of lists where each sublist's elements are
     * all satisfied pairwise comparison according to the provided function.
     * Only adjacent elements are passed to the comparison function.
     *
     * @func
     * @memberOf R
     * @since v0.21.0
     * @category List
     * @sig ((a, a) → Boolean) → [a] → [[a]]
     * @param {Function} fn Function for determining whether two given (adjacent)
     *        elements should be in the same group
     * @param {Array} list The array to group. Also accepts a string, which will be
     *        treated as a list of characters.
     * @return {List} A list that contains sublists of elements,
     *         whose concatenations are equal to the original list.
     * @example
     *
     * R.groupWith(R.equals, [0, 1, 1, 2, 3, 5, 8, 13, 21])
     * //=> [[0], [1, 1], [2], [3], [5], [8], [13], [21]]
     *
     * R.groupWith((a, b) => a + 1 === b, [0, 1, 1, 2, 3, 5, 8, 13, 21])
     * //=> [[0, 1], [1, 2, 3], [5], [8], [13], [21]]
     *
     * R.groupWith((a, b) => a % 2 === b % 2, [0, 1, 1, 2, 3, 5, 8, 13, 21])
     * //=> [[0], [1, 1], [2], [3, 5], [8], [13, 21]]
     *
     * R.groupWith(R.eqBy(isVowel), 'aestiou')
     * //=> ['ae', 'st', 'iou']
     */

    var groupWith =
    /*#__PURE__*/
    _curry2(function (fn, list) {
      var res = [];
      var idx = 0;
      var len = list.length;

      while (idx < len) {
        var nextidx = idx + 1;

        while (nextidx < len && fn(list[nextidx - 1], list[nextidx])) {
          nextidx += 1;
        }

        res.push(list.slice(idx, nextidx));
        idx = nextidx;
      }

      return res;
    });

    /**
     * Returns `true` if the first argument is greater than the second; `false`
     * otherwise.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Relation
     * @sig Ord a => a -> a -> Boolean
     * @param {*} a
     * @param {*} b
     * @return {Boolean}
     * @see R.lt
     * @example
     *
     *      R.gt(2, 1); //=> true
     *      R.gt(2, 2); //=> false
     *      R.gt(2, 3); //=> false
     *      R.gt('a', 'z'); //=> false
     *      R.gt('z', 'a'); //=> true
     */

    var gt =
    /*#__PURE__*/
    _curry2(function gt(a, b) {
      return a > b;
    });

    /**
     * Returns `true` if the first argument is greater than or equal to the second;
     * `false` otherwise.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Relation
     * @sig Ord a => a -> a -> Boolean
     * @param {Number} a
     * @param {Number} b
     * @return {Boolean}
     * @see R.lte
     * @example
     *
     *      R.gte(2, 1); //=> true
     *      R.gte(2, 2); //=> true
     *      R.gte(2, 3); //=> false
     *      R.gte('a', 'z'); //=> false
     *      R.gte('z', 'a'); //=> true
     */

    var gte =
    /*#__PURE__*/
    _curry2(function gte(a, b) {
      return a >= b;
    });

    /**
     * Returns whether or not a path exists in an object. Only the object's
     * own properties are checked.
     *
     * @func
     * @memberOf R
     * @since v0.26.0
     * @category Object
     * @typedefn Idx = String | Int
     * @sig [Idx] -> {a} -> Boolean
     * @param {Array} path The path to use.
     * @param {Object} obj The object to check the path in.
     * @return {Boolean} Whether the path exists.
     * @see R.has
     * @example
     *
     *      R.hasPath(['a', 'b'], {a: {b: 2}});         // => true
     *      R.hasPath(['a', 'b'], {a: {b: undefined}}); // => true
     *      R.hasPath(['a', 'b'], {a: {c: 2}});         // => false
     *      R.hasPath(['a', 'b'], {});                  // => false
     */

    var hasPath =
    /*#__PURE__*/
    _curry2(function hasPath(_path, obj) {
      if (_path.length === 0 || isNil(obj)) {
        return false;
      }

      var val = obj;
      var idx = 0;

      while (idx < _path.length) {
        if (!isNil(val) && _has(_path[idx], val)) {
          val = val[_path[idx]];
          idx += 1;
        } else {
          return false;
        }
      }

      return true;
    });

    /**
     * Returns whether or not an object has an own property with the specified name
     *
     * @func
     * @memberOf R
     * @since v0.7.0
     * @category Object
     * @sig s -> {s: x} -> Boolean
     * @param {String} prop The name of the property to check for.
     * @param {Object} obj The object to query.
     * @return {Boolean} Whether the property exists.
     * @example
     *
     *      const hasName = R.has('name');
     *      hasName({name: 'alice'});   //=> true
     *      hasName({name: 'bob'});     //=> true
     *      hasName({});                //=> false
     *
     *      const point = {x: 0, y: 0};
     *      const pointHas = R.has(R.__, point);
     *      pointHas('x');  //=> true
     *      pointHas('y');  //=> true
     *      pointHas('z');  //=> false
     */

    var has =
    /*#__PURE__*/
    _curry2(function has(prop, obj) {
      return hasPath([prop], obj);
    });

    /**
     * Returns whether or not an object or its prototype chain has a property with
     * the specified name
     *
     * @func
     * @memberOf R
     * @since v0.7.0
     * @category Object
     * @sig s -> {s: x} -> Boolean
     * @param {String} prop The name of the property to check for.
     * @param {Object} obj The object to query.
     * @return {Boolean} Whether the property exists.
     * @example
     *
     *      function Rectangle(width, height) {
     *        this.width = width;
     *        this.height = height;
     *      }
     *      Rectangle.prototype.area = function() {
     *        return this.width * this.height;
     *      };
     *
     *      const square = new Rectangle(2, 2);
     *      R.hasIn('width', square);  //=> true
     *      R.hasIn('area', square);  //=> true
     */

    var hasIn =
    /*#__PURE__*/
    _curry2(function hasIn(prop, obj) {
      return prop in obj;
    });

    /**
     * Returns true if its arguments are identical, false otherwise. Values are
     * identical if they reference the same memory. `NaN` is identical to `NaN`;
     * `0` and `-0` are not identical.
     *
     * Note this is merely a curried version of ES6 `Object.is`.
     *
     * @func
     * @memberOf R
     * @since v0.15.0
     * @category Relation
     * @sig a -> a -> Boolean
     * @param {*} a
     * @param {*} b
     * @return {Boolean}
     * @example
     *
     *      const o = {};
     *      R.identical(o, o); //=> true
     *      R.identical(1, 1); //=> true
     *      R.identical(1, '1'); //=> false
     *      R.identical([], []); //=> false
     *      R.identical(0, -0); //=> false
     *      R.identical(NaN, NaN); //=> true
     */

    var identical =
    /*#__PURE__*/
    _curry2(_objectIs$1);

    /**
     * Creates a function that will process either the `onTrue` or the `onFalse`
     * function depending upon the result of the `condition` predicate.
     *
     * @func
     * @memberOf R
     * @since v0.8.0
     * @category Logic
     * @sig (*... -> Boolean) -> (*... -> *) -> (*... -> *) -> (*... -> *)
     * @param {Function} condition A predicate function
     * @param {Function} onTrue A function to invoke when the `condition` evaluates to a truthy value.
     * @param {Function} onFalse A function to invoke when the `condition` evaluates to a falsy value.
     * @return {Function} A new function that will process either the `onTrue` or the `onFalse`
     *                    function depending upon the result of the `condition` predicate.
     * @see R.unless, R.when, R.cond
     * @example
     *
     *      const incCount = R.ifElse(
     *        R.has('count'),
     *        R.over(R.lensProp('count'), R.inc),
     *        R.assoc('count', 1)
     *      );
     *      incCount({});           //=> { count: 1 }
     *      incCount({ count: 1 }); //=> { count: 2 }
     */

    var ifElse =
    /*#__PURE__*/
    _curry3(function ifElse(condition, onTrue, onFalse) {
      return curryN(Math.max(condition.length, onTrue.length, onFalse.length), function _ifElse() {
        return condition.apply(this, arguments) ? onTrue.apply(this, arguments) : onFalse.apply(this, arguments);
      });
    });

    /**
     * Increments its argument.
     *
     * @func
     * @memberOf R
     * @since v0.9.0
     * @category Math
     * @sig Number -> Number
     * @param {Number} n
     * @return {Number} n + 1
     * @see R.dec
     * @example
     *
     *      R.inc(42); //=> 43
     */

    var inc =
    /*#__PURE__*/
    add(1);

    /**
     * Returns `true` if the specified value is equal, in [`R.equals`](#equals)
     * terms, to at least one element of the given list; `false` otherwise.
     * Works also with strings.
     *
     * @func
     * @memberOf R
     * @since v0.26.0
     * @category List
     * @sig a -> [a] -> Boolean
     * @param {Object} a The item to compare against.
     * @param {Array} list The array to consider.
     * @return {Boolean} `true` if an equivalent item is in the list, `false` otherwise.
     * @see R.any
     * @example
     *
     *      R.includes(3, [1, 2, 3]); //=> true
     *      R.includes(4, [1, 2, 3]); //=> false
     *      R.includes({ name: 'Fred' }, [{ name: 'Fred' }]); //=> true
     *      R.includes([42], [[42]]); //=> true
     *      R.includes('ba', 'banana'); //=>true
     */

    var includes =
    /*#__PURE__*/
    _curry2(_includes);

    /**
     * Given a function that generates a key, turns a list of objects into an
     * object indexing the objects by the given key. Note that if multiple
     * objects generate the same value for the indexing key only the last value
     * will be included in the generated object.
     *
     * Acts as a transducer if a transformer is given in list position.
     *
     * @func
     * @memberOf R
     * @since v0.19.0
     * @category List
     * @sig (a -> String) -> [{k: v}] -> {k: {k: v}}
     * @param {Function} fn Function :: a -> String
     * @param {Array} array The array of objects to index
     * @return {Object} An object indexing each array element by the given property.
     * @example
     *
     *      const list = [{id: 'xyz', title: 'A'}, {id: 'abc', title: 'B'}];
     *      R.indexBy(R.prop('id'), list);
     *      //=> {abc: {id: 'abc', title: 'B'}, xyz: {id: 'xyz', title: 'A'}}
     */

    var indexBy =
    /*#__PURE__*/
    reduceBy(function (acc, elem) {
      return elem;
    }, null);

    /**
     * Returns the position of the first occurrence of an item in an array, or -1
     * if the item is not included in the array. [`R.equals`](#equals) is used to
     * determine equality.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig a -> [a] -> Number
     * @param {*} target The item to find.
     * @param {Array} xs The array to search in.
     * @return {Number} the index of the target, or -1 if the target is not found.
     * @see R.lastIndexOf
     * @example
     *
     *      R.indexOf(3, [1,2,3,4]); //=> 2
     *      R.indexOf(10, [1,2,3,4]); //=> -1
     */

    var indexOf =
    /*#__PURE__*/
    _curry2(function indexOf(target, xs) {
      return typeof xs.indexOf === 'function' && !_isArray(xs) ? xs.indexOf(target) : _indexOf(xs, target, 0);
    });

    /**
     * Returns all but the last element of the given list or string.
     *
     * @func
     * @memberOf R
     * @since v0.9.0
     * @category List
     * @sig [a] -> [a]
     * @sig String -> String
     * @param {*} list
     * @return {*}
     * @see R.last, R.head, R.tail
     * @example
     *
     *      R.init([1, 2, 3]);  //=> [1, 2]
     *      R.init([1, 2]);     //=> [1]
     *      R.init([1]);        //=> []
     *      R.init([]);         //=> []
     *
     *      R.init('abc');  //=> 'ab'
     *      R.init('ab');   //=> 'a'
     *      R.init('a');    //=> ''
     *      R.init('');     //=> ''
     */

    var init$1 =
    /*#__PURE__*/
    slice(0, -1);

    /**
     * Takes a predicate `pred`, a list `xs`, and a list `ys`, and returns a list
     * `xs'` comprising each of the elements of `xs` which is equal to one or more
     * elements of `ys` according to `pred`.
     *
     * `pred` must be a binary function expecting an element from each list.
     *
     * `xs`, `ys`, and `xs'` are treated as sets, semantically, so ordering should
     * not be significant, but since `xs'` is ordered the implementation guarantees
     * that its values are in the same order as they appear in `xs`. Duplicates are
     * not removed, so `xs'` may contain duplicates if `xs` contains duplicates.
     *
     * @func
     * @memberOf R
     * @since v0.24.0
     * @category Relation
     * @sig ((a, b) -> Boolean) -> [a] -> [b] -> [a]
     * @param {Function} pred
     * @param {Array} xs
     * @param {Array} ys
     * @return {Array}
     * @see R.intersection
     * @example
     *
     *      R.innerJoin(
     *        (record, id) => record.id === id,
     *        [{id: 824, name: 'Richie Furay'},
     *         {id: 956, name: 'Dewey Martin'},
     *         {id: 313, name: 'Bruce Palmer'},
     *         {id: 456, name: 'Stephen Stills'},
     *         {id: 177, name: 'Neil Young'}],
     *        [177, 456, 999]
     *      );
     *      //=> [{id: 456, name: 'Stephen Stills'}, {id: 177, name: 'Neil Young'}]
     */

    var innerJoin =
    /*#__PURE__*/
    _curry3(function innerJoin(pred, xs, ys) {
      return _filter(function (x) {
        return _includesWith(pred, x, ys);
      }, xs);
    });

    /**
     * Inserts the supplied element into the list, at the specified `index`. _Note that

     * this is not destructive_: it returns a copy of the list with the changes.
     * <small>No lists have been harmed in the application of this function.</small>
     *
     * @func
     * @memberOf R
     * @since v0.2.2
     * @category List
     * @sig Number -> a -> [a] -> [a]
     * @param {Number} index The position to insert the element
     * @param {*} elt The element to insert into the Array
     * @param {Array} list The list to insert into
     * @return {Array} A new Array with `elt` inserted at `index`.
     * @example
     *
     *      R.insert(2, 'x', [1,2,3,4]); //=> [1,2,'x',3,4]
     */

    var insert$1 =
    /*#__PURE__*/
    _curry3(function insert(idx, elt, list) {
      idx = idx < list.length && idx >= 0 ? idx : list.length;
      var result = Array.prototype.slice.call(list, 0);
      result.splice(idx, 0, elt);
      return result;
    });

    /**
     * Inserts the sub-list into the list, at the specified `index`. _Note that this is not
     * destructive_: it returns a copy of the list with the changes.
     * <small>No lists have been harmed in the application of this function.</small>
     *
     * @func
     * @memberOf R
     * @since v0.9.0
     * @category List
     * @sig Number -> [a] -> [a] -> [a]
     * @param {Number} index The position to insert the sub-list
     * @param {Array} elts The sub-list to insert into the Array
     * @param {Array} list The list to insert the sub-list into
     * @return {Array} A new Array with `elts` inserted starting at `index`.
     * @example
     *
     *      R.insertAll(2, ['x','y','z'], [1,2,3,4]); //=> [1,2,'x','y','z',3,4]
     */

    var insertAll =
    /*#__PURE__*/
    _curry3(function insertAll(idx, elts, list) {
      idx = idx < list.length && idx >= 0 ? idx : list.length;
      return [].concat(Array.prototype.slice.call(list, 0, idx), elts, Array.prototype.slice.call(list, idx));
    });

    /**
     * Returns a new list containing only one copy of each element in the original
     * list, based upon the value returned by applying the supplied function to
     * each list element. Prefers the first item if the supplied function produces
     * the same value on two items. [`R.equals`](#equals) is used for comparison.
     *
     * @func
     * @memberOf R
     * @since v0.16.0
     * @category List
     * @sig (a -> b) -> [a] -> [a]
     * @param {Function} fn A function used to produce a value to use during comparisons.
     * @param {Array} list The array to consider.
     * @return {Array} The list of unique items.
     * @example
     *
     *      R.uniqBy(Math.abs, [-1, -5, 2, 10, 1, 2]); //=> [-1, -5, 2, 10]
     */

    var uniqBy =
    /*#__PURE__*/
    _curry2(function uniqBy(fn, list) {
      var set = new _Set();
      var result = [];
      var idx = 0;
      var appliedItem, item;

      while (idx < list.length) {
        item = list[idx];
        appliedItem = fn(item);

        if (set.add(appliedItem)) {
          result.push(item);
        }

        idx += 1;
      }

      return result;
    });

    /**
     * Returns a new list containing only one copy of each element in the original
     * list. [`R.equals`](#equals) is used to determine equality.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig [a] -> [a]
     * @param {Array} list The array to consider.
     * @return {Array} The list of unique items.
     * @example
     *
     *      R.uniq([1, 1, 2, 1]); //=> [1, 2]
     *      R.uniq([1, '1']);     //=> [1, '1']
     *      R.uniq([[42], [42]]); //=> [[42]]
     */

    var uniq =
    /*#__PURE__*/
    uniqBy(identity);

    /**
     * Combines two lists into a set (i.e. no duplicates) composed of those
     * elements common to both lists.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Relation
     * @sig [*] -> [*] -> [*]
     * @param {Array} list1 The first list.
     * @param {Array} list2 The second list.
     * @return {Array} The list of elements found in both `list1` and `list2`.
     * @see R.innerJoin
     * @example
     *
     *      R.intersection([1,2,3,4], [7,6,5,4,3]); //=> [4, 3]
     */

    var intersection =
    /*#__PURE__*/
    _curry2(function intersection(list1, list2) {
      var lookupList, filteredList;

      if (list1.length > list2.length) {
        lookupList = list1;
        filteredList = list2;
      } else {
        lookupList = list2;
        filteredList = list1;
      }

      return uniq(_filter(flip(_includes)(lookupList), filteredList));
    });

    /**
     * Creates a new list with the separator interposed between elements.
     *
     * Dispatches to the `intersperse` method of the second argument, if present.
     *
     * @func
     * @memberOf R
     * @since v0.14.0
     * @category List
     * @sig a -> [a] -> [a]
     * @param {*} separator The element to add to the list.
     * @param {Array} list The list to be interposed.
     * @return {Array} The new list.
     * @example
     *
     *      R.intersperse('a', ['b', 'n', 'n', 's']); //=> ['b', 'a', 'n', 'a', 'n', 'a', 's']
     */

    var intersperse =
    /*#__PURE__*/
    _curry2(
    /*#__PURE__*/
    _checkForMethod('intersperse', function intersperse(separator, list) {
      var out = [];
      var idx = 0;
      var length = list.length;

      while (idx < length) {
        if (idx === length - 1) {
          out.push(list[idx]);
        } else {
          out.push(list[idx], separator);
        }

        idx += 1;
      }

      return out;
    }));

    function _objectAssign(target) {
      if (target == null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var output = Object(target);
      var idx = 1;
      var length = arguments.length;

      while (idx < length) {
        var source = arguments[idx];

        if (source != null) {
          for (var nextKey in source) {
            if (_has(nextKey, source)) {
              output[nextKey] = source[nextKey];
            }
          }
        }

        idx += 1;
      }

      return output;
    }

    var _objectAssign$1 = typeof Object.assign === 'function' ? Object.assign : _objectAssign;

    /**
     * Creates an object containing a single key:value pair.
     *
     * @func
     * @memberOf R
     * @since v0.18.0
     * @category Object
     * @sig String -> a -> {String:a}
     * @param {String} key
     * @param {*} val
     * @return {Object}
     * @see R.pair
     * @example
     *
     *      const matchPhrases = R.compose(
     *        R.objOf('must'),
     *        R.map(R.objOf('match_phrase'))
     *      );
     *      matchPhrases(['foo', 'bar', 'baz']); //=> {must: [{match_phrase: 'foo'}, {match_phrase: 'bar'}, {match_phrase: 'baz'}]}
     */

    var objOf =
    /*#__PURE__*/
    _curry2(function objOf(key, val) {
      var obj = {};
      obj[key] = val;
      return obj;
    });

    var _stepCatArray = {
      '@@transducer/init': Array,
      '@@transducer/step': function (xs, x) {
        xs.push(x);
        return xs;
      },
      '@@transducer/result': _identity
    };
    var _stepCatString = {
      '@@transducer/init': String,
      '@@transducer/step': function (a, b) {
        return a + b;
      },
      '@@transducer/result': _identity
    };
    var _stepCatObject = {
      '@@transducer/init': Object,
      '@@transducer/step': function (result, input) {
        return _objectAssign$1(result, _isArrayLike(input) ? objOf(input[0], input[1]) : input);
      },
      '@@transducer/result': _identity
    };
    function _stepCat(obj) {
      if (_isTransformer(obj)) {
        return obj;
      }

      if (_isArrayLike(obj)) {
        return _stepCatArray;
      }

      if (typeof obj === 'string') {
        return _stepCatString;
      }

      if (typeof obj === 'object') {
        return _stepCatObject;
      }

      throw new Error('Cannot create transformer for ' + obj);
    }

    /**
     * Transforms the items of the list with the transducer and appends the
     * transformed items to the accumulator using an appropriate iterator function
     * based on the accumulator type.
     *
     * The accumulator can be an array, string, object or a transformer. Iterated
     * items will be appended to arrays and concatenated to strings. Objects will
     * be merged directly or 2-item arrays will be merged as key, value pairs.
     *
     * The accumulator can also be a transformer object that provides a 2-arity
     * reducing iterator function, step, 0-arity initial value function, init, and
     * 1-arity result extraction function result. The step function is used as the
     * iterator function in reduce. The result function is used to convert the
     * final accumulator into the return type and in most cases is R.identity. The
     * init function is used to provide the initial accumulator.
     *
     * The iteration is performed with [`R.reduce`](#reduce) after initializing the
     * transducer.
     *
     * @func
     * @memberOf R
     * @since v0.12.0
     * @category List
     * @sig a -> (b -> b) -> [c] -> a
     * @param {*} acc The initial accumulator value.
     * @param {Function} xf The transducer function. Receives a transformer and returns a transformer.
     * @param {Array} list The list to iterate over.
     * @return {*} The final, accumulated value.
     * @see R.transduce
     * @example
     *
     *      const numbers = [1, 2, 3, 4];
     *      const transducer = R.compose(R.map(R.add(1)), R.take(2));
     *
     *      R.into([], transducer, numbers); //=> [2, 3]
     *
     *      const intoArray = R.into([]);
     *      intoArray(transducer, numbers); //=> [2, 3]
     */

    var into =
    /*#__PURE__*/
    _curry3(function into(acc, xf, list) {
      return _isTransformer(acc) ? _reduce(xf(acc), acc['@@transducer/init'](), list) : _reduce(xf(_stepCat(acc)), _clone(acc, [], [], false), list);
    });

    /**
     * Same as [`R.invertObj`](#invertObj), however this accounts for objects with
     * duplicate values by putting the values into an array.
     *
     * @func
     * @memberOf R
     * @since v0.9.0
     * @category Object
     * @sig {s: x} -> {x: [ s, ... ]}
     * @param {Object} obj The object or array to invert
     * @return {Object} out A new object with keys in an array.
     * @see R.invertObj
     * @example
     *
     *      const raceResultsByFirstName = {
     *        first: 'alice',
     *        second: 'jake',
     *        third: 'alice',
     *      };
     *      R.invert(raceResultsByFirstName);
     *      //=> { 'alice': ['first', 'third'], 'jake':['second'] }
     */

    var invert =
    /*#__PURE__*/
    _curry1(function invert(obj) {
      var props = keys(obj);
      var len = props.length;
      var idx = 0;
      var out = {};

      while (idx < len) {
        var key = props[idx];
        var val = obj[key];
        var list = _has(val, out) ? out[val] : out[val] = [];
        list[list.length] = key;
        idx += 1;
      }

      return out;
    });

    /**
     * Returns a new object with the keys of the given object as values, and the
     * values of the given object, which are coerced to strings, as keys. Note
     * that the last key found is preferred when handling the same value.
     *
     * @func
     * @memberOf R
     * @since v0.9.0
     * @category Object
     * @sig {s: x} -> {x: s}
     * @param {Object} obj The object or array to invert
     * @return {Object} out A new object
     * @see R.invert
     * @example
     *
     *      const raceResults = {
     *        first: 'alice',
     *        second: 'jake'
     *      };
     *      R.invertObj(raceResults);
     *      //=> { 'alice': 'first', 'jake':'second' }
     *
     *      // Alternatively:
     *      const raceResults = ['alice', 'jake'];
     *      R.invertObj(raceResults);
     *      //=> { 'alice': '0', 'jake':'1' }
     */

    var invertObj =
    /*#__PURE__*/
    _curry1(function invertObj(obj) {
      var props = keys(obj);
      var len = props.length;
      var idx = 0;
      var out = {};

      while (idx < len) {
        var key = props[idx];
        out[obj[key]] = key;
        idx += 1;
      }

      return out;
    });

    /**
     * Turns a named method with a specified arity into a function that can be
     * called directly supplied with arguments and a target object.
     *
     * The returned function is curried and accepts `arity + 1` parameters where
     * the final parameter is the target object.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Function
     * @sig Number -> String -> (a -> b -> ... -> n -> Object -> *)
     * @param {Number} arity Number of arguments the returned function should take
     *        before the target object.
     * @param {String} method Name of any of the target object's methods to call.
     * @return {Function} A new curried function.
     * @see R.construct
     * @example
     *
     *      const sliceFrom = R.invoker(1, 'slice');
     *      sliceFrom(6, 'abcdefghijklm'); //=> 'ghijklm'
     *      const sliceFrom6 = R.invoker(2, 'slice')(6);
     *      sliceFrom6(8, 'abcdefghijklm'); //=> 'gh'
     *
     *      const dog = {
     *        speak: async () => 'Woof!'
     *      };
     *      const speak = R.invoker(0, 'speak');
     *      speak(dog).then(console.log) //~> 'Woof!'
     *
     * @symb R.invoker(0, 'method')(o) = o['method']()
     * @symb R.invoker(1, 'method')(a, o) = o['method'](a)
     * @symb R.invoker(2, 'method')(a, b, o) = o['method'](a, b)
     */

    var invoker =
    /*#__PURE__*/
    _curry2(function invoker(arity, method) {
      return curryN(arity + 1, function () {
        var target = arguments[arity];

        if (target != null && _isFunction(target[method])) {
          return target[method].apply(target, Array.prototype.slice.call(arguments, 0, arity));
        }

        throw new TypeError(toString$1(target) + ' does not have a method named "' + method + '"');
      });
    });

    /**
     * See if an object (`val`) is an instance of the supplied constructor. This
     * function will check up the inheritance chain, if any.
     *
     * @func
     * @memberOf R
     * @since v0.3.0
     * @category Type
     * @sig (* -> {*}) -> a -> Boolean
     * @param {Object} ctor A constructor
     * @param {*} val The value to test
     * @return {Boolean}
     * @example
     *
     *      R.is(Object, {}); //=> true
     *      R.is(Number, 1); //=> true
     *      R.is(Object, 1); //=> false
     *      R.is(String, 's'); //=> true
     *      R.is(String, new String('')); //=> true
     *      R.is(Object, new String('')); //=> true
     *      R.is(Object, 's'); //=> false
     *      R.is(Number, {}); //=> false
     */

    var is =
    /*#__PURE__*/
    _curry2(function is(Ctor, val) {
      return val != null && val.constructor === Ctor || val instanceof Ctor;
    });

    /**
     * Returns `true` if the given value is its type's empty value; `false`
     * otherwise.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Logic
     * @sig a -> Boolean
     * @param {*} x
     * @return {Boolean}
     * @see R.empty
     * @example
     *
     *      R.isEmpty([1, 2, 3]);   //=> false
     *      R.isEmpty([]);          //=> true
     *      R.isEmpty('');          //=> true
     *      R.isEmpty(null);        //=> false
     *      R.isEmpty({});          //=> true
     *      R.isEmpty({length: 0}); //=> false
     */

    var isEmpty =
    /*#__PURE__*/
    _curry1(function isEmpty(x) {
      return x != null && equals(x, empty$1(x));
    });

    /**
     * Returns a string made by inserting the `separator` between each element and
     * concatenating all the elements into a single string.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig String -> [a] -> String
     * @param {Number|String} separator The string used to separate the elements.
     * @param {Array} xs The elements to join into a string.
     * @return {String} str The string made by concatenating `xs` with `separator`.
     * @see R.split
     * @example
     *
     *      const spacer = R.join(' ');
     *      spacer(['a', 2, 3.4]);   //=> 'a 2 3.4'
     *      R.join('|', [1, 2, 3]);    //=> '1|2|3'
     */

    var join =
    /*#__PURE__*/
    invoker(1, 'join');

    /**
     * juxt applies a list of functions to a list of values.
     *
     * @func
     * @memberOf R
     * @since v0.19.0
     * @category Function
     * @sig [(a, b, ..., m) -> n] -> ((a, b, ..., m) -> [n])
     * @param {Array} fns An array of functions
     * @return {Function} A function that returns a list of values after applying each of the original `fns` to its parameters.
     * @see R.applySpec
     * @example
     *
     *      const getRange = R.juxt([Math.min, Math.max]);
     *      getRange(3, 4, 9, -3); //=> [-3, 9]
     * @symb R.juxt([f, g, h])(a, b) = [f(a, b), g(a, b), h(a, b)]
     */

    var juxt =
    /*#__PURE__*/
    _curry1(function juxt(fns) {
      return converge(function () {
        return Array.prototype.slice.call(arguments, 0);
      }, fns);
    });

    /**
     * Returns a list containing the names of all the properties of the supplied
     * object, including prototype properties.
     * Note that the order of the output array is not guaranteed to be consistent
     * across different JS platforms.
     *
     * @func
     * @memberOf R
     * @since v0.2.0
     * @category Object
     * @sig {k: v} -> [k]
     * @param {Object} obj The object to extract properties from
     * @return {Array} An array of the object's own and prototype properties.
     * @see R.keys, R.valuesIn
     * @example
     *
     *      const F = function() { this.x = 'X'; };
     *      F.prototype.y = 'Y';
     *      const f = new F();
     *      R.keysIn(f); //=> ['x', 'y']
     */

    var keysIn =
    /*#__PURE__*/
    _curry1(function keysIn(obj) {
      var prop;
      var ks = [];

      for (prop in obj) {
        ks[ks.length] = prop;
      }

      return ks;
    });

    /**
     * Returns the position of the last occurrence of an item in an array, or -1 if
     * the item is not included in the array. [`R.equals`](#equals) is used to
     * determine equality.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig a -> [a] -> Number
     * @param {*} target The item to find.
     * @param {Array} xs The array to search in.
     * @return {Number} the index of the target, or -1 if the target is not found.
     * @see R.indexOf
     * @example
     *
     *      R.lastIndexOf(3, [-1,3,3,0,1,2,3,4]); //=> 6
     *      R.lastIndexOf(10, [1,2,3,4]); //=> -1
     */

    var lastIndexOf =
    /*#__PURE__*/
    _curry2(function lastIndexOf(target, xs) {
      if (typeof xs.lastIndexOf === 'function' && !_isArray(xs)) {
        return xs.lastIndexOf(target);
      } else {
        var idx = xs.length - 1;

        while (idx >= 0) {
          if (equals(xs[idx], target)) {
            return idx;
          }

          idx -= 1;
        }

        return -1;
      }
    });

    function _isNumber(x) {
      return Object.prototype.toString.call(x) === '[object Number]';
    }

    /**
     * Returns the number of elements in the array by returning `list.length`.
     *
     * @func
     * @memberOf R
     * @since v0.3.0
     * @category List
     * @sig [a] -> Number
     * @param {Array} list The array to inspect.
     * @return {Number} The length of the array.
     * @example
     *
     *      R.length([]); //=> 0
     *      R.length([1, 2, 3]); //=> 3
     */

    var length =
    /*#__PURE__*/
    _curry1(function length(list) {
      return list != null && _isNumber(list.length) ? list.length : NaN;
    });

    /**
     * Returns a lens for the given getter and setter functions. The getter "gets"
     * the value of the focus; the setter "sets" the value of the focus. The setter
     * should not mutate the data structure.
     *
     * @func
     * @memberOf R
     * @since v0.8.0
     * @category Object
     * @typedefn Lens s a = Functor f => (a -> f a) -> s -> f s
     * @sig (s -> a) -> ((a, s) -> s) -> Lens s a
     * @param {Function} getter
     * @param {Function} setter
     * @return {Lens}
     * @see R.view, R.set, R.over, R.lensIndex, R.lensProp
     * @example
     *
     *      const xLens = R.lens(R.prop('x'), R.assoc('x'));
     *
     *      R.view(xLens, {x: 1, y: 2});            //=> 1
     *      R.set(xLens, 4, {x: 1, y: 2});          //=> {x: 4, y: 2}
     *      R.over(xLens, R.negate, {x: 1, y: 2});  //=> {x: -1, y: 2}
     */

    var lens =
    /*#__PURE__*/
    _curry2(function lens(getter, setter) {
      return function (toFunctorFn) {
        return function (target) {
          return map(function (focus) {
            return setter(focus, target);
          }, toFunctorFn(getter(target)));
        };
      };
    });

    /**
     * Returns a lens whose focus is the specified index.
     *
     * @func
     * @memberOf R
     * @since v0.14.0
     * @category Object
     * @typedefn Lens s a = Functor f => (a -> f a) -> s -> f s
     * @sig Number -> Lens s a
     * @param {Number} n
     * @return {Lens}
     * @see R.view, R.set, R.over, R.nth
     * @example
     *
     *      const headLens = R.lensIndex(0);
     *
     *      R.view(headLens, ['a', 'b', 'c']);            //=> 'a'
     *      R.set(headLens, 'x', ['a', 'b', 'c']);        //=> ['x', 'b', 'c']
     *      R.over(headLens, R.toUpper, ['a', 'b', 'c']); //=> ['A', 'b', 'c']
     */

    var lensIndex =
    /*#__PURE__*/
    _curry1(function lensIndex(n) {
      return lens(nth(n), update$1(n));
    });

    /**
     * Returns a lens whose focus is the specified path.
     *
     * @func
     * @memberOf R
     * @since v0.19.0
     * @category Object
     * @typedefn Idx = String | Int
     * @typedefn Lens s a = Functor f => (a -> f a) -> s -> f s
     * @sig [Idx] -> Lens s a
     * @param {Array} path The path to use.
     * @return {Lens}
     * @see R.view, R.set, R.over
     * @example
     *
     *      const xHeadYLens = R.lensPath(['x', 0, 'y']);
     *
     *      R.view(xHeadYLens, {x: [{y: 2, z: 3}, {y: 4, z: 5}]});
     *      //=> 2
     *      R.set(xHeadYLens, 1, {x: [{y: 2, z: 3}, {y: 4, z: 5}]});
     *      //=> {x: [{y: 1, z: 3}, {y: 4, z: 5}]}
     *      R.over(xHeadYLens, R.negate, {x: [{y: 2, z: 3}, {y: 4, z: 5}]});
     *      //=> {x: [{y: -2, z: 3}, {y: 4, z: 5}]}
     */

    var lensPath =
    /*#__PURE__*/
    _curry1(function lensPath(p) {
      return lens(path(p), assocPath(p));
    });

    /**
     * Returns a lens whose focus is the specified property.
     *
     * @func
     * @memberOf R
     * @since v0.14.0
     * @category Object
     * @typedefn Lens s a = Functor f => (a -> f a) -> s -> f s
     * @sig String -> Lens s a
     * @param {String} k
     * @return {Lens}
     * @see R.view, R.set, R.over
     * @example
     *
     *      const xLens = R.lensProp('x');
     *
     *      R.view(xLens, {x: 1, y: 2});            //=> 1
     *      R.set(xLens, 4, {x: 1, y: 2});          //=> {x: 4, y: 2}
     *      R.over(xLens, R.negate, {x: 1, y: 2});  //=> {x: -1, y: 2}
     */

    var lensProp =
    /*#__PURE__*/
    _curry1(function lensProp(k) {
      return lens(prop(k), assoc(k));
    });

    /**
     * Returns `true` if the first argument is less than the second; `false`
     * otherwise.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Relation
     * @sig Ord a => a -> a -> Boolean
     * @param {*} a
     * @param {*} b
     * @return {Boolean}
     * @see R.gt
     * @example
     *
     *      R.lt(2, 1); //=> false
     *      R.lt(2, 2); //=> false
     *      R.lt(2, 3); //=> true
     *      R.lt('a', 'z'); //=> true
     *      R.lt('z', 'a'); //=> false
     */

    var lt =
    /*#__PURE__*/
    _curry2(function lt(a, b) {
      return a < b;
    });

    /**
     * Returns `true` if the first argument is less than or equal to the second;
     * `false` otherwise.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Relation
     * @sig Ord a => a -> a -> Boolean
     * @param {Number} a
     * @param {Number} b
     * @return {Boolean}
     * @see R.gte
     * @example
     *
     *      R.lte(2, 1); //=> false
     *      R.lte(2, 2); //=> true
     *      R.lte(2, 3); //=> true
     *      R.lte('a', 'z'); //=> true
     *      R.lte('z', 'a'); //=> false
     */

    var lte =
    /*#__PURE__*/
    _curry2(function lte(a, b) {
      return a <= b;
    });

    /**
     * The `mapAccum` function behaves like a combination of map and reduce; it
     * applies a function to each element of a list, passing an accumulating
     * parameter from left to right, and returning a final value of this
     * accumulator together with the new list.
     *
     * The iterator function receives two arguments, *acc* and *value*, and should
     * return a tuple *[acc, value]*.
     *
     * @func
     * @memberOf R
     * @since v0.10.0
     * @category List
     * @sig ((acc, x) -> (acc, y)) -> acc -> [x] -> (acc, [y])
     * @param {Function} fn The function to be called on every element of the input `list`.
     * @param {*} acc The accumulator value.
     * @param {Array} list The list to iterate over.
     * @return {*} The final, accumulated value.
     * @see R.scan, R.addIndex, R.mapAccumRight
     * @example
     *
     *      const digits = ['1', '2', '3', '4'];
     *      const appender = (a, b) => [a + b, a + b];
     *
     *      R.mapAccum(appender, 0, digits); //=> ['01234', ['01', '012', '0123', '01234']]
     * @symb R.mapAccum(f, a, [b, c, d]) = [
     *   f(f(f(a, b)[0], c)[0], d)[0],
     *   [
     *     f(a, b)[1],
     *     f(f(a, b)[0], c)[1],
     *     f(f(f(a, b)[0], c)[0], d)[1]
     *   ]
     * ]
     */

    var mapAccum =
    /*#__PURE__*/
    _curry3(function mapAccum(fn, acc, list) {
      var idx = 0;
      var len = list.length;
      var result = [];
      var tuple = [acc];

      while (idx < len) {
        tuple = fn(tuple[0], list[idx]);
        result[idx] = tuple[1];
        idx += 1;
      }

      return [tuple[0], result];
    });

    /**
     * The `mapAccumRight` function behaves like a combination of map and reduce; it
     * applies a function to each element of a list, passing an accumulating
     * parameter from right to left, and returning a final value of this
     * accumulator together with the new list.
     *
     * Similar to [`mapAccum`](#mapAccum), except moves through the input list from
     * the right to the left.
     *
     * The iterator function receives two arguments, *acc* and *value*, and should
     * return a tuple *[acc, value]*.
     *
     * @func
     * @memberOf R
     * @since v0.10.0
     * @category List
     * @sig ((acc, x) -> (acc, y)) -> acc -> [x] -> (acc, [y])
     * @param {Function} fn The function to be called on every element of the input `list`.
     * @param {*} acc The accumulator value.
     * @param {Array} list The list to iterate over.
     * @return {*} The final, accumulated value.
     * @see R.addIndex, R.mapAccum
     * @example
     *
     *      const digits = ['1', '2', '3', '4'];
     *      const appender = (a, b) => [b + a, b + a];
     *
     *      R.mapAccumRight(appender, 5, digits); //=> ['12345', ['12345', '2345', '345', '45']]
     * @symb R.mapAccumRight(f, a, [b, c, d]) = [
     *   f(f(f(a, d)[0], c)[0], b)[0],
     *   [
     *     f(a, d)[1],
     *     f(f(a, d)[0], c)[1],
     *     f(f(f(a, d)[0], c)[0], b)[1]
     *   ]
     * ]
     */

    var mapAccumRight =
    /*#__PURE__*/
    _curry3(function mapAccumRight(fn, acc, list) {
      var idx = list.length - 1;
      var result = [];
      var tuple = [acc];

      while (idx >= 0) {
        tuple = fn(tuple[0], list[idx]);
        result[idx] = tuple[1];
        idx -= 1;
      }

      return [tuple[0], result];
    });

    /**
     * An Object-specific version of [`map`](#map). The function is applied to three
     * arguments: *(value, key, obj)*. If only the value is significant, use
     * [`map`](#map) instead.
     *
     * @func
     * @memberOf R
     * @since v0.9.0
     * @category Object
     * @sig ((*, String, Object) -> *) -> Object -> Object
     * @param {Function} fn
     * @param {Object} obj
     * @return {Object}
     * @see R.map
     * @example
     *
     *      const xyz = { x: 1, y: 2, z: 3 };
     *      const prependKeyAndDouble = (num, key, obj) => key + (num * 2);
     *
     *      R.mapObjIndexed(prependKeyAndDouble, xyz); //=> { x: 'x2', y: 'y4', z: 'z6' }
     */

    var mapObjIndexed =
    /*#__PURE__*/
    _curry2(function mapObjIndexed(fn, obj) {
      return _reduce(function (acc, key) {
        acc[key] = fn(obj[key], key, obj);
        return acc;
      }, {}, keys(obj));
    });

    /**
     * Tests a regular expression against a String. Note that this function will
     * return an empty array when there are no matches. This differs from
     * [`String.prototype.match`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match)
     * which returns `null` when there are no matches.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category String
     * @sig RegExp -> String -> [String | Undefined]
     * @param {RegExp} rx A regular expression.
     * @param {String} str The string to match against
     * @return {Array} The list of matches or empty array.
     * @see R.test
     * @example
     *
     *      R.match(/([a-z]a)/g, 'bananas'); //=> ['ba', 'na', 'na']
     *      R.match(/a/, 'b'); //=> []
     *      R.match(/a/, null); //=> TypeError: null does not have a method named "match"
     */

    var match =
    /*#__PURE__*/
    _curry2(function match(rx, str) {
      return str.match(rx) || [];
    });

    /**
     * `mathMod` behaves like the modulo operator should mathematically, unlike the
     * `%` operator (and by extension, [`R.modulo`](#modulo)). So while
     * `-17 % 5` is `-2`, `mathMod(-17, 5)` is `3`. `mathMod` requires Integer
     * arguments, and returns NaN when the modulus is zero or negative.
     *
     * @func
     * @memberOf R
     * @since v0.3.0
     * @category Math
     * @sig Number -> Number -> Number
     * @param {Number} m The dividend.
     * @param {Number} p the modulus.
     * @return {Number} The result of `b mod a`.
     * @see R.modulo
     * @example
     *
     *      R.mathMod(-17, 5);  //=> 3
     *      R.mathMod(17, 5);   //=> 2
     *      R.mathMod(17, -5);  //=> NaN
     *      R.mathMod(17, 0);   //=> NaN
     *      R.mathMod(17.2, 5); //=> NaN
     *      R.mathMod(17, 5.3); //=> NaN
     *
     *      const clock = R.mathMod(R.__, 12);
     *      clock(15); //=> 3
     *      clock(24); //=> 0
     *
     *      const seventeenMod = R.mathMod(17);
     *      seventeenMod(3);  //=> 2
     *      seventeenMod(4);  //=> 1
     *      seventeenMod(10); //=> 7
     */

    var mathMod =
    /*#__PURE__*/
    _curry2(function mathMod(m, p) {
      if (!_isInteger(m)) {
        return NaN;
      }

      if (!_isInteger(p) || p < 1) {
        return NaN;
      }

      return (m % p + p) % p;
    });

    /**
     * Takes a function and two values, and returns whichever value produces the
     * larger result when passed to the provided function.
     *
     * @func
     * @memberOf R
     * @since v0.8.0
     * @category Relation
     * @sig Ord b => (a -> b) -> a -> a -> a
     * @param {Function} f
     * @param {*} a
     * @param {*} b
     * @return {*}
     * @see R.max, R.minBy
     * @example
     *
     *      //  square :: Number -> Number
     *      const square = n => n * n;
     *
     *      R.maxBy(square, -3, 2); //=> -3
     *
     *      R.reduce(R.maxBy(square), 0, [3, -5, 4, 1, -2]); //=> -5
     *      R.reduce(R.maxBy(square), 0, []); //=> 0
     */

    var maxBy =
    /*#__PURE__*/
    _curry3(function maxBy(f, a, b) {
      return f(b) > f(a) ? b : a;
    });

    /**
     * Adds together all the elements of a list.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Math
     * @sig [Number] -> Number
     * @param {Array} list An array of numbers
     * @return {Number} The sum of all the numbers in the list.
     * @see R.reduce
     * @example
     *
     *      R.sum([2,4,6,8,100,1]); //=> 121
     */

    var sum =
    /*#__PURE__*/
    reduce(add, 0);

    /**
     * Returns the mean of the given list of numbers.
     *
     * @func
     * @memberOf R
     * @since v0.14.0
     * @category Math
     * @sig [Number] -> Number
     * @param {Array} list
     * @return {Number}
     * @see R.median
     * @example
     *
     *      R.mean([2, 7, 9]); //=> 6
     *      R.mean([]); //=> NaN
     */

    var mean =
    /*#__PURE__*/
    _curry1(function mean(list) {
      return sum(list) / list.length;
    });

    /**
     * Returns the median of the given list of numbers.
     *
     * @func
     * @memberOf R
     * @since v0.14.0
     * @category Math
     * @sig [Number] -> Number
     * @param {Array} list
     * @return {Number}
     * @see R.mean
     * @example
     *
     *      R.median([2, 9, 7]); //=> 7
     *      R.median([7, 2, 10, 9]); //=> 8
     *      R.median([]); //=> NaN
     */

    var median =
    /*#__PURE__*/
    _curry1(function median(list) {
      var len = list.length;

      if (len === 0) {
        return NaN;
      }

      var width = 2 - len % 2;
      var idx = (len - width) / 2;
      return mean(Array.prototype.slice.call(list, 0).sort(function (a, b) {
        return a < b ? -1 : a > b ? 1 : 0;
      }).slice(idx, idx + width));
    });

    /**
     * Creates a new function that, when invoked, caches the result of calling `fn`
     * for a given argument set and returns the result. Subsequent calls to the
     * memoized `fn` with the same argument set will not result in an additional
     * call to `fn`; instead, the cached result for that set of arguments will be
     * returned.
     *
     *
     * @func
     * @memberOf R
     * @since v0.24.0
     * @category Function
     * @sig (*... -> String) -> (*... -> a) -> (*... -> a)
     * @param {Function} fn The function to generate the cache key.
     * @param {Function} fn The function to memoize.
     * @return {Function} Memoized version of `fn`.
     * @example
     *
     *      let count = 0;
     *      const factorial = R.memoizeWith(R.identity, n => {
     *        count += 1;
     *        return R.product(R.range(1, n + 1));
     *      });
     *      factorial(5); //=> 120
     *      factorial(5); //=> 120
     *      factorial(5); //=> 120
     *      count; //=> 1
     */

    var memoizeWith =
    /*#__PURE__*/
    _curry2(function memoizeWith(mFn, fn) {
      var cache = {};
      return _arity(fn.length, function () {
        var key = mFn.apply(this, arguments);

        if (!_has(key, cache)) {
          cache[key] = fn.apply(this, arguments);
        }

        return cache[key];
      });
    });

    /**
     * Create a new object with the own properties of the first object merged with
     * the own properties of the second object. If a key exists in both objects,
     * the value from the second object will be used.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Object
     * @sig {k: v} -> {k: v} -> {k: v}
     * @param {Object} l
     * @param {Object} r
     * @return {Object}
     * @see R.mergeRight, R.mergeDeepRight, R.mergeWith, R.mergeWithKey
     * @deprecated since v0.26.0
     * @example
     *
     *      R.merge({ 'name': 'fred', 'age': 10 }, { 'age': 40 });
     *      //=> { 'name': 'fred', 'age': 40 }
     *
     *      const withDefaults = R.merge({x: 0, y: 0});
     *      withDefaults({y: 2}); //=> {x: 0, y: 2}
     * @symb R.merge(a, b) = {...a, ...b}
     */

    var merge =
    /*#__PURE__*/
    _curry2(function merge(l, r) {
      return _objectAssign$1({}, l, r);
    });

    /**
     * Merges a list of objects together into one object.
     *
     * @func
     * @memberOf R
     * @since v0.10.0
     * @category List
     * @sig [{k: v}] -> {k: v}
     * @param {Array} list An array of objects
     * @return {Object} A merged object.
     * @see R.reduce
     * @example
     *
     *      R.mergeAll([{foo:1},{bar:2},{baz:3}]); //=> {foo:1,bar:2,baz:3}
     *      R.mergeAll([{foo:1},{foo:2},{bar:2}]); //=> {foo:2,bar:2}
     * @symb R.mergeAll([{ x: 1 }, { y: 2 }, { z: 3 }]) = { x: 1, y: 2, z: 3 }
     */

    var mergeAll =
    /*#__PURE__*/
    _curry1(function mergeAll(list) {
      return _objectAssign$1.apply(null, [{}].concat(list));
    });

    /**
     * Creates a new object with the own properties of the two provided objects. If
     * a key exists in both objects, the provided function is applied to the key
     * and the values associated with the key in each object, with the result being
     * used as the value associated with the key in the returned object.
     *
     * @func
     * @memberOf R
     * @since v0.19.0
     * @category Object
     * @sig ((String, a, a) -> a) -> {a} -> {a} -> {a}
     * @param {Function} fn
     * @param {Object} l
     * @param {Object} r
     * @return {Object}
     * @see R.mergeDeepWithKey, R.merge, R.mergeWith
     * @example
     *
     *      let concatValues = (k, l, r) => k == 'values' ? R.concat(l, r) : r
     *      R.mergeWithKey(concatValues,
     *                     { a: true, thing: 'foo', values: [10, 20] },
     *                     { b: true, thing: 'bar', values: [15, 35] });
     *      //=> { a: true, b: true, thing: 'bar', values: [10, 20, 15, 35] }
     * @symb R.mergeWithKey(f, { x: 1, y: 2 }, { y: 5, z: 3 }) = { x: 1, y: f('y', 2, 5), z: 3 }
     */

    var mergeWithKey =
    /*#__PURE__*/
    _curry3(function mergeWithKey(fn, l, r) {
      var result = {};
      var k;

      for (k in l) {
        if (_has(k, l)) {
          result[k] = _has(k, r) ? fn(k, l[k], r[k]) : l[k];
        }
      }

      for (k in r) {
        if (_has(k, r) && !_has(k, result)) {
          result[k] = r[k];
        }
      }

      return result;
    });

    /**
     * Creates a new object with the own properties of the two provided objects.
     * If a key exists in both objects:
     * - and both associated values are also objects then the values will be
     *   recursively merged.
     * - otherwise the provided function is applied to the key and associated values
     *   using the resulting value as the new value associated with the key.
     * If a key only exists in one object, the value will be associated with the key
     * of the resulting object.
     *
     * @func
     * @memberOf R
     * @since v0.24.0
     * @category Object
     * @sig ((String, a, a) -> a) -> {a} -> {a} -> {a}
     * @param {Function} fn
     * @param {Object} lObj
     * @param {Object} rObj
     * @return {Object}
     * @see R.mergeWithKey, R.mergeDeepWith
     * @example
     *
     *      let concatValues = (k, l, r) => k == 'values' ? R.concat(l, r) : r
     *      R.mergeDeepWithKey(concatValues,
     *                         { a: true, c: { thing: 'foo', values: [10, 20] }},
     *                         { b: true, c: { thing: 'bar', values: [15, 35] }});
     *      //=> { a: true, b: true, c: { thing: 'bar', values: [10, 20, 15, 35] }}
     */

    var mergeDeepWithKey =
    /*#__PURE__*/
    _curry3(function mergeDeepWithKey(fn, lObj, rObj) {
      return mergeWithKey(function (k, lVal, rVal) {
        if (_isObject(lVal) && _isObject(rVal)) {
          return mergeDeepWithKey(fn, lVal, rVal);
        } else {
          return fn(k, lVal, rVal);
        }
      }, lObj, rObj);
    });

    /**
     * Creates a new object with the own properties of the first object merged with
     * the own properties of the second object. If a key exists in both objects:
     * - and both values are objects, the two values will be recursively merged
     * - otherwise the value from the first object will be used.
     *
     * @func
     * @memberOf R
     * @since v0.24.0
     * @category Object
     * @sig {a} -> {a} -> {a}
     * @param {Object} lObj
     * @param {Object} rObj
     * @return {Object}
     * @see R.merge, R.mergeDeepRight, R.mergeDeepWith, R.mergeDeepWithKey
     * @example
     *
     *      R.mergeDeepLeft({ name: 'fred', age: 10, contact: { email: 'moo@example.com' }},
     *                      { age: 40, contact: { email: 'baa@example.com' }});
     *      //=> { name: 'fred', age: 10, contact: { email: 'moo@example.com' }}
     */

    var mergeDeepLeft =
    /*#__PURE__*/
    _curry2(function mergeDeepLeft(lObj, rObj) {
      return mergeDeepWithKey(function (k, lVal, rVal) {
        return lVal;
      }, lObj, rObj);
    });

    /**
     * Creates a new object with the own properties of the first object merged with
     * the own properties of the second object. If a key exists in both objects:
     * - and both values are objects, the two values will be recursively merged
     * - otherwise the value from the second object will be used.
     *
     * @func
     * @memberOf R
     * @since v0.24.0
     * @category Object
     * @sig {a} -> {a} -> {a}
     * @param {Object} lObj
     * @param {Object} rObj
     * @return {Object}
     * @see R.merge, R.mergeDeepLeft, R.mergeDeepWith, R.mergeDeepWithKey
     * @example
     *
     *      R.mergeDeepRight({ name: 'fred', age: 10, contact: { email: 'moo@example.com' }},
     *                       { age: 40, contact: { email: 'baa@example.com' }});
     *      //=> { name: 'fred', age: 40, contact: { email: 'baa@example.com' }}
     */

    var mergeDeepRight =
    /*#__PURE__*/
    _curry2(function mergeDeepRight(lObj, rObj) {
      return mergeDeepWithKey(function (k, lVal, rVal) {
        return rVal;
      }, lObj, rObj);
    });

    /**
     * Creates a new object with the own properties of the two provided objects.
     * If a key exists in both objects:
     * - and both associated values are also objects then the values will be
     *   recursively merged.
     * - otherwise the provided function is applied to associated values using the
     *   resulting value as the new value associated with the key.
     * If a key only exists in one object, the value will be associated with the key
     * of the resulting object.
     *
     * @func
     * @memberOf R
     * @since v0.24.0
     * @category Object
     * @sig ((a, a) -> a) -> {a} -> {a} -> {a}
     * @param {Function} fn
     * @param {Object} lObj
     * @param {Object} rObj
     * @return {Object}
     * @see R.mergeWith, R.mergeDeepWithKey
     * @example
     *
     *      R.mergeDeepWith(R.concat,
     *                      { a: true, c: { values: [10, 20] }},
     *                      { b: true, c: { values: [15, 35] }});
     *      //=> { a: true, b: true, c: { values: [10, 20, 15, 35] }}
     */

    var mergeDeepWith =
    /*#__PURE__*/
    _curry3(function mergeDeepWith(fn, lObj, rObj) {
      return mergeDeepWithKey(function (k, lVal, rVal) {
        return fn(lVal, rVal);
      }, lObj, rObj);
    });

    /**
     * Create a new object with the own properties of the first object merged with
     * the own properties of the second object. If a key exists in both objects,
     * the value from the first object will be used.
     *
     * @func
     * @memberOf R
     * @since v0.26.0
     * @category Object
     * @sig {k: v} -> {k: v} -> {k: v}
     * @param {Object} l
     * @param {Object} r
     * @return {Object}
     * @see R.mergeRight, R.mergeDeepLeft, R.mergeWith, R.mergeWithKey
     * @example
     *
     *      R.mergeLeft({ 'age': 40 }, { 'name': 'fred', 'age': 10 });
     *      //=> { 'name': 'fred', 'age': 40 }
     *
     *      const resetToDefault = R.mergeLeft({x: 0});
     *      resetToDefault({x: 5, y: 2}); //=> {x: 0, y: 2}
     * @symb R.mergeLeft(a, b) = {...b, ...a}
     */

    var mergeLeft =
    /*#__PURE__*/
    _curry2(function mergeLeft(l, r) {
      return _objectAssign$1({}, r, l);
    });

    /**
     * Create a new object with the own properties of the first object merged with
     * the own properties of the second object. If a key exists in both objects,
     * the value from the second object will be used.
     *
     * @func
     * @memberOf R
     * @since v0.26.0
     * @category Object
     * @sig {k: v} -> {k: v} -> {k: v}
     * @param {Object} l
     * @param {Object} r
     * @return {Object}
     * @see R.mergeLeft, R.mergeDeepRight, R.mergeWith, R.mergeWithKey
     * @example
     *
     *      R.mergeRight({ 'name': 'fred', 'age': 10 }, { 'age': 40 });
     *      //=> { 'name': 'fred', 'age': 40 }
     *
     *      const withDefaults = R.mergeRight({x: 0, y: 0});
     *      withDefaults({y: 2}); //=> {x: 0, y: 2}
     * @symb R.mergeRight(a, b) = {...a, ...b}
     */

    var mergeRight =
    /*#__PURE__*/
    _curry2(function mergeRight(l, r) {
      return _objectAssign$1({}, l, r);
    });

    /**
     * Creates a new object with the own properties of the two provided objects. If
     * a key exists in both objects, the provided function is applied to the values
     * associated with the key in each object, with the result being used as the
     * value associated with the key in the returned object.
     *
     * @func
     * @memberOf R
     * @since v0.19.0
     * @category Object
     * @sig ((a, a) -> a) -> {a} -> {a} -> {a}
     * @param {Function} fn
     * @param {Object} l
     * @param {Object} r
     * @return {Object}
     * @see R.mergeDeepWith, R.merge, R.mergeWithKey
     * @example
     *
     *      R.mergeWith(R.concat,
     *                  { a: true, values: [10, 20] },
     *                  { b: true, values: [15, 35] });
     *      //=> { a: true, b: true, values: [10, 20, 15, 35] }
     */

    var mergeWith =
    /*#__PURE__*/
    _curry3(function mergeWith(fn, l, r) {
      return mergeWithKey(function (_, _l, _r) {
        return fn(_l, _r);
      }, l, r);
    });

    /**
     * Returns the smaller of its two arguments.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Relation
     * @sig Ord a => a -> a -> a
     * @param {*} a
     * @param {*} b
     * @return {*}
     * @see R.minBy, R.max
     * @example
     *
     *      R.min(789, 123); //=> 123
     *      R.min('a', 'b'); //=> 'a'
     */

    var min =
    /*#__PURE__*/
    _curry2(function min(a, b) {
      return b < a ? b : a;
    });

    /**
     * Takes a function and two values, and returns whichever value produces the
     * smaller result when passed to the provided function.
     *
     * @func
     * @memberOf R
     * @since v0.8.0
     * @category Relation
     * @sig Ord b => (a -> b) -> a -> a -> a
     * @param {Function} f
     * @param {*} a
     * @param {*} b
     * @return {*}
     * @see R.min, R.maxBy
     * @example
     *
     *      //  square :: Number -> Number
     *      const square = n => n * n;
     *
     *      R.minBy(square, -3, 2); //=> 2
     *
     *      R.reduce(R.minBy(square), Infinity, [3, -5, 4, 1, -2]); //=> 1
     *      R.reduce(R.minBy(square), Infinity, []); //=> Infinity
     */

    var minBy =
    /*#__PURE__*/
    _curry3(function minBy(f, a, b) {
      return f(b) < f(a) ? b : a;
    });

    /**
     * Divides the first parameter by the second and returns the remainder. Note
     * that this function preserves the JavaScript-style behavior for modulo. For
     * mathematical modulo see [`mathMod`](#mathMod).
     *
     * @func
     * @memberOf R
     * @since v0.1.1
     * @category Math
     * @sig Number -> Number -> Number
     * @param {Number} a The value to the divide.
     * @param {Number} b The pseudo-modulus
     * @return {Number} The result of `b % a`.
     * @see R.mathMod
     * @example
     *
     *      R.modulo(17, 3); //=> 2
     *      // JS behavior:
     *      R.modulo(-17, 3); //=> -2
     *      R.modulo(17, -3); //=> 2
     *
     *      const isOdd = R.modulo(R.__, 2);
     *      isOdd(42); //=> 0
     *      isOdd(21); //=> 1
     */

    var modulo =
    /*#__PURE__*/
    _curry2(function modulo(a, b) {
      return a % b;
    });

    /**
     * Move an item, at index `from`, to index `to`, in a list of elements.
     * A new list will be created containing the new elements order.
     *
     * @func
     * @memberOf R
     * @since v0.27.1
     * @category List
     * @sig Number -> Number -> [a] -> [a]
     * @param {Number} from The source index
     * @param {Number} to The destination index
     * @param {Array} list The list which will serve to realise the move
     * @return {Array} The new list reordered
     * @example
     *
     *      R.move(0, 2, ['a', 'b', 'c', 'd', 'e', 'f']); //=> ['b', 'c', 'a', 'd', 'e', 'f']
     *      R.move(-1, 0, ['a', 'b', 'c', 'd', 'e', 'f']); //=> ['f', 'a', 'b', 'c', 'd', 'e'] list rotation
     */

    var move =
    /*#__PURE__*/
    _curry3(function (from, to, list) {
      var length = list.length;
      var result = list.slice();
      var positiveFrom = from < 0 ? length + from : from;
      var positiveTo = to < 0 ? length + to : to;
      var item = result.splice(positiveFrom, 1);
      return positiveFrom < 0 || positiveFrom >= list.length || positiveTo < 0 || positiveTo >= list.length ? list : [].concat(result.slice(0, positiveTo)).concat(item).concat(result.slice(positiveTo, list.length));
    });

    /**
     * Multiplies two numbers. Equivalent to `a * b` but curried.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Math
     * @sig Number -> Number -> Number
     * @param {Number} a The first value.
     * @param {Number} b The second value.
     * @return {Number} The result of `a * b`.
     * @see R.divide
     * @example
     *
     *      const double = R.multiply(2);
     *      const triple = R.multiply(3);
     *      double(3);       //=>  6
     *      triple(4);       //=> 12
     *      R.multiply(2, 5);  //=> 10
     */

    var multiply =
    /*#__PURE__*/
    _curry2(function multiply(a, b) {
      return a * b;
    });

    /**
     * Negates its argument.
     *
     * @func
     * @memberOf R
     * @since v0.9.0
     * @category Math
     * @sig Number -> Number
     * @param {Number} n
     * @return {Number}
     * @example
     *
     *      R.negate(42); //=> -42
     */

    var negate =
    /*#__PURE__*/
    _curry1(function negate(n) {
      return -n;
    });

    /**
     * Returns `true` if no elements of the list match the predicate, `false`
     * otherwise.
     *
     * Dispatches to the `all` method of the second argument, if present.
     *
     * Acts as a transducer if a transformer is given in list position.
     *
     * @func
     * @memberOf R
     * @since v0.12.0
     * @category List
     * @sig (a -> Boolean) -> [a] -> Boolean
     * @param {Function} fn The predicate function.
     * @param {Array} list The array to consider.
     * @return {Boolean} `true` if the predicate is not satisfied by every element, `false` otherwise.
     * @see R.all, R.any
     * @example
     *
     *      const isEven = n => n % 2 === 0;
     *      const isOdd = n => n % 2 === 1;
     *
     *      R.none(isEven, [1, 3, 5, 7, 9, 11]); //=> true
     *      R.none(isOdd, [1, 3, 5, 7, 8, 11]); //=> false
     */

    var none =
    /*#__PURE__*/
    _curry2(function none(fn, input) {
      return all(_complement(fn), input);
    });

    /**
     * Returns a function which returns its nth argument.
     *
     * @func
     * @memberOf R
     * @since v0.9.0
     * @category Function
     * @sig Number -> *... -> *
     * @param {Number} n
     * @return {Function}
     * @example
     *
     *      R.nthArg(1)('a', 'b', 'c'); //=> 'b'
     *      R.nthArg(-1)('a', 'b', 'c'); //=> 'c'
     * @symb R.nthArg(-1)(a, b, c) = c
     * @symb R.nthArg(0)(a, b, c) = a
     * @symb R.nthArg(1)(a, b, c) = b
     */

    var nthArg =
    /*#__PURE__*/
    _curry1(function nthArg(n) {
      var arity = n < 0 ? 1 : n + 1;
      return curryN(arity, function () {
        return nth(n, arguments);
      });
    });

    /**
     * `o` is a curried composition function that returns a unary function.
     * Like [`compose`](#compose), `o` performs right-to-left function composition.
     * Unlike [`compose`](#compose), the rightmost function passed to `o` will be
     * invoked with only one argument. Also, unlike [`compose`](#compose), `o` is
     * limited to accepting only 2 unary functions. The name o was chosen because
     * of its similarity to the mathematical composition operator ∘.
     *
     * @func
     * @memberOf R
     * @since v0.24.0
     * @category Function
     * @sig (b -> c) -> (a -> b) -> a -> c
     * @param {Function} f
     * @param {Function} g
     * @return {Function}
     * @see R.compose, R.pipe
     * @example
     *
     *      const classyGreeting = name => "The name's " + name.last + ", " + name.first + " " + name.last
     *      const yellGreeting = R.o(R.toUpper, classyGreeting);
     *      yellGreeting({first: 'James', last: 'Bond'}); //=> "THE NAME'S BOND, JAMES BOND"
     *
     *      R.o(R.multiply(10), R.add(10))(-4) //=> 60
     *
     * @symb R.o(f, g, x) = f(g(x))
     */

    var o =
    /*#__PURE__*/
    _curry3(function o(f, g, x) {
      return f(g(x));
    });

    function _of(x) {
      return [x];
    }

    /**
     * Returns a singleton array containing the value provided.
     *
     * Note this `of` is different from the ES6 `of`; See
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/of
     *
     * @func
     * @memberOf R
     * @since v0.3.0
     * @category Function
     * @sig a -> [a]
     * @param {*} x any value
     * @return {Array} An array wrapping `x`.
     * @example
     *
     *      R.of(null); //=> [null]
     *      R.of([42]); //=> [[42]]
     */

    var of =
    /*#__PURE__*/
    _curry1(_of);

    /**
     * Returns a partial copy of an object omitting the keys specified.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Object
     * @sig [String] -> {String: *} -> {String: *}
     * @param {Array} names an array of String property names to omit from the new object
     * @param {Object} obj The object to copy from
     * @return {Object} A new object with properties from `names` not on it.
     * @see R.pick
     * @example
     *
     *      R.omit(['a', 'd'], {a: 1, b: 2, c: 3, d: 4}); //=> {b: 2, c: 3}
     */

    var omit =
    /*#__PURE__*/
    _curry2(function omit(names, obj) {
      var result = {};
      var index = {};
      var idx = 0;
      var len = names.length;

      while (idx < len) {
        index[names[idx]] = 1;
        idx += 1;
      }

      for (var prop in obj) {
        if (!index.hasOwnProperty(prop)) {
          result[prop] = obj[prop];
        }
      }

      return result;
    });

    /**
     * Accepts a function `fn` and returns a function that guards invocation of
     * `fn` such that `fn` can only ever be called once, no matter how many times
     * the returned function is invoked. The first value calculated is returned in
     * subsequent invocations.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Function
     * @sig (a... -> b) -> (a... -> b)
     * @param {Function} fn The function to wrap in a call-only-once wrapper.
     * @return {Function} The wrapped function.
     * @example
     *
     *      const addOneOnce = R.once(x => x + 1);
     *      addOneOnce(10); //=> 11
     *      addOneOnce(addOneOnce(50)); //=> 11
     */

    var once =
    /*#__PURE__*/
    _curry1(function once(fn) {
      var called = false;
      var result;
      return _arity(fn.length, function () {
        if (called) {
          return result;
        }

        called = true;
        result = fn.apply(this, arguments);
        return result;
      });
    });

    function _assertPromise(name, p) {
      if (p == null || !_isFunction(p.then)) {
        throw new TypeError('`' + name + '` expected a Promise, received ' + _toString(p, []));
      }
    }

    /**
     * Returns the result of applying the onFailure function to the value inside
     * a failed promise. This is useful for handling rejected promises
     * inside function compositions.
     *
     * @func
     * @memberOf R
     * @since v0.26.0
     * @category Function
     * @sig (e -> b) -> (Promise e a) -> (Promise e b)
     * @sig (e -> (Promise f b)) -> (Promise e a) -> (Promise f b)
     * @param {Function} onFailure The function to apply. Can return a value or a promise of a value.
     * @param {Promise} p
     * @return {Promise} The result of calling `p.then(null, onFailure)`
     * @see R.then
     * @example
     *
     *      var failedFetch = (id) => Promise.reject('bad ID');
     *      var useDefault = () => ({ firstName: 'Bob', lastName: 'Loblaw' })
     *
     *      //recoverFromFailure :: String -> Promise ({firstName, lastName})
     *      var recoverFromFailure = R.pipe(
     *        failedFetch,
     *        R.otherwise(useDefault),
     *        R.then(R.pick(['firstName', 'lastName'])),
     *      );
     *      recoverFromFailure(12345).then(console.log)
     */

    var otherwise =
    /*#__PURE__*/
    _curry2(function otherwise(f, p) {
      _assertPromise('otherwise', p);

      return p.then(null, f);
    });

    // transforms the held value with the provided function.

    var Identity = function (x) {
      return {
        value: x,
        map: function (f) {
          return Identity(f(x));
        }
      };
    };
    /**
     * Returns the result of "setting" the portion of the given data structure
     * focused by the given lens to the result of applying the given function to
     * the focused value.
     *
     * @func
     * @memberOf R
     * @since v0.16.0
     * @category Object
     * @typedefn Lens s a = Functor f => (a -> f a) -> s -> f s
     * @sig Lens s a -> (a -> a) -> s -> s
     * @param {Lens} lens
     * @param {*} v
     * @param {*} x
     * @return {*}
     * @see R.prop, R.lensIndex, R.lensProp
     * @example
     *
     *      const headLens = R.lensIndex(0);
     *
     *      R.over(headLens, R.toUpper, ['foo', 'bar', 'baz']); //=> ['FOO', 'bar', 'baz']
     */


    var over =
    /*#__PURE__*/
    _curry3(function over(lens, f, x) {
      // The value returned by the getter function is first transformed with `f`,
      // then set as the value of an `Identity`. This is then mapped over with the
      // setter function of the lens.
      return lens(function (y) {
        return Identity(f(y));
      })(x).value;
    });

    /**
     * Takes two arguments, `fst` and `snd`, and returns `[fst, snd]`.
     *
     * @func
     * @memberOf R
     * @since v0.18.0
     * @category List
     * @sig a -> b -> (a,b)
     * @param {*} fst
     * @param {*} snd
     * @return {Array}
     * @see R.objOf, R.of
     * @example
     *
     *      R.pair('foo', 'bar'); //=> ['foo', 'bar']
     */

    var pair =
    /*#__PURE__*/
    _curry2(function pair(fst, snd) {
      return [fst, snd];
    });

    function _createPartialApplicator(concat) {
      return _curry2(function (fn, args) {
        return _arity(Math.max(0, fn.length - args.length), function () {
          return fn.apply(this, concat(args, arguments));
        });
      });
    }

    /**
     * Takes a function `f` and a list of arguments, and returns a function `g`.
     * When applied, `g` returns the result of applying `f` to the arguments
     * provided initially followed by the arguments provided to `g`.
     *
     * @func
     * @memberOf R
     * @since v0.10.0
     * @category Function
     * @sig ((a, b, c, ..., n) -> x) -> [a, b, c, ...] -> ((d, e, f, ..., n) -> x)
     * @param {Function} f
     * @param {Array} args
     * @return {Function}
     * @see R.partialRight, R.curry
     * @example
     *
     *      const multiply2 = (a, b) => a * b;
     *      const double = R.partial(multiply2, [2]);
     *      double(2); //=> 4
     *
     *      const greet = (salutation, title, firstName, lastName) =>
     *        salutation + ', ' + title + ' ' + firstName + ' ' + lastName + '!';
     *
     *      const sayHello = R.partial(greet, ['Hello']);
     *      const sayHelloToMs = R.partial(sayHello, ['Ms.']);
     *      sayHelloToMs('Jane', 'Jones'); //=> 'Hello, Ms. Jane Jones!'
     * @symb R.partial(f, [a, b])(c, d) = f(a, b, c, d)
     */

    var partial =
    /*#__PURE__*/
    _createPartialApplicator(_concat);

    /**
     * Takes a function `f` and a list of arguments, and returns a function `g`.
     * When applied, `g` returns the result of applying `f` to the arguments
     * provided to `g` followed by the arguments provided initially.
     *
     * @func
     * @memberOf R
     * @since v0.10.0
     * @category Function
     * @sig ((a, b, c, ..., n) -> x) -> [d, e, f, ..., n] -> ((a, b, c, ...) -> x)
     * @param {Function} f
     * @param {Array} args
     * @return {Function}
     * @see R.partial
     * @example
     *
     *      const greet = (salutation, title, firstName, lastName) =>
     *        salutation + ', ' + title + ' ' + firstName + ' ' + lastName + '!';
     *
     *      const greetMsJaneJones = R.partialRight(greet, ['Ms.', 'Jane', 'Jones']);
     *
     *      greetMsJaneJones('Hello'); //=> 'Hello, Ms. Jane Jones!'
     * @symb R.partialRight(f, [a, b])(c, d) = f(c, d, a, b)
     */

    var partialRight =
    /*#__PURE__*/
    _createPartialApplicator(
    /*#__PURE__*/
    flip(_concat));

    /**
     * Takes a predicate and a list or other `Filterable` object and returns the
     * pair of filterable objects of the same type of elements which do and do not
     * satisfy, the predicate, respectively. Filterable objects include plain objects or any object
     * that has a filter method such as `Array`.
     *
     * @func
     * @memberOf R
     * @since v0.1.4
     * @category List
     * @sig Filterable f => (a -> Boolean) -> f a -> [f a, f a]
     * @param {Function} pred A predicate to determine which side the element belongs to.
     * @param {Array} filterable the list (or other filterable) to partition.
     * @return {Array} An array, containing first the subset of elements that satisfy the
     *         predicate, and second the subset of elements that do not satisfy.
     * @see R.filter, R.reject
     * @example
     *
     *      R.partition(R.includes('s'), ['sss', 'ttt', 'foo', 'bars']);
     *      // => [ [ 'sss', 'bars' ],  [ 'ttt', 'foo' ] ]
     *
     *      R.partition(R.includes('s'), { a: 'sss', b: 'ttt', foo: 'bars' });
     *      // => [ { a: 'sss', foo: 'bars' }, { b: 'ttt' }  ]
     */

    var partition =
    /*#__PURE__*/
    juxt([filter, reject]);

    /**
     * Determines whether a nested path on an object has a specific value, in
     * [`R.equals`](#equals) terms. Most likely used to filter a list.
     *
     * @func
     * @memberOf R
     * @since v0.7.0
     * @category Relation
     * @typedefn Idx = String | Int
     * @sig [Idx] -> a -> {a} -> Boolean
     * @param {Array} path The path of the nested property to use
     * @param {*} val The value to compare the nested property with
     * @param {Object} obj The object to check the nested property in
     * @return {Boolean} `true` if the value equals the nested object property,
     *         `false` otherwise.
     * @example
     *
     *      const user1 = { address: { zipCode: 90210 } };
     *      const user2 = { address: { zipCode: 55555 } };
     *      const user3 = { name: 'Bob' };
     *      const users = [ user1, user2, user3 ];
     *      const isFamous = R.pathEq(['address', 'zipCode'], 90210);
     *      R.filter(isFamous, users); //=> [ user1 ]
     */

    var pathEq =
    /*#__PURE__*/
    _curry3(function pathEq(_path, val, obj) {
      return equals(path(_path, obj), val);
    });

    /**
     * If the given, non-null object has a value at the given path, returns the
     * value at that path. Otherwise returns the provided default value.
     *
     * @func
     * @memberOf R
     * @since v0.18.0
     * @category Object
     * @typedefn Idx = String | Int
     * @sig a -> [Idx] -> {a} -> a
     * @param {*} d The default value.
     * @param {Array} p The path to use.
     * @param {Object} obj The object to retrieve the nested property from.
     * @return {*} The data at `path` of the supplied object or the default value.
     * @example
     *
     *      R.pathOr('N/A', ['a', 'b'], {a: {b: 2}}); //=> 2
     *      R.pathOr('N/A', ['a', 'b'], {c: {b: 2}}); //=> "N/A"
     */

    var pathOr =
    /*#__PURE__*/
    _curry3(function pathOr(d, p, obj) {
      return defaultTo(d, path(p, obj));
    });

    /**
     * Returns `true` if the specified object property at given path satisfies the
     * given predicate; `false` otherwise.
     *
     * @func
     * @memberOf R
     * @since v0.19.0
     * @category Logic
     * @typedefn Idx = String | Int
     * @sig (a -> Boolean) -> [Idx] -> {a} -> Boolean
     * @param {Function} pred
     * @param {Array} propPath
     * @param {*} obj
     * @return {Boolean}
     * @see R.propSatisfies, R.path
     * @example
     *
     *      R.pathSatisfies(y => y > 0, ['x', 'y'], {x: {y: 2}}); //=> true
     *      R.pathSatisfies(R.is(Object), [], {x: {y: 2}}); //=> true
     */

    var pathSatisfies =
    /*#__PURE__*/
    _curry3(function pathSatisfies(pred, propPath, obj) {
      return pred(path(propPath, obj));
    });

    /**
     * Returns a partial copy of an object containing only the keys specified. If
     * the key does not exist, the property is ignored.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Object
     * @sig [k] -> {k: v} -> {k: v}
     * @param {Array} names an array of String property names to copy onto a new object
     * @param {Object} obj The object to copy from
     * @return {Object} A new object with only properties from `names` on it.
     * @see R.omit, R.props
     * @example
     *
     *      R.pick(['a', 'd'], {a: 1, b: 2, c: 3, d: 4}); //=> {a: 1, d: 4}
     *      R.pick(['a', 'e', 'f'], {a: 1, b: 2, c: 3, d: 4}); //=> {a: 1}
     */

    var pick =
    /*#__PURE__*/
    _curry2(function pick(names, obj) {
      var result = {};
      var idx = 0;

      while (idx < names.length) {
        if (names[idx] in obj) {
          result[names[idx]] = obj[names[idx]];
        }

        idx += 1;
      }

      return result;
    });

    /**
     * Similar to `pick` except that this one includes a `key: undefined` pair for
     * properties that don't exist.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Object
     * @sig [k] -> {k: v} -> {k: v}
     * @param {Array} names an array of String property names to copy onto a new object
     * @param {Object} obj The object to copy from
     * @return {Object} A new object with only properties from `names` on it.
     * @see R.pick
     * @example
     *
     *      R.pickAll(['a', 'd'], {a: 1, b: 2, c: 3, d: 4}); //=> {a: 1, d: 4}
     *      R.pickAll(['a', 'e', 'f'], {a: 1, b: 2, c: 3, d: 4}); //=> {a: 1, e: undefined, f: undefined}
     */

    var pickAll =
    /*#__PURE__*/
    _curry2(function pickAll(names, obj) {
      var result = {};
      var idx = 0;
      var len = names.length;

      while (idx < len) {
        var name = names[idx];
        result[name] = obj[name];
        idx += 1;
      }

      return result;
    });

    /**
     * Returns a partial copy of an object containing only the keys that satisfy
     * the supplied predicate.
     *
     * @func
     * @memberOf R
     * @since v0.8.0
     * @category Object
     * @sig ((v, k) -> Boolean) -> {k: v} -> {k: v}
     * @param {Function} pred A predicate to determine whether or not a key
     *        should be included on the output object.
     * @param {Object} obj The object to copy from
     * @return {Object} A new object with only properties that satisfy `pred`
     *         on it.
     * @see R.pick, R.filter
     * @example
     *
     *      const isUpperCase = (val, key) => key.toUpperCase() === key;
     *      R.pickBy(isUpperCase, {a: 1, b: 2, A: 3, B: 4}); //=> {A: 3, B: 4}
     */

    var pickBy =
    /*#__PURE__*/
    _curry2(function pickBy(test, obj) {
      var result = {};

      for (var prop in obj) {
        if (test(obj[prop], prop, obj)) {
          result[prop] = obj[prop];
        }
      }

      return result;
    });

    /**
     * Returns the left-to-right Kleisli composition of the provided functions,
     * each of which must return a value of a type supported by [`chain`](#chain).
     *
     * `R.pipeK(f, g, h)` is equivalent to `R.pipe(f, R.chain(g), R.chain(h))`.
     *
     * @func
     * @memberOf R
     * @since v0.16.0
     * @category Function
     * @sig Chain m => ((a -> m b), (b -> m c), ..., (y -> m z)) -> (a -> m z)
     * @param {...Function}
     * @return {Function}
     * @see R.composeK
     * @deprecated since v0.26.0
     * @example
     *
     *      //  parseJson :: String -> Maybe *
     *      //  get :: String -> Object -> Maybe *
     *
     *      //  getStateCode :: Maybe String -> Maybe String
     *      const getStateCode = R.pipeK(
     *        parseJson,
     *        get('user'),
     *        get('address'),
     *        get('state'),
     *        R.compose(Maybe.of, R.toUpper)
     *      );
     *
     *      getStateCode('{"user":{"address":{"state":"ny"}}}');
     *      //=> Just('NY')
     *      getStateCode('[Invalid JSON]');
     *      //=> Nothing()
     * @symb R.pipeK(f, g, h)(a) = R.chain(h, R.chain(g, f(a)))
     */

    function pipeK() {
      if (arguments.length === 0) {
        throw new Error('pipeK requires at least one argument');
      }

      return composeK.apply(this, reverse(arguments));
    }

    /**
     * Returns a new list with the given element at the front, followed by the
     * contents of the list.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig a -> [a] -> [a]
     * @param {*} el The item to add to the head of the output list.
     * @param {Array} list The array to add to the tail of the output list.
     * @return {Array} A new array.
     * @see R.append
     * @example
     *
     *      R.prepend('fee', ['fi', 'fo', 'fum']); //=> ['fee', 'fi', 'fo', 'fum']
     */

    var prepend =
    /*#__PURE__*/
    _curry2(function prepend(el, list) {
      return _concat([el], list);
    });

    /**
     * Multiplies together all the elements of a list.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Math
     * @sig [Number] -> Number
     * @param {Array} list An array of numbers
     * @return {Number} The product of all the numbers in the list.
     * @see R.reduce
     * @example
     *
     *      R.product([2,4,6,8,100,1]); //=> 38400
     */

    var product =
    /*#__PURE__*/
    reduce(multiply, 1);

    /**
     * Accepts a function `fn` and a list of transformer functions and returns a
     * new curried function. When the new function is invoked, it calls the
     * function `fn` with parameters consisting of the result of calling each
     * supplied handler on successive arguments to the new function.
     *
     * If more arguments are passed to the returned function than transformer
     * functions, those arguments are passed directly to `fn` as additional
     * parameters. If you expect additional arguments that don't need to be
     * transformed, although you can ignore them, it's best to pass an identity
     * function so that the new function reports the correct arity.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Function
     * @sig ((x1, x2, ...) -> z) -> [(a -> x1), (b -> x2), ...] -> (a -> b -> ... -> z)
     * @param {Function} fn The function to wrap.
     * @param {Array} transformers A list of transformer functions
     * @return {Function} The wrapped function.
     * @see R.converge
     * @example
     *
     *      R.useWith(Math.pow, [R.identity, R.identity])(3, 4); //=> 81
     *      R.useWith(Math.pow, [R.identity, R.identity])(3)(4); //=> 81
     *      R.useWith(Math.pow, [R.dec, R.inc])(3, 4); //=> 32
     *      R.useWith(Math.pow, [R.dec, R.inc])(3)(4); //=> 32
     * @symb R.useWith(f, [g, h])(a, b) = f(g(a), h(b))
     */

    var useWith =
    /*#__PURE__*/
    _curry2(function useWith(fn, transformers) {
      return curryN(transformers.length, function () {
        var args = [];
        var idx = 0;

        while (idx < transformers.length) {
          args.push(transformers[idx].call(this, arguments[idx]));
          idx += 1;
        }

        return fn.apply(this, args.concat(Array.prototype.slice.call(arguments, transformers.length)));
      });
    });

    /**
     * Reasonable analog to SQL `select` statement.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Object
     * @category Relation
     * @sig [k] -> [{k: v}] -> [{k: v}]
     * @param {Array} props The property names to project
     * @param {Array} objs The objects to query
     * @return {Array} An array of objects with just the `props` properties.
     * @example
     *
     *      const abby = {name: 'Abby', age: 7, hair: 'blond', grade: 2};
     *      const fred = {name: 'Fred', age: 12, hair: 'brown', grade: 7};
     *      const kids = [abby, fred];
     *      R.project(['name', 'grade'], kids); //=> [{name: 'Abby', grade: 2}, {name: 'Fred', grade: 7}]
     */

    var project =
    /*#__PURE__*/
    useWith(_map, [pickAll, identity]); // passing `identity` gives correct arity

    /**
     * Returns `true` if the specified object property is equal, in
     * [`R.equals`](#equals) terms, to the given value; `false` otherwise.
     * You can test multiple properties with [`R.whereEq`](#whereEq).
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Relation
     * @sig String -> a -> Object -> Boolean
     * @param {String} name
     * @param {*} val
     * @param {*} obj
     * @return {Boolean}
     * @see R.whereEq, R.propSatisfies, R.equals
     * @example
     *
     *      const abby = {name: 'Abby', age: 7, hair: 'blond'};
     *      const fred = {name: 'Fred', age: 12, hair: 'brown'};
     *      const rusty = {name: 'Rusty', age: 10, hair: 'brown'};
     *      const alois = {name: 'Alois', age: 15, disposition: 'surly'};
     *      const kids = [abby, fred, rusty, alois];
     *      const hasBrownHair = R.propEq('hair', 'brown');
     *      R.filter(hasBrownHair, kids); //=> [fred, rusty]
     */

    var propEq =
    /*#__PURE__*/
    _curry3(function propEq(name, val, obj) {
      return equals(val, obj[name]);
    });

    /**
     * Returns `true` if the specified object property is of the given type;
     * `false` otherwise.
     *
     * @func
     * @memberOf R
     * @since v0.16.0
     * @category Type
     * @sig Type -> String -> Object -> Boolean
     * @param {Function} type
     * @param {String} name
     * @param {*} obj
     * @return {Boolean}
     * @see R.is, R.propSatisfies
     * @example
     *
     *      R.propIs(Number, 'x', {x: 1, y: 2});  //=> true
     *      R.propIs(Number, 'x', {x: 'foo'});    //=> false
     *      R.propIs(Number, 'x', {});            //=> false
     */

    var propIs =
    /*#__PURE__*/
    _curry3(function propIs(type, name, obj) {
      return is(type, obj[name]);
    });

    /**
     * If the given, non-null object has an own property with the specified name,
     * returns the value of that property. Otherwise returns the provided default
     * value.
     *
     * @func
     * @memberOf R
     * @since v0.6.0
     * @category Object
     * @sig a -> String -> Object -> a
     * @param {*} val The default value.
     * @param {String} p The name of the property to return.
     * @param {Object} obj The object to query.
     * @return {*} The value of given property of the supplied object or the default value.
     * @example
     *
     *      const alice = {
     *        name: 'ALICE',
     *        age: 101
     *      };
     *      const favorite = R.prop('favoriteLibrary');
     *      const favoriteWithDefault = R.propOr('Ramda', 'favoriteLibrary');
     *
     *      favorite(alice);  //=> undefined
     *      favoriteWithDefault(alice);  //=> 'Ramda'
     */

    var propOr =
    /*#__PURE__*/
    _curry3(function propOr(val, p, obj) {
      return pathOr(val, [p], obj);
    });

    /**
     * Returns `true` if the specified object property satisfies the given
     * predicate; `false` otherwise. You can test multiple properties with
     * [`R.where`](#where).
     *
     * @func
     * @memberOf R
     * @since v0.16.0
     * @category Logic
     * @sig (a -> Boolean) -> String -> {String: a} -> Boolean
     * @param {Function} pred
     * @param {String} name
     * @param {*} obj
     * @return {Boolean}
     * @see R.where, R.propEq, R.propIs
     * @example
     *
     *      R.propSatisfies(x => x > 0, 'x', {x: 1, y: 2}); //=> true
     */

    var propSatisfies =
    /*#__PURE__*/
    _curry3(function propSatisfies(pred, name, obj) {
      return pred(obj[name]);
    });

    /**
     * Acts as multiple `prop`: array of keys in, array of values out. Preserves
     * order.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Object
     * @sig [k] -> {k: v} -> [v]
     * @param {Array} ps The property names to fetch
     * @param {Object} obj The object to query
     * @return {Array} The corresponding values or partially applied function.
     * @example
     *
     *      R.props(['x', 'y'], {x: 1, y: 2}); //=> [1, 2]
     *      R.props(['c', 'a', 'b'], {b: 2, a: 1}); //=> [undefined, 1, 2]
     *
     *      const fullName = R.compose(R.join(' '), R.props(['first', 'last']));
     *      fullName({last: 'Bullet-Tooth', age: 33, first: 'Tony'}); //=> 'Tony Bullet-Tooth'
     */

    var props =
    /*#__PURE__*/
    _curry2(function props(ps, obj) {
      return ps.map(function (p) {
        return path([p], obj);
      });
    });

    /**
     * Returns a list of numbers from `from` (inclusive) to `to` (exclusive).
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig Number -> Number -> [Number]
     * @param {Number} from The first number in the list.
     * @param {Number} to One more than the last number in the list.
     * @return {Array} The list of numbers in the set `[a, b)`.
     * @example
     *
     *      R.range(1, 5);    //=> [1, 2, 3, 4]
     *      R.range(50, 53);  //=> [50, 51, 52]
     */

    var range =
    /*#__PURE__*/
    _curry2(function range(from, to) {
      if (!(_isNumber(from) && _isNumber(to))) {
        throw new TypeError('Both arguments to range must be numbers');
      }

      var result = [];
      var n = from;

      while (n < to) {
        result.push(n);
        n += 1;
      }

      return result;
    });

    /**
     * Returns a single item by iterating through the list, successively calling
     * the iterator function and passing it an accumulator value and the current
     * value from the array, and then passing the result to the next call.
     *
     * Similar to [`reduce`](#reduce), except moves through the input list from the
     * right to the left.
     *
     * The iterator function receives two values: *(value, acc)*, while the arguments'
     * order of `reduce`'s iterator function is *(acc, value)*.
     *
     * Note: `R.reduceRight` does not skip deleted or unassigned indices (sparse
     * arrays), unlike the native `Array.prototype.reduceRight` method. For more details
     * on this behavior, see:
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduceRight#Description
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig ((a, b) -> b) -> b -> [a] -> b
     * @param {Function} fn The iterator function. Receives two values, the current element from the array
     *        and the accumulator.
     * @param {*} acc The accumulator value.
     * @param {Array} list The list to iterate over.
     * @return {*} The final, accumulated value.
     * @see R.reduce, R.addIndex
     * @example
     *
     *      R.reduceRight(R.subtract, 0, [1, 2, 3, 4]) // => (1 - (2 - (3 - (4 - 0)))) = -2
     *      //    -               -2
     *      //   / \              / \
     *      //  1   -            1   3
     *      //     / \              / \
     *      //    2   -     ==>    2  -1
     *      //       / \              / \
     *      //      3   -            3   4
     *      //         / \              / \
     *      //        4   0            4   0
     *
     * @symb R.reduceRight(f, a, [b, c, d]) = f(b, f(c, f(d, a)))
     */

    var reduceRight =
    /*#__PURE__*/
    _curry3(function reduceRight(fn, acc, list) {
      var idx = list.length - 1;

      while (idx >= 0) {
        acc = fn(list[idx], acc);
        idx -= 1;
      }

      return acc;
    });

    /**
     * Like [`reduce`](#reduce), `reduceWhile` returns a single item by iterating
     * through the list, successively calling the iterator function. `reduceWhile`
     * also takes a predicate that is evaluated before each step. If the predicate
     * returns `false`, it "short-circuits" the iteration and returns the current
     * value of the accumulator.
     *
     * @func
     * @memberOf R
     * @since v0.22.0
     * @category List
     * @sig ((a, b) -> Boolean) -> ((a, b) -> a) -> a -> [b] -> a
     * @param {Function} pred The predicate. It is passed the accumulator and the
     *        current element.
     * @param {Function} fn The iterator function. Receives two values, the
     *        accumulator and the current element.
     * @param {*} a The accumulator value.
     * @param {Array} list The list to iterate over.
     * @return {*} The final, accumulated value.
     * @see R.reduce, R.reduced
     * @example
     *
     *      const isOdd = (acc, x) => x % 2 === 1;
     *      const xs = [1, 3, 5, 60, 777, 800];
     *      R.reduceWhile(isOdd, R.add, 0, xs); //=> 9
     *
     *      const ys = [2, 4, 6]
     *      R.reduceWhile(isOdd, R.add, 111, ys); //=> 111
     */

    var reduceWhile =
    /*#__PURE__*/
    _curryN(4, [], function _reduceWhile(pred, fn, a, list) {
      return _reduce(function (acc, x) {
        return pred(acc, x) ? fn(acc, x) : _reduced(acc);
      }, a, list);
    });

    /**
     * Returns a value wrapped to indicate that it is the final value of the reduce
     * and transduce functions. The returned value should be considered a black
     * box: the internal structure is not guaranteed to be stable.
     *
     * Note: this optimization is only available to the below functions:
     * - [`reduce`](#reduce)
     * - [`reduceWhile`](#reduceWhile)
     * - [`transduce`](#transduce)
     *
     * @func
     * @memberOf R
     * @since v0.15.0
     * @category List
     * @sig a -> *
     * @param {*} x The final value of the reduce.
     * @return {*} The wrapped value.
     * @see R.reduce, R.reduceWhile, R.transduce
     * @example
     *
     *     R.reduce(
     *       (acc, item) => item > 3 ? R.reduced(acc) : acc.concat(item),
     *       [],
     *       [1, 2, 3, 4, 5]) // [1, 2, 3]
     */

    var reduced =
    /*#__PURE__*/
    _curry1(_reduced);

    /**
     * Calls an input function `n` times, returning an array containing the results
     * of those function calls.
     *
     * `fn` is passed one argument: The current value of `n`, which begins at `0`
     * and is gradually incremented to `n - 1`.
     *
     * @func
     * @memberOf R
     * @since v0.2.3
     * @category List
     * @sig (Number -> a) -> Number -> [a]
     * @param {Function} fn The function to invoke. Passed one argument, the current value of `n`.
     * @param {Number} n A value between `0` and `n - 1`. Increments after each function call.
     * @return {Array} An array containing the return values of all calls to `fn`.
     * @see R.repeat
     * @example
     *
     *      R.times(R.identity, 5); //=> [0, 1, 2, 3, 4]
     * @symb R.times(f, 0) = []
     * @symb R.times(f, 1) = [f(0)]
     * @symb R.times(f, 2) = [f(0), f(1)]
     */

    var times =
    /*#__PURE__*/
    _curry2(function times(fn, n) {
      var len = Number(n);
      var idx = 0;
      var list;

      if (len < 0 || isNaN(len)) {
        throw new RangeError('n must be a non-negative number');
      }

      list = new Array(len);

      while (idx < len) {
        list[idx] = fn(idx);
        idx += 1;
      }

      return list;
    });

    /**
     * Returns a fixed list of size `n` containing a specified identical value.
     *
     * @func
     * @memberOf R
     * @since v0.1.1
     * @category List
     * @sig a -> n -> [a]
     * @param {*} value The value to repeat.
     * @param {Number} n The desired size of the output list.
     * @return {Array} A new array containing `n` `value`s.
     * @see R.times
     * @example
     *
     *      R.repeat('hi', 5); //=> ['hi', 'hi', 'hi', 'hi', 'hi']
     *
     *      const obj = {};
     *      const repeatedObjs = R.repeat(obj, 5); //=> [{}, {}, {}, {}, {}]
     *      repeatedObjs[0] === repeatedObjs[1]; //=> true
     * @symb R.repeat(a, 0) = []
     * @symb R.repeat(a, 1) = [a]
     * @symb R.repeat(a, 2) = [a, a]
     */

    var repeat =
    /*#__PURE__*/
    _curry2(function repeat(value, n) {
      return times(always(value), n);
    });

    /**
     * Replace a substring or regex match in a string with a replacement.
     *
     * The first two parameters correspond to the parameters of the
     * `String.prototype.replace()` function, so the second parameter can also be a
     * function.
     *
     * @func
     * @memberOf R
     * @since v0.7.0
     * @category String
     * @sig RegExp|String -> String -> String -> String
     * @param {RegExp|String} pattern A regular expression or a substring to match.
     * @param {String} replacement The string to replace the matches with.
     * @param {String} str The String to do the search and replacement in.
     * @return {String} The result.
     * @example
     *
     *      R.replace('foo', 'bar', 'foo foo foo'); //=> 'bar foo foo'
     *      R.replace(/foo/, 'bar', 'foo foo foo'); //=> 'bar foo foo'
     *
     *      // Use the "g" (global) flag to replace all occurrences:
     *      R.replace(/foo/g, 'bar', 'foo foo foo'); //=> 'bar bar bar'
     */

    var replace =
    /*#__PURE__*/
    _curry3(function replace(regex, replacement, str) {
      return str.replace(regex, replacement);
    });

    /**
     * Scan is similar to [`reduce`](#reduce), but returns a list of successively
     * reduced values from the left
     *
     * @func
     * @memberOf R
     * @since v0.10.0
     * @category List
     * @sig ((a, b) -> a) -> a -> [b] -> [a]
     * @param {Function} fn The iterator function. Receives two values, the accumulator and the
     *        current element from the array
     * @param {*} acc The accumulator value.
     * @param {Array} list The list to iterate over.
     * @return {Array} A list of all intermediately reduced values.
     * @see R.reduce, R.mapAccum
     * @example
     *
     *      const numbers = [1, 2, 3, 4];
     *      const factorials = R.scan(R.multiply, 1, numbers); //=> [1, 1, 2, 6, 24]
     * @symb R.scan(f, a, [b, c]) = [a, f(a, b), f(f(a, b), c)]
     */

    var scan =
    /*#__PURE__*/
    _curry3(function scan(fn, acc, list) {
      var idx = 0;
      var len = list.length;
      var result = [acc];

      while (idx < len) {
        acc = fn(acc, list[idx]);
        result[idx + 1] = acc;
        idx += 1;
      }

      return result;
    });

    /**
     * Transforms a [Traversable](https://github.com/fantasyland/fantasy-land#traversable)
     * of [Applicative](https://github.com/fantasyland/fantasy-land#applicative) into an
     * Applicative of Traversable.
     *
     * Dispatches to the `sequence` method of the second argument, if present.
     *
     * @func
     * @memberOf R
     * @since v0.19.0
     * @category List
     * @sig (Applicative f, Traversable t) => (a -> f a) -> t (f a) -> f (t a)
     * @param {Function} of
     * @param {*} traversable
     * @return {*}
     * @see R.traverse
     * @example
     *
     *      R.sequence(Maybe.of, [Just(1), Just(2), Just(3)]);   //=> Just([1, 2, 3])
     *      R.sequence(Maybe.of, [Just(1), Just(2), Nothing()]); //=> Nothing()
     *
     *      R.sequence(R.of, Just([1, 2, 3])); //=> [Just(1), Just(2), Just(3)]
     *      R.sequence(R.of, Nothing());       //=> [Nothing()]
     */

    var sequence =
    /*#__PURE__*/
    _curry2(function sequence(of, traversable) {
      return typeof traversable.sequence === 'function' ? traversable.sequence(of) : reduceRight(function (x, acc) {
        return ap(map(prepend, x), acc);
      }, of([]), traversable);
    });

    /**
     * Returns the result of "setting" the portion of the given data structure
     * focused by the given lens to the given value.
     *
     * @func
     * @memberOf R
     * @since v0.16.0
     * @category Object
     * @typedefn Lens s a = Functor f => (a -> f a) -> s -> f s
     * @sig Lens s a -> a -> s -> s
     * @param {Lens} lens
     * @param {*} v
     * @param {*} x
     * @return {*}
     * @see R.prop, R.lensIndex, R.lensProp
     * @example
     *
     *      const xLens = R.lensProp('x');
     *
     *      R.set(xLens, 4, {x: 1, y: 2});  //=> {x: 4, y: 2}
     *      R.set(xLens, 8, {x: 1, y: 2});  //=> {x: 8, y: 2}
     */

    var set =
    /*#__PURE__*/
    _curry3(function set(lens, v, x) {
      return over(lens, always(v), x);
    });

    /**
     * Returns a copy of the list, sorted according to the comparator function,
     * which should accept two values at a time and return a negative number if the
     * first value is smaller, a positive number if it's larger, and zero if they
     * are equal. Please note that this is a **copy** of the list. It does not
     * modify the original.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig ((a, a) -> Number) -> [a] -> [a]
     * @param {Function} comparator A sorting function :: a -> b -> Int
     * @param {Array} list The list to sort
     * @return {Array} a new array with its elements sorted by the comparator function.
     * @example
     *
     *      const diff = function(a, b) { return a - b; };
     *      R.sort(diff, [4,2,7,5]); //=> [2, 4, 5, 7]
     */

    var sort =
    /*#__PURE__*/
    _curry2(function sort(comparator, list) {
      return Array.prototype.slice.call(list, 0).sort(comparator);
    });

    /**
     * Sorts the list according to the supplied function.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Relation
     * @sig Ord b => (a -> b) -> [a] -> [a]
     * @param {Function} fn
     * @param {Array} list The list to sort.
     * @return {Array} A new list sorted by the keys generated by `fn`.
     * @example
     *
     *      const sortByFirstItem = R.sortBy(R.prop(0));
     *      const pairs = [[-1, 1], [-2, 2], [-3, 3]];
     *      sortByFirstItem(pairs); //=> [[-3, 3], [-2, 2], [-1, 1]]
     *
     *      const sortByNameCaseInsensitive = R.sortBy(R.compose(R.toLower, R.prop('name')));
     *      const alice = {
     *        name: 'ALICE',
     *        age: 101
     *      };
     *      const bob = {
     *        name: 'Bob',
     *        age: -10
     *      };
     *      const clara = {
     *        name: 'clara',
     *        age: 314.159
     *      };
     *      const people = [clara, bob, alice];
     *      sortByNameCaseInsensitive(people); //=> [alice, bob, clara]
     */

    var sortBy =
    /*#__PURE__*/
    _curry2(function sortBy(fn, list) {
      return Array.prototype.slice.call(list, 0).sort(function (a, b) {
        var aa = fn(a);
        var bb = fn(b);
        return aa < bb ? -1 : aa > bb ? 1 : 0;
      });
    });

    /**
     * Sorts a list according to a list of comparators.
     *
     * @func
     * @memberOf R
     * @since v0.23.0
     * @category Relation
     * @sig [(a, a) -> Number] -> [a] -> [a]
     * @param {Array} functions A list of comparator functions.
     * @param {Array} list The list to sort.
     * @return {Array} A new list sorted according to the comarator functions.
     * @example
     *
     *      const alice = {
     *        name: 'alice',
     *        age: 40
     *      };
     *      const bob = {
     *        name: 'bob',
     *        age: 30
     *      };
     *      const clara = {
     *        name: 'clara',
     *        age: 40
     *      };
     *      const people = [clara, bob, alice];
     *      const ageNameSort = R.sortWith([
     *        R.descend(R.prop('age')),
     *        R.ascend(R.prop('name'))
     *      ]);
     *      ageNameSort(people); //=> [alice, clara, bob]
     */

    var sortWith =
    /*#__PURE__*/
    _curry2(function sortWith(fns, list) {
      return Array.prototype.slice.call(list, 0).sort(function (a, b) {
        var result = 0;
        var i = 0;

        while (result === 0 && i < fns.length) {
          result = fns[i](a, b);
          i += 1;
        }

        return result;
      });
    });

    /**
     * Splits a string into an array of strings based on the given
     * separator.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category String
     * @sig (String | RegExp) -> String -> [String]
     * @param {String|RegExp} sep The pattern.
     * @param {String} str The string to separate into an array.
     * @return {Array} The array of strings from `str` separated by `sep`.
     * @see R.join
     * @example
     *
     *      const pathComponents = R.split('/');
     *      R.tail(pathComponents('/usr/local/bin/node')); //=> ['usr', 'local', 'bin', 'node']
     *
     *      R.split('.', 'a.b.c.xyz.d'); //=> ['a', 'b', 'c', 'xyz', 'd']
     */

    var split =
    /*#__PURE__*/
    invoker(1, 'split');

    /**
     * Splits a given list or string at a given index.
     *
     * @func
     * @memberOf R
     * @since v0.19.0
     * @category List
     * @sig Number -> [a] -> [[a], [a]]
     * @sig Number -> String -> [String, String]
     * @param {Number} index The index where the array/string is split.
     * @param {Array|String} array The array/string to be split.
     * @return {Array}
     * @example
     *
     *      R.splitAt(1, [1, 2, 3]);          //=> [[1], [2, 3]]
     *      R.splitAt(5, 'hello world');      //=> ['hello', ' world']
     *      R.splitAt(-1, 'foobar');          //=> ['fooba', 'r']
     */

    var splitAt =
    /*#__PURE__*/
    _curry2(function splitAt(index, array) {
      return [slice(0, index, array), slice(index, length(array), array)];
    });

    /**
     * Splits a collection into slices of the specified length.
     *
     * @func
     * @memberOf R
     * @since v0.16.0
     * @category List
     * @sig Number -> [a] -> [[a]]
     * @sig Number -> String -> [String]
     * @param {Number} n
     * @param {Array} list
     * @return {Array}
     * @example
     *
     *      R.splitEvery(3, [1, 2, 3, 4, 5, 6, 7]); //=> [[1, 2, 3], [4, 5, 6], [7]]
     *      R.splitEvery(3, 'foobarbaz'); //=> ['foo', 'bar', 'baz']
     */

    var splitEvery =
    /*#__PURE__*/
    _curry2(function splitEvery(n, list) {
      if (n <= 0) {
        throw new Error('First argument to splitEvery must be a positive integer');
      }

      var result = [];
      var idx = 0;

      while (idx < list.length) {
        result.push(slice(idx, idx += n, list));
      }

      return result;
    });

    /**
     * Takes a list and a predicate and returns a pair of lists with the following properties:
     *
     *  - the result of concatenating the two output lists is equivalent to the input list;
     *  - none of the elements of the first output list satisfies the predicate; and
     *  - if the second output list is non-empty, its first element satisfies the predicate.
     *
     * @func
     * @memberOf R
     * @since v0.19.0
     * @category List
     * @sig (a -> Boolean) -> [a] -> [[a], [a]]
     * @param {Function} pred The predicate that determines where the array is split.
     * @param {Array} list The array to be split.
     * @return {Array}
     * @example
     *
     *      R.splitWhen(R.equals(2), [1, 2, 3, 1, 2, 3]);   //=> [[1], [2, 3, 1, 2, 3]]
     */

    var splitWhen =
    /*#__PURE__*/
    _curry2(function splitWhen(pred, list) {
      var idx = 0;
      var len = list.length;
      var prefix = [];

      while (idx < len && !pred(list[idx])) {
        prefix.push(list[idx]);
        idx += 1;
      }

      return [prefix, Array.prototype.slice.call(list, idx)];
    });

    /**
     * Checks if a list starts with the provided sublist.
     *
     * Similarly, checks if a string starts with the provided substring.
     *
     * @func
     * @memberOf R
     * @since v0.24.0
     * @category List
     * @sig [a] -> [a] -> Boolean
     * @sig String -> String -> Boolean
     * @param {*} prefix
     * @param {*} list
     * @return {Boolean}
     * @see R.endsWith
     * @example
     *
     *      R.startsWith('a', 'abc')                //=> true
     *      R.startsWith('b', 'abc')                //=> false
     *      R.startsWith(['a'], ['a', 'b', 'c'])    //=> true
     *      R.startsWith(['b'], ['a', 'b', 'c'])    //=> false
     */

    var startsWith =
    /*#__PURE__*/
    _curry2(function (prefix, list) {
      return equals(take(prefix.length, list), prefix);
    });

    /**
     * Subtracts its second argument from its first argument.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Math
     * @sig Number -> Number -> Number
     * @param {Number} a The first value.
     * @param {Number} b The second value.
     * @return {Number} The result of `a - b`.
     * @see R.add
     * @example
     *
     *      R.subtract(10, 8); //=> 2
     *
     *      const minus5 = R.subtract(R.__, 5);
     *      minus5(17); //=> 12
     *
     *      const complementaryAngle = R.subtract(90);
     *      complementaryAngle(30); //=> 60
     *      complementaryAngle(72); //=> 18
     */

    var subtract =
    /*#__PURE__*/
    _curry2(function subtract(a, b) {
      return Number(a) - Number(b);
    });

    /**
     * Finds the set (i.e. no duplicates) of all elements contained in the first or
     * second list, but not both.
     *
     * @func
     * @memberOf R
     * @since v0.19.0
     * @category Relation
     * @sig [*] -> [*] -> [*]
     * @param {Array} list1 The first list.
     * @param {Array} list2 The second list.
     * @return {Array} The elements in `list1` or `list2`, but not both.
     * @see R.symmetricDifferenceWith, R.difference, R.differenceWith
     * @example
     *
     *      R.symmetricDifference([1,2,3,4], [7,6,5,4,3]); //=> [1,2,7,6,5]
     *      R.symmetricDifference([7,6,5,4,3], [1,2,3,4]); //=> [7,6,5,1,2]
     */

    var symmetricDifference =
    /*#__PURE__*/
    _curry2(function symmetricDifference(list1, list2) {
      return concat(difference(list1, list2), difference(list2, list1));
    });

    /**
     * Finds the set (i.e. no duplicates) of all elements contained in the first or
     * second list, but not both. Duplication is determined according to the value
     * returned by applying the supplied predicate to two list elements.
     *
     * @func
     * @memberOf R
     * @since v0.19.0
     * @category Relation
     * @sig ((a, a) -> Boolean) -> [a] -> [a] -> [a]
     * @param {Function} pred A predicate used to test whether two items are equal.
     * @param {Array} list1 The first list.
     * @param {Array} list2 The second list.
     * @return {Array} The elements in `list1` or `list2`, but not both.
     * @see R.symmetricDifference, R.difference, R.differenceWith
     * @example
     *
     *      const eqA = R.eqBy(R.prop('a'));
     *      const l1 = [{a: 1}, {a: 2}, {a: 3}, {a: 4}];
     *      const l2 = [{a: 3}, {a: 4}, {a: 5}, {a: 6}];
     *      R.symmetricDifferenceWith(eqA, l1, l2); //=> [{a: 1}, {a: 2}, {a: 5}, {a: 6}]
     */

    var symmetricDifferenceWith =
    /*#__PURE__*/
    _curry3(function symmetricDifferenceWith(pred, list1, list2) {
      return concat(differenceWith(pred, list1, list2), differenceWith(pred, list2, list1));
    });

    /**
     * Returns a new list containing the last `n` elements of a given list, passing
     * each value to the supplied predicate function, and terminating when the
     * predicate function returns `false`. Excludes the element that caused the
     * predicate function to fail. The predicate function is passed one argument:
     * *(value)*.
     *
     * @func
     * @memberOf R
     * @since v0.16.0
     * @category List
     * @sig (a -> Boolean) -> [a] -> [a]
     * @sig (a -> Boolean) -> String -> String
     * @param {Function} fn The function called per iteration.
     * @param {Array} xs The collection to iterate over.
     * @return {Array} A new array.
     * @see R.dropLastWhile, R.addIndex
     * @example
     *
     *      const isNotOne = x => x !== 1;
     *
     *      R.takeLastWhile(isNotOne, [1, 2, 3, 4]); //=> [2, 3, 4]
     *
     *      R.takeLastWhile(x => x !== 'R' , 'Ramda'); //=> 'amda'
     */

    var takeLastWhile =
    /*#__PURE__*/
    _curry2(function takeLastWhile(fn, xs) {
      var idx = xs.length - 1;

      while (idx >= 0 && fn(xs[idx])) {
        idx -= 1;
      }

      return slice(idx + 1, Infinity, xs);
    });

    var XTakeWhile =
    /*#__PURE__*/
    function () {
      function XTakeWhile(f, xf) {
        this.xf = xf;
        this.f = f;
      }

      XTakeWhile.prototype['@@transducer/init'] = _xfBase.init;
      XTakeWhile.prototype['@@transducer/result'] = _xfBase.result;

      XTakeWhile.prototype['@@transducer/step'] = function (result, input) {
        return this.f(input) ? this.xf['@@transducer/step'](result, input) : _reduced(result);
      };

      return XTakeWhile;
    }();

    var _xtakeWhile =
    /*#__PURE__*/
    _curry2(function _xtakeWhile(f, xf) {
      return new XTakeWhile(f, xf);
    });

    /**
     * Returns a new list containing the first `n` elements of a given list,
     * passing each value to the supplied predicate function, and terminating when
     * the predicate function returns `false`. Excludes the element that caused the
     * predicate function to fail. The predicate function is passed one argument:
     * *(value)*.
     *
     * Dispatches to the `takeWhile` method of the second argument, if present.
     *
     * Acts as a transducer if a transformer is given in list position.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig (a -> Boolean) -> [a] -> [a]
     * @sig (a -> Boolean) -> String -> String
     * @param {Function} fn The function called per iteration.
     * @param {Array} xs The collection to iterate over.
     * @return {Array} A new array.
     * @see R.dropWhile, R.transduce, R.addIndex
     * @example
     *
     *      const isNotFour = x => x !== 4;
     *
     *      R.takeWhile(isNotFour, [1, 2, 3, 4, 3, 2, 1]); //=> [1, 2, 3]
     *
     *      R.takeWhile(x => x !== 'd' , 'Ramda'); //=> 'Ram'
     */

    var takeWhile =
    /*#__PURE__*/
    _curry2(
    /*#__PURE__*/
    _dispatchable(['takeWhile'], _xtakeWhile, function takeWhile(fn, xs) {
      var idx = 0;
      var len = xs.length;

      while (idx < len && fn(xs[idx])) {
        idx += 1;
      }

      return slice(0, idx, xs);
    }));

    var XTap =
    /*#__PURE__*/
    function () {
      function XTap(f, xf) {
        this.xf = xf;
        this.f = f;
      }

      XTap.prototype['@@transducer/init'] = _xfBase.init;
      XTap.prototype['@@transducer/result'] = _xfBase.result;

      XTap.prototype['@@transducer/step'] = function (result, input) {
        this.f(input);
        return this.xf['@@transducer/step'](result, input);
      };

      return XTap;
    }();

    var _xtap =
    /*#__PURE__*/
    _curry2(function _xtap(f, xf) {
      return new XTap(f, xf);
    });

    /**
     * Runs the given function with the supplied object, then returns the object.
     *
     * Acts as a transducer if a transformer is given as second parameter.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Function
     * @sig (a -> *) -> a -> a
     * @param {Function} fn The function to call with `x`. The return value of `fn` will be thrown away.
     * @param {*} x
     * @return {*} `x`.
     * @example
     *
     *      const sayX = x => console.log('x is ' + x);
     *      R.tap(sayX, 100); //=> 100
     *      // logs 'x is 100'
     * @symb R.tap(f, a) = a
     */

    var tap =
    /*#__PURE__*/
    _curry2(
    /*#__PURE__*/
    _dispatchable([], _xtap, function tap(fn, x) {
      fn(x);
      return x;
    }));

    function _isRegExp(x) {
      return Object.prototype.toString.call(x) === '[object RegExp]';
    }

    /**
     * Determines whether a given string matches a given regular expression.
     *
     * @func
     * @memberOf R
     * @since v0.12.0
     * @category String
     * @sig RegExp -> String -> Boolean
     * @param {RegExp} pattern
     * @param {String} str
     * @return {Boolean}
     * @see R.match
     * @example
     *
     *      R.test(/^x/, 'xyz'); //=> true
     *      R.test(/^y/, 'xyz'); //=> false
     */

    var test =
    /*#__PURE__*/
    _curry2(function test(pattern, str) {
      if (!_isRegExp(pattern)) {
        throw new TypeError('‘test’ requires a value of type RegExp as its first argument; received ' + toString$1(pattern));
      }

      return _cloneRegExp(pattern).test(str);
    });

    /**
     * Returns the result of applying the onSuccess function to the value inside
     * a successfully resolved promise. This is useful for working with promises
     * inside function compositions.
     *
     * @func
     * @memberOf R
     * @since v0.27.1
     * @category Function
     * @sig (a -> b) -> (Promise e a) -> (Promise e b)
     * @sig (a -> (Promise e b)) -> (Promise e a) -> (Promise e b)
     * @param {Function} onSuccess The function to apply. Can return a value or a promise of a value.
     * @param {Promise} p
     * @return {Promise} The result of calling `p.then(onSuccess)`
     * @see R.otherwise
     * @example
     *
     *      var makeQuery = (email) => ({ query: { email }});
     *
     *      //getMemberName :: String -> Promise ({firstName, lastName})
     *      var getMemberName = R.pipe(
     *        makeQuery,
     *        fetchMember,
     *        R.andThen(R.pick(['firstName', 'lastName']))
     *      );
     */

    var andThen =
    /*#__PURE__*/
    _curry2(function andThen(f, p) {
      _assertPromise('andThen', p);

      return p.then(f);
    });

    /**
     * The lower case version of a string.
     *
     * @func
     * @memberOf R
     * @since v0.9.0
     * @category String
     * @sig String -> String
     * @param {String} str The string to lower case.
     * @return {String} The lower case version of `str`.
     * @see R.toUpper
     * @example
     *
     *      R.toLower('XYZ'); //=> 'xyz'
     */

    var toLower =
    /*#__PURE__*/
    invoker(0, 'toLowerCase');

    /**
     * Converts an object into an array of key, value arrays. Only the object's
     * own properties are used.
     * Note that the order of the output array is not guaranteed to be consistent
     * across different JS platforms.
     *
     * @func
     * @memberOf R
     * @since v0.4.0
     * @category Object
     * @sig {String: *} -> [[String,*]]
     * @param {Object} obj The object to extract from
     * @return {Array} An array of key, value arrays from the object's own properties.
     * @see R.fromPairs
     * @example
     *
     *      R.toPairs({a: 1, b: 2, c: 3}); //=> [['a', 1], ['b', 2], ['c', 3]]
     */

    var toPairs =
    /*#__PURE__*/
    _curry1(function toPairs(obj) {
      var pairs = [];

      for (var prop in obj) {
        if (_has(prop, obj)) {
          pairs[pairs.length] = [prop, obj[prop]];
        }
      }

      return pairs;
    });

    /**
     * Converts an object into an array of key, value arrays. The object's own
     * properties and prototype properties are used. Note that the order of the
     * output array is not guaranteed to be consistent across different JS
     * platforms.
     *
     * @func
     * @memberOf R
     * @since v0.4.0
     * @category Object
     * @sig {String: *} -> [[String,*]]
     * @param {Object} obj The object to extract from
     * @return {Array} An array of key, value arrays from the object's own
     *         and prototype properties.
     * @example
     *
     *      const F = function() { this.x = 'X'; };
     *      F.prototype.y = 'Y';
     *      const f = new F();
     *      R.toPairsIn(f); //=> [['x','X'], ['y','Y']]
     */

    var toPairsIn =
    /*#__PURE__*/
    _curry1(function toPairsIn(obj) {
      var pairs = [];

      for (var prop in obj) {
        pairs[pairs.length] = [prop, obj[prop]];
      }

      return pairs;
    });

    /**
     * The upper case version of a string.
     *
     * @func
     * @memberOf R
     * @since v0.9.0
     * @category String
     * @sig String -> String
     * @param {String} str The string to upper case.
     * @return {String} The upper case version of `str`.
     * @see R.toLower
     * @example
     *
     *      R.toUpper('abc'); //=> 'ABC'
     */

    var toUpper =
    /*#__PURE__*/
    invoker(0, 'toUpperCase');

    /**
     * Initializes a transducer using supplied iterator function. Returns a single
     * item by iterating through the list, successively calling the transformed
     * iterator function and passing it an accumulator value and the current value
     * from the array, and then passing the result to the next call.
     *
     * The iterator function receives two values: *(acc, value)*. It will be
     * wrapped as a transformer to initialize the transducer. A transformer can be
     * passed directly in place of an iterator function. In both cases, iteration
     * may be stopped early with the [`R.reduced`](#reduced) function.
     *
     * A transducer is a function that accepts a transformer and returns a
     * transformer and can be composed directly.
     *
     * A transformer is an an object that provides a 2-arity reducing iterator
     * function, step, 0-arity initial value function, init, and 1-arity result
     * extraction function, result. The step function is used as the iterator
     * function in reduce. The result function is used to convert the final
     * accumulator into the return type and in most cases is
     * [`R.identity`](#identity). The init function can be used to provide an
     * initial accumulator, but is ignored by transduce.
     *
     * The iteration is performed with [`R.reduce`](#reduce) after initializing the transducer.
     *
     * @func
     * @memberOf R
     * @since v0.12.0
     * @category List
     * @sig (c -> c) -> ((a, b) -> a) -> a -> [b] -> a
     * @param {Function} xf The transducer function. Receives a transformer and returns a transformer.
     * @param {Function} fn The iterator function. Receives two values, the accumulator and the
     *        current element from the array. Wrapped as transformer, if necessary, and used to
     *        initialize the transducer
     * @param {*} acc The initial accumulator value.
     * @param {Array} list The list to iterate over.
     * @return {*} The final, accumulated value.
     * @see R.reduce, R.reduced, R.into
     * @example
     *
     *      const numbers = [1, 2, 3, 4];
     *      const transducer = R.compose(R.map(R.add(1)), R.take(2));
     *      R.transduce(transducer, R.flip(R.append), [], numbers); //=> [2, 3]
     *
     *      const isOdd = (x) => x % 2 === 1;
     *      const firstOddTransducer = R.compose(R.filter(isOdd), R.take(1));
     *      R.transduce(firstOddTransducer, R.flip(R.append), [], R.range(0, 100)); //=> [1]
     */

    var transduce =
    /*#__PURE__*/
    curryN(4, function transduce(xf, fn, acc, list) {
      return _reduce(xf(typeof fn === 'function' ? _xwrap(fn) : fn), acc, list);
    });

    /**
     * Transposes the rows and columns of a 2D list.
     * When passed a list of `n` lists of length `x`,
     * returns a list of `x` lists of length `n`.
     *
     *
     * @func
     * @memberOf R
     * @since v0.19.0
     * @category List
     * @sig [[a]] -> [[a]]
     * @param {Array} list A 2D list
     * @return {Array} A 2D list
     * @example
     *
     *      R.transpose([[1, 'a'], [2, 'b'], [3, 'c']]) //=> [[1, 2, 3], ['a', 'b', 'c']]
     *      R.transpose([[1, 2, 3], ['a', 'b', 'c']]) //=> [[1, 'a'], [2, 'b'], [3, 'c']]
     *
     *      // If some of the rows are shorter than the following rows, their elements are skipped:
     *      R.transpose([[10, 11], [20], [], [30, 31, 32]]) //=> [[10, 20, 30], [11, 31], [32]]
     * @symb R.transpose([[a], [b], [c]]) = [a, b, c]
     * @symb R.transpose([[a, b], [c, d]]) = [[a, c], [b, d]]
     * @symb R.transpose([[a, b], [c]]) = [[a, c], [b]]
     */

    var transpose =
    /*#__PURE__*/
    _curry1(function transpose(outerlist) {
      var i = 0;
      var result = [];

      while (i < outerlist.length) {
        var innerlist = outerlist[i];
        var j = 0;

        while (j < innerlist.length) {
          if (typeof result[j] === 'undefined') {
            result[j] = [];
          }

          result[j].push(innerlist[j]);
          j += 1;
        }

        i += 1;
      }

      return result;
    });

    /**
     * Maps an [Applicative](https://github.com/fantasyland/fantasy-land#applicative)-returning
     * function over a [Traversable](https://github.com/fantasyland/fantasy-land#traversable),
     * then uses [`sequence`](#sequence) to transform the resulting Traversable of Applicative
     * into an Applicative of Traversable.
     *
     * Dispatches to the `traverse` method of the third argument, if present.
     *
     * @func
     * @memberOf R
     * @since v0.19.0
     * @category List
     * @sig (Applicative f, Traversable t) => (a -> f a) -> (a -> f b) -> t a -> f (t b)
     * @param {Function} of
     * @param {Function} f
     * @param {*} traversable
     * @return {*}
     * @see R.sequence
     * @example
     *
     *      // Returns `Maybe.Nothing` if the given divisor is `0`
     *      const safeDiv = n => d => d === 0 ? Maybe.Nothing() : Maybe.Just(n / d)
     *
     *      R.traverse(Maybe.of, safeDiv(10), [2, 4, 5]); //=> Maybe.Just([5, 2.5, 2])
     *      R.traverse(Maybe.of, safeDiv(10), [2, 0, 5]); //=> Maybe.Nothing
     */

    var traverse =
    /*#__PURE__*/
    _curry3(function traverse(of, f, traversable) {
      return typeof traversable['fantasy-land/traverse'] === 'function' ? traversable['fantasy-land/traverse'](f, of) : sequence(of, map(f, traversable));
    });

    var ws = '\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003' + '\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028' + '\u2029\uFEFF';
    var zeroWidth = '\u200b';
    var hasProtoTrim = typeof String.prototype.trim === 'function';
    /**
     * Removes (strips) whitespace from both ends of the string.
     *
     * @func
     * @memberOf R
     * @since v0.6.0
     * @category String
     * @sig String -> String
     * @param {String} str The string to trim.
     * @return {String} Trimmed version of `str`.
     * @example
     *
     *      R.trim('   xyz  '); //=> 'xyz'
     *      R.map(R.trim, R.split(',', 'x, y, z')); //=> ['x', 'y', 'z']
     */

    var trim = !hasProtoTrim ||
    /*#__PURE__*/
    ws.trim() || !
    /*#__PURE__*/
    zeroWidth.trim() ?
    /*#__PURE__*/
    _curry1(function trim(str) {
      var beginRx = new RegExp('^[' + ws + '][' + ws + ']*');
      var endRx = new RegExp('[' + ws + '][' + ws + ']*$');
      return str.replace(beginRx, '').replace(endRx, '');
    }) :
    /*#__PURE__*/
    _curry1(function trim(str) {
      return str.trim();
    });

    /**
     * `tryCatch` takes two functions, a `tryer` and a `catcher`. The returned
     * function evaluates the `tryer`; if it does not throw, it simply returns the
     * result. If the `tryer` *does* throw, the returned function evaluates the
     * `catcher` function and returns its result. Note that for effective
     * composition with this function, both the `tryer` and `catcher` functions
     * must return the same type of results.
     *
     * @func
     * @memberOf R
     * @since v0.20.0
     * @category Function
     * @sig (...x -> a) -> ((e, ...x) -> a) -> (...x -> a)
     * @param {Function} tryer The function that may throw.
     * @param {Function} catcher The function that will be evaluated if `tryer` throws.
     * @return {Function} A new function that will catch exceptions and send then to the catcher.
     * @example
     *
     *      R.tryCatch(R.prop('x'), R.F)({x: true}); //=> true
     *      R.tryCatch(() => { throw 'foo'}, R.always('catched'))('bar') // => 'catched'
     *      R.tryCatch(R.times(R.identity), R.always([]))('s') // => []
     *      R.tryCatch(() => { throw 'this is not a valid value'}, (err, value)=>({error : err,  value }))('bar') // => {'error': 'this is not a valid value', 'value': 'bar'}
     */

    var tryCatch =
    /*#__PURE__*/
    _curry2(function _tryCatch(tryer, catcher) {
      return _arity(tryer.length, function () {
        try {
          return tryer.apply(this, arguments);
        } catch (e) {
          return catcher.apply(this, _concat([e], arguments));
        }
      });
    });

    /**
     * Takes a function `fn`, which takes a single array argument, and returns a
     * function which:
     *
     *   - takes any number of positional arguments;
     *   - passes these arguments to `fn` as an array; and
     *   - returns the result.
     *
     * In other words, `R.unapply` derives a variadic function from a function which
     * takes an array. `R.unapply` is the inverse of [`R.apply`](#apply).
     *
     * @func
     * @memberOf R
     * @since v0.8.0
     * @category Function
     * @sig ([*...] -> a) -> (*... -> a)
     * @param {Function} fn
     * @return {Function}
     * @see R.apply
     * @example
     *
     *      R.unapply(JSON.stringify)(1, 2, 3); //=> '[1,2,3]'
     * @symb R.unapply(f)(a, b) = f([a, b])
     */

    var unapply =
    /*#__PURE__*/
    _curry1(function unapply(fn) {
      return function () {
        return fn(Array.prototype.slice.call(arguments, 0));
      };
    });

    /**
     * Wraps a function of any arity (including nullary) in a function that accepts
     * exactly 1 parameter. Any extraneous parameters will not be passed to the
     * supplied function.
     *
     * @func
     * @memberOf R
     * @since v0.2.0
     * @category Function
     * @sig (* -> b) -> (a -> b)
     * @param {Function} fn The function to wrap.
     * @return {Function} A new function wrapping `fn`. The new function is guaranteed to be of
     *         arity 1.
     * @see R.binary, R.nAry
     * @example
     *
     *      const takesTwoArgs = function(a, b) {
     *        return [a, b];
     *      };
     *      takesTwoArgs.length; //=> 2
     *      takesTwoArgs(1, 2); //=> [1, 2]
     *
     *      const takesOneArg = R.unary(takesTwoArgs);
     *      takesOneArg.length; //=> 1
     *      // Only 1 argument is passed to the wrapped function
     *      takesOneArg(1, 2); //=> [1, undefined]
     * @symb R.unary(f)(a, b, c) = f(a)
     */

    var unary =
    /*#__PURE__*/
    _curry1(function unary(fn) {
      return nAry(1, fn);
    });

    /**
     * Returns a function of arity `n` from a (manually) curried function.
     *
     * @func
     * @memberOf R
     * @since v0.14.0
     * @category Function
     * @sig Number -> (a -> b) -> (a -> c)
     * @param {Number} length The arity for the returned function.
     * @param {Function} fn The function to uncurry.
     * @return {Function} A new function.
     * @see R.curry
     * @example
     *
     *      const addFour = a => b => c => d => a + b + c + d;
     *
     *      const uncurriedAddFour = R.uncurryN(4, addFour);
     *      uncurriedAddFour(1, 2, 3, 4); //=> 10
     */

    var uncurryN =
    /*#__PURE__*/
    _curry2(function uncurryN(depth, fn) {
      return curryN(depth, function () {
        var currentDepth = 1;
        var value = fn;
        var idx = 0;
        var endIdx;

        while (currentDepth <= depth && typeof value === 'function') {
          endIdx = currentDepth === depth ? arguments.length : idx + value.length;
          value = value.apply(this, Array.prototype.slice.call(arguments, idx, endIdx));
          currentDepth += 1;
          idx = endIdx;
        }

        return value;
      });
    });

    /**
     * Builds a list from a seed value. Accepts an iterator function, which returns
     * either false to stop iteration or an array of length 2 containing the value
     * to add to the resulting list and the seed to be used in the next call to the
     * iterator function.
     *
     * The iterator function receives one argument: *(seed)*.
     *
     * @func
     * @memberOf R
     * @since v0.10.0
     * @category List
     * @sig (a -> [b]) -> * -> [b]
     * @param {Function} fn The iterator function. receives one argument, `seed`, and returns
     *        either false to quit iteration or an array of length two to proceed. The element
     *        at index 0 of this array will be added to the resulting array, and the element
     *        at index 1 will be passed to the next call to `fn`.
     * @param {*} seed The seed value.
     * @return {Array} The final list.
     * @example
     *
     *      const f = n => n > 50 ? false : [-n, n + 10];
     *      R.unfold(f, 10); //=> [-10, -20, -30, -40, -50]
     * @symb R.unfold(f, x) = [f(x)[0], f(f(x)[1])[0], f(f(f(x)[1])[1])[0], ...]
     */

    var unfold =
    /*#__PURE__*/
    _curry2(function unfold(fn, seed) {
      var pair = fn(seed);
      var result = [];

      while (pair && pair.length) {
        result[result.length] = pair[0];
        pair = fn(pair[1]);
      }

      return result;
    });

    /**
     * Combines two lists into a set (i.e. no duplicates) composed of the elements
     * of each list.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Relation
     * @sig [*] -> [*] -> [*]
     * @param {Array} as The first list.
     * @param {Array} bs The second list.
     * @return {Array} The first and second lists concatenated, with
     *         duplicates removed.
     * @example
     *
     *      R.union([1, 2, 3], [2, 3, 4]); //=> [1, 2, 3, 4]
     */

    var union =
    /*#__PURE__*/
    _curry2(
    /*#__PURE__*/
    compose(uniq, _concat));

    /**
     * Returns a new list containing only one copy of each element in the original
     * list, based upon the value returned by applying the supplied predicate to
     * two list elements. Prefers the first item if two items compare equal based
     * on the predicate.
     *
     * @func
     * @memberOf R
     * @since v0.2.0
     * @category List
     * @sig ((a, a) -> Boolean) -> [a] -> [a]
     * @param {Function} pred A predicate used to test whether two items are equal.
     * @param {Array} list The array to consider.
     * @return {Array} The list of unique items.
     * @example
     *
     *      const strEq = R.eqBy(String);
     *      R.uniqWith(strEq)([1, '1', 2, 1]); //=> [1, 2]
     *      R.uniqWith(strEq)([{}, {}]);       //=> [{}]
     *      R.uniqWith(strEq)([1, '1', 1]);    //=> [1]
     *      R.uniqWith(strEq)(['1', 1, 1]);    //=> ['1']
     */

    var uniqWith =
    /*#__PURE__*/
    _curry2(function uniqWith(pred, list) {
      var idx = 0;
      var len = list.length;
      var result = [];
      var item;

      while (idx < len) {
        item = list[idx];

        if (!_includesWith(pred, item, result)) {
          result[result.length] = item;
        }

        idx += 1;
      }

      return result;
    });

    /**
     * Combines two lists into a set (i.e. no duplicates) composed of the elements
     * of each list. Duplication is determined according to the value returned by
     * applying the supplied predicate to two list elements.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category Relation
     * @sig ((a, a) -> Boolean) -> [*] -> [*] -> [*]
     * @param {Function} pred A predicate used to test whether two items are equal.
     * @param {Array} list1 The first list.
     * @param {Array} list2 The second list.
     * @return {Array} The first and second lists concatenated, with
     *         duplicates removed.
     * @see R.union
     * @example
     *
     *      const l1 = [{a: 1}, {a: 2}];
     *      const l2 = [{a: 1}, {a: 4}];
     *      R.unionWith(R.eqBy(R.prop('a')), l1, l2); //=> [{a: 1}, {a: 2}, {a: 4}]
     */

    var unionWith =
    /*#__PURE__*/
    _curry3(function unionWith(pred, list1, list2) {
      return uniqWith(pred, _concat(list1, list2));
    });

    /**
     * Tests the final argument by passing it to the given predicate function. If
     * the predicate is not satisfied, the function will return the result of
     * calling the `whenFalseFn` function with the same argument. If the predicate
     * is satisfied, the argument is returned as is.
     *
     * @func
     * @memberOf R
     * @since v0.18.0
     * @category Logic
     * @sig (a -> Boolean) -> (a -> a) -> a -> a
     * @param {Function} pred        A predicate function
     * @param {Function} whenFalseFn A function to invoke when the `pred` evaluates
     *                               to a falsy value.
     * @param {*}        x           An object to test with the `pred` function and
     *                               pass to `whenFalseFn` if necessary.
     * @return {*} Either `x` or the result of applying `x` to `whenFalseFn`.
     * @see R.ifElse, R.when, R.cond
     * @example
     *
     *      let safeInc = R.unless(R.isNil, R.inc);
     *      safeInc(null); //=> null
     *      safeInc(1); //=> 2
     */

    var unless =
    /*#__PURE__*/
    _curry3(function unless(pred, whenFalseFn, x) {
      return pred(x) ? x : whenFalseFn(x);
    });

    /**
     * Shorthand for `R.chain(R.identity)`, which removes one level of nesting from
     * any [Chain](https://github.com/fantasyland/fantasy-land#chain).
     *
     * @func
     * @memberOf R
     * @since v0.3.0
     * @category List
     * @sig Chain c => c (c a) -> c a
     * @param {*} list
     * @return {*}
     * @see R.flatten, R.chain
     * @example
     *
     *      R.unnest([1, [2], [[3]]]); //=> [1, 2, [3]]
     *      R.unnest([[1, 2], [3, 4], [5, 6]]); //=> [1, 2, 3, 4, 5, 6]
     */

    var unnest =
    /*#__PURE__*/
    chain(_identity);

    /**
     * Takes a predicate, a transformation function, and an initial value,
     * and returns a value of the same type as the initial value.
     * It does so by applying the transformation until the predicate is satisfied,
     * at which point it returns the satisfactory value.
     *
     * @func
     * @memberOf R
     * @since v0.20.0
     * @category Logic
     * @sig (a -> Boolean) -> (a -> a) -> a -> a
     * @param {Function} pred A predicate function
     * @param {Function} fn The iterator function
     * @param {*} init Initial value
     * @return {*} Final value that satisfies predicate
     * @example
     *
     *      R.until(R.gt(R.__, 100), R.multiply(2))(1) // => 128
     */

    var until =
    /*#__PURE__*/
    _curry3(function until(pred, fn, init) {
      var val = init;

      while (!pred(val)) {
        val = fn(val);
      }

      return val;
    });

    /**
     * Returns a list of all the properties, including prototype properties, of the
     * supplied object.
     * Note that the order of the output array is not guaranteed to be consistent
     * across different JS platforms.
     *
     * @func
     * @memberOf R
     * @since v0.2.0
     * @category Object
     * @sig {k: v} -> [v]
     * @param {Object} obj The object to extract values from
     * @return {Array} An array of the values of the object's own and prototype properties.
     * @see R.values, R.keysIn
     * @example
     *
     *      const F = function() { this.x = 'X'; };
     *      F.prototype.y = 'Y';
     *      const f = new F();
     *      R.valuesIn(f); //=> ['X', 'Y']
     */

    var valuesIn =
    /*#__PURE__*/
    _curry1(function valuesIn(obj) {
      var prop;
      var vs = [];

      for (prop in obj) {
        vs[vs.length] = obj[prop];
      }

      return vs;
    });

    var Const = function (x) {
      return {
        value: x,
        'fantasy-land/map': function () {
          return this;
        }
      };
    };
    /**
     * Returns a "view" of the given data structure, determined by the given lens.
     * The lens's focus determines which portion of the data structure is visible.
     *
     * @func
     * @memberOf R
     * @since v0.16.0
     * @category Object
     * @typedefn Lens s a = Functor f => (a -> f a) -> s -> f s
     * @sig Lens s a -> s -> a
     * @param {Lens} lens
     * @param {*} x
     * @return {*}
     * @see R.prop, R.lensIndex, R.lensProp
     * @example
     *
     *      const xLens = R.lensProp('x');
     *
     *      R.view(xLens, {x: 1, y: 2});  //=> 1
     *      R.view(xLens, {x: 4, y: 2});  //=> 4
     */


    var view =
    /*#__PURE__*/
    _curry2(function view(lens, x) {
      // Using `Const` effectively ignores the setter function of the `lens`,
      // leaving the value returned by the getter function unmodified.
      return lens(Const)(x).value;
    });

    /**
     * Tests the final argument by passing it to the given predicate function. If
     * the predicate is satisfied, the function will return the result of calling
     * the `whenTrueFn` function with the same argument. If the predicate is not
     * satisfied, the argument is returned as is.
     *
     * @func
     * @memberOf R
     * @since v0.18.0
     * @category Logic
     * @sig (a -> Boolean) -> (a -> a) -> a -> a
     * @param {Function} pred       A predicate function
     * @param {Function} whenTrueFn A function to invoke when the `condition`
     *                              evaluates to a truthy value.
     * @param {*}        x          An object to test with the `pred` function and
     *                              pass to `whenTrueFn` if necessary.
     * @return {*} Either `x` or the result of applying `x` to `whenTrueFn`.
     * @see R.ifElse, R.unless, R.cond
     * @example
     *
     *      // truncate :: String -> String
     *      const truncate = R.when(
     *        R.propSatisfies(R.gt(R.__, 10), 'length'),
     *        R.pipe(R.take(10), R.append('…'), R.join(''))
     *      );
     *      truncate('12345');         //=> '12345'
     *      truncate('0123456789ABC'); //=> '0123456789…'
     */

    var when =
    /*#__PURE__*/
    _curry3(function when(pred, whenTrueFn, x) {
      return pred(x) ? whenTrueFn(x) : x;
    });

    /**
     * Takes a spec object and a test object; returns true if the test satisfies
     * the spec. Each of the spec's own properties must be a predicate function.
     * Each predicate is applied to the value of the corresponding property of the
     * test object. `where` returns true if all the predicates return true, false
     * otherwise.
     *
     * `where` is well suited to declaratively expressing constraints for other
     * functions such as [`filter`](#filter) and [`find`](#find).
     *
     * @func
     * @memberOf R
     * @since v0.1.1
     * @category Object
     * @sig {String: (* -> Boolean)} -> {String: *} -> Boolean
     * @param {Object} spec
     * @param {Object} testObj
     * @return {Boolean}
     * @see R.propSatisfies, R.whereEq
     * @example
     *
     *      // pred :: Object -> Boolean
     *      const pred = R.where({
     *        a: R.equals('foo'),
     *        b: R.complement(R.equals('bar')),
     *        x: R.gt(R.__, 10),
     *        y: R.lt(R.__, 20)
     *      });
     *
     *      pred({a: 'foo', b: 'xxx', x: 11, y: 19}); //=> true
     *      pred({a: 'xxx', b: 'xxx', x: 11, y: 19}); //=> false
     *      pred({a: 'foo', b: 'bar', x: 11, y: 19}); //=> false
     *      pred({a: 'foo', b: 'xxx', x: 10, y: 19}); //=> false
     *      pred({a: 'foo', b: 'xxx', x: 11, y: 20}); //=> false
     */

    var where =
    /*#__PURE__*/
    _curry2(function where(spec, testObj) {
      for (var prop in spec) {
        if (_has(prop, spec) && !spec[prop](testObj[prop])) {
          return false;
        }
      }

      return true;
    });

    /**
     * Takes a spec object and a test object; returns true if the test satisfies
     * the spec, false otherwise. An object satisfies the spec if, for each of the
     * spec's own properties, accessing that property of the object gives the same
     * value (in [`R.equals`](#equals) terms) as accessing that property of the
     * spec.
     *
     * `whereEq` is a specialization of [`where`](#where).
     *
     * @func
     * @memberOf R
     * @since v0.14.0
     * @category Object
     * @sig {String: *} -> {String: *} -> Boolean
     * @param {Object} spec
     * @param {Object} testObj
     * @return {Boolean}
     * @see R.propEq, R.where
     * @example
     *
     *      // pred :: Object -> Boolean
     *      const pred = R.whereEq({a: 1, b: 2});
     *
     *      pred({a: 1});              //=> false
     *      pred({a: 1, b: 2});        //=> true
     *      pred({a: 1, b: 2, c: 3});  //=> true
     *      pred({a: 1, b: 1});        //=> false
     */

    var whereEq =
    /*#__PURE__*/
    _curry2(function whereEq(spec, testObj) {
      return where(map(equals, spec), testObj);
    });

    /**
     * Returns a new list without values in the first argument.
     * [`R.equals`](#equals) is used to determine equality.
     *
     * Acts as a transducer if a transformer is given in list position.
     *
     * @func
     * @memberOf R
     * @since v0.19.0
     * @category List
     * @sig [a] -> [a] -> [a]
     * @param {Array} list1 The values to be removed from `list2`.
     * @param {Array} list2 The array to remove values from.
     * @return {Array} The new array without values in `list1`.
     * @see R.transduce, R.difference, R.remove
     * @example
     *
     *      R.without([1, 2], [1, 2, 1, 3, 4]); //=> [3, 4]
     */

    var without =
    /*#__PURE__*/
    _curry2(function (xs, list) {
      return reject(flip(_includes)(xs), list);
    });

    /**
     * Exclusive disjunction logical operation.
     * Returns `true` if one of the arguments is truthy and the other is falsy.
     * Otherwise, it returns `false`.
     *
     * @func
     * @memberOf R
     * @since v0.27.1
     * @category Logic
     * @sig a -> b -> Boolean
     * @param {Any} a
     * @param {Any} b
     * @return {Boolean} true if one of the arguments is truthy and the other is falsy
     * @see R.or, R.and
     * @example
     *
     *      R.xor(true, true); //=> false
     *      R.xor(true, false); //=> true
     *      R.xor(false, true); //=> true
     *      R.xor(false, false); //=> false
     */

    var xor =
    /*#__PURE__*/
    _curry2(function xor(a, b) {
      return Boolean(!a ^ !b);
    });

    /**
     * Creates a new list out of the two supplied by creating each possible pair
     * from the lists.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig [a] -> [b] -> [[a,b]]
     * @param {Array} as The first list.
     * @param {Array} bs The second list.
     * @return {Array} The list made by combining each possible pair from
     *         `as` and `bs` into pairs (`[a, b]`).
     * @example
     *
     *      R.xprod([1, 2], ['a', 'b']); //=> [[1, 'a'], [1, 'b'], [2, 'a'], [2, 'b']]
     * @symb R.xprod([a, b], [c, d]) = [[a, c], [a, d], [b, c], [b, d]]
     */

    var xprod =
    /*#__PURE__*/
    _curry2(function xprod(a, b) {
      // = xprodWith(prepend); (takes about 3 times as long...)
      var idx = 0;
      var ilen = a.length;
      var j;
      var jlen = b.length;
      var result = [];

      while (idx < ilen) {
        j = 0;

        while (j < jlen) {
          result[result.length] = [a[idx], b[j]];
          j += 1;
        }

        idx += 1;
      }

      return result;
    });

    /**
     * Creates a new list out of the two supplied by pairing up equally-positioned
     * items from both lists. The returned list is truncated to the length of the
     * shorter of the two input lists.
     * Note: `zip` is equivalent to `zipWith(function(a, b) { return [a, b] })`.
     *
     * @func
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig [a] -> [b] -> [[a,b]]
     * @param {Array} list1 The first array to consider.
     * @param {Array} list2 The second array to consider.
     * @return {Array} The list made by pairing up same-indexed elements of `list1` and `list2`.
     * @example
     *
     *      R.zip([1, 2, 3], ['a', 'b', 'c']); //=> [[1, 'a'], [2, 'b'], [3, 'c']]
     * @symb R.zip([a, b, c], [d, e, f]) = [[a, d], [b, e], [c, f]]
     */

    var zip =
    /*#__PURE__*/
    _curry2(function zip(a, b) {
      var rv = [];
      var idx = 0;
      var len = Math.min(a.length, b.length);

      while (idx < len) {
        rv[idx] = [a[idx], b[idx]];
        idx += 1;
      }

      return rv;
    });

    /**
     * Creates a new object out of a list of keys and a list of values.
     * Key/value pairing is truncated to the length of the shorter of the two lists.
     * Note: `zipObj` is equivalent to `pipe(zip, fromPairs)`.
     *
     * @func
     * @memberOf R
     * @since v0.3.0
     * @category List
     * @sig [String] -> [*] -> {String: *}
     * @param {Array} keys The array that will be properties on the output object.
     * @param {Array} values The list of values on the output object.
     * @return {Object} The object made by pairing up same-indexed elements of `keys` and `values`.
     * @example
     *
     *      R.zipObj(['a', 'b', 'c'], [1, 2, 3]); //=> {a: 1, b: 2, c: 3}
     */

    var zipObj =
    /*#__PURE__*/
    _curry2(function zipObj(keys, values) {
      var idx = 0;
      var len = Math.min(keys.length, values.length);
      var out = {};

      while (idx < len) {
        out[keys[idx]] = values[idx];
        idx += 1;
      }

      return out;
    });

    /**
     * Creates a new list out of the two supplied by applying the function to each
     * equally-positioned pair in the lists. The returned list is truncated to the
     * length of the shorter of the two input lists.
     *
     * @function
     * @memberOf R
     * @since v0.1.0
     * @category List
     * @sig ((a, b) -> c) -> [a] -> [b] -> [c]
     * @param {Function} fn The function used to combine the two elements into one value.
     * @param {Array} list1 The first array to consider.
     * @param {Array} list2 The second array to consider.
     * @return {Array} The list made by combining same-indexed elements of `list1` and `list2`
     *         using `fn`.
     * @example
     *
     *      const f = (x, y) => {
     *        // ...
     *      };
     *      R.zipWith(f, [1, 2, 3], ['a', 'b', 'c']);
     *      //=> [f(1, 'a'), f(2, 'b'), f(3, 'c')]
     * @symb R.zipWith(fn, [a, b, c], [d, e, f]) = [fn(a, d), fn(b, e), fn(c, f)]
     */

    var zipWith =
    /*#__PURE__*/
    _curry3(function zipWith(fn, a, b) {
      var rv = [];
      var idx = 0;
      var len = Math.min(a.length, b.length);

      while (idx < len) {
        rv[idx] = fn(a[idx], b[idx]);
        idx += 1;
      }

      return rv;
    });

    /**
     * Creates a thunk out of a function. A thunk delays a calculation until
     * its result is needed, providing lazy evaluation of arguments.
     *
     * @func
     * @memberOf R
     * @since v0.26.0
     * @category Function
     * @sig ((a, b, ..., j) -> k) -> (a, b, ..., j) -> (() -> k)
     * @param {Function} fn A function to wrap in a thunk
     * @return {Function} Expects arguments for `fn` and returns a new function
     *  that, when called, applies those arguments to `fn`.
     * @see R.partial, R.partialRight
     * @example
     *
     *      R.thunkify(R.identity)(42)(); //=> 42
     *      R.thunkify((a, b) => a + b)(25, 17)(); //=> 42
     */

    var thunkify =
    /*#__PURE__*/
    _curry1(function thunkify(fn) {
      return curryN(fn.length, function createThunk() {
        var fnArgs = arguments;
        return function invokeThunk() {
          return fn.apply(this, fnArgs);
        };
      });
    });

    var R = /*#__PURE__*/Object.freeze({
        __proto__: null,
        F: F,
        T: T,
        __: __,
        add: add,
        addIndex: addIndex,
        adjust: adjust,
        all: all,
        allPass: allPass,
        always: always,
        and: and,
        any: any,
        anyPass: anyPass,
        ap: ap,
        aperture: aperture,
        append: append$1,
        apply: apply,
        applySpec: applySpec,
        applyTo: applyTo,
        ascend: ascend,
        assoc: assoc,
        assocPath: assocPath,
        binary: binary,
        bind: bind,
        both: both,
        call: call,
        chain: chain,
        clamp: clamp,
        clone: clone,
        comparator: comparator,
        complement: complement,
        compose: compose,
        composeK: composeK,
        composeP: composeP,
        composeWith: composeWith,
        concat: concat,
        cond: cond,
        construct: construct,
        constructN: constructN,
        contains: contains$1,
        converge: converge,
        countBy: countBy,
        curry: curry,
        curryN: curryN,
        dec: dec,
        defaultTo: defaultTo,
        descend: descend,
        difference: difference,
        differenceWith: differenceWith,
        dissoc: dissoc,
        dissocPath: dissocPath,
        divide: divide,
        drop: drop,
        dropLast: dropLast$1,
        dropLastWhile: dropLastWhile$1,
        dropRepeats: dropRepeats,
        dropRepeatsWith: dropRepeatsWith,
        dropWhile: dropWhile,
        either: either,
        empty: empty$1,
        endsWith: endsWith,
        eqBy: eqBy,
        eqProps: eqProps,
        equals: equals,
        evolve: evolve,
        filter: filter,
        find: find,
        findIndex: findIndex,
        findLast: findLast,
        findLastIndex: findLastIndex,
        flatten: flatten,
        flip: flip,
        forEach: forEach,
        forEachObjIndexed: forEachObjIndexed,
        fromPairs: fromPairs,
        groupBy: groupBy,
        groupWith: groupWith,
        gt: gt,
        gte: gte,
        has: has,
        hasIn: hasIn,
        hasPath: hasPath,
        head: head,
        identical: identical,
        identity: identity,
        ifElse: ifElse,
        inc: inc,
        includes: includes,
        indexBy: indexBy,
        indexOf: indexOf,
        init: init$1,
        innerJoin: innerJoin,
        insert: insert$1,
        insertAll: insertAll,
        intersection: intersection,
        intersperse: intersperse,
        into: into,
        invert: invert,
        invertObj: invertObj,
        invoker: invoker,
        is: is,
        isEmpty: isEmpty,
        isNil: isNil,
        join: join,
        juxt: juxt,
        keys: keys,
        keysIn: keysIn,
        last: last,
        lastIndexOf: lastIndexOf,
        length: length,
        lens: lens,
        lensIndex: lensIndex,
        lensPath: lensPath,
        lensProp: lensProp,
        lift: lift,
        liftN: liftN,
        lt: lt,
        lte: lte,
        map: map,
        mapAccum: mapAccum,
        mapAccumRight: mapAccumRight,
        mapObjIndexed: mapObjIndexed,
        match: match,
        mathMod: mathMod,
        max: max,
        maxBy: maxBy,
        mean: mean,
        median: median,
        memoizeWith: memoizeWith,
        merge: merge,
        mergeAll: mergeAll,
        mergeDeepLeft: mergeDeepLeft,
        mergeDeepRight: mergeDeepRight,
        mergeDeepWith: mergeDeepWith,
        mergeDeepWithKey: mergeDeepWithKey,
        mergeLeft: mergeLeft,
        mergeRight: mergeRight,
        mergeWith: mergeWith,
        mergeWithKey: mergeWithKey,
        min: min,
        minBy: minBy,
        modulo: modulo,
        move: move,
        multiply: multiply,
        nAry: nAry,
        negate: negate,
        none: none,
        not: not,
        nth: nth,
        nthArg: nthArg,
        o: o,
        objOf: objOf,
        of: of,
        omit: omit,
        once: once,
        or: or,
        otherwise: otherwise,
        over: over,
        pair: pair,
        partial: partial,
        partialRight: partialRight,
        partition: partition,
        path: path,
        paths: paths,
        pathEq: pathEq,
        pathOr: pathOr,
        pathSatisfies: pathSatisfies,
        pick: pick,
        pickAll: pickAll,
        pickBy: pickBy,
        pipe: pipe,
        pipeK: pipeK,
        pipeP: pipeP,
        pipeWith: pipeWith,
        pluck: pluck,
        prepend: prepend,
        product: product,
        project: project,
        prop: prop,
        propEq: propEq,
        propIs: propIs,
        propOr: propOr,
        propSatisfies: propSatisfies,
        props: props,
        range: range,
        reduce: reduce,
        reduceBy: reduceBy,
        reduceRight: reduceRight,
        reduceWhile: reduceWhile,
        reduced: reduced,
        reject: reject,
        remove: remove,
        repeat: repeat,
        replace: replace,
        reverse: reverse,
        scan: scan,
        sequence: sequence,
        set: set,
        slice: slice,
        sort: sort,
        sortBy: sortBy,
        sortWith: sortWith,
        split: split,
        splitAt: splitAt,
        splitEvery: splitEvery,
        splitWhen: splitWhen,
        startsWith: startsWith,
        subtract: subtract,
        sum: sum,
        symmetricDifference: symmetricDifference,
        symmetricDifferenceWith: symmetricDifferenceWith,
        tail: tail,
        take: take,
        takeLast: takeLast,
        takeLastWhile: takeLastWhile,
        takeWhile: takeWhile,
        tap: tap,
        test: test,
        andThen: andThen,
        times: times,
        toLower: toLower,
        toPairs: toPairs,
        toPairsIn: toPairsIn,
        toString: toString$1,
        toUpper: toUpper,
        transduce: transduce,
        transpose: transpose,
        traverse: traverse,
        trim: trim,
        tryCatch: tryCatch,
        type: type,
        unapply: unapply,
        unary: unary,
        uncurryN: uncurryN,
        unfold: unfold,
        union: union,
        unionWith: unionWith,
        uniq: uniq,
        uniqBy: uniqBy,
        uniqWith: uniqWith,
        unless: unless,
        unnest: unnest,
        until: until,
        update: update$1,
        useWith: useWith,
        values: values,
        valuesIn: valuesIn,
        view: view,
        when: when,
        where: where,
        whereEq: whereEq,
        without: without,
        xor: xor,
        xprod: xprod,
        zip: zip,
        zipObj: zipObj,
        zipWith: zipWith,
        thunkify: thunkify
    });

    function toInteger(dirtyNumber) {
      if (dirtyNumber === null || dirtyNumber === true || dirtyNumber === false) {
        return NaN;
      }

      var number = Number(dirtyNumber);

      if (isNaN(number)) {
        return number;
      }

      return number < 0 ? Math.ceil(number) : Math.floor(number);
    }

    function requiredArgs(required, args) {
      if (args.length < required) {
        throw new TypeError(required + ' argument' + (required > 1 ? 's' : '') + ' required, but only ' + args.length + ' present');
      }
    }

    /**
     * @name toDate
     * @category Common Helpers
     * @summary Convert the given argument to an instance of Date.
     *
     * @description
     * Convert the given argument to an instance of Date.
     *
     * If the argument is an instance of Date, the function returns its clone.
     *
     * If the argument is a number, it is treated as a timestamp.
     *
     * If the argument is none of the above, the function returns Invalid Date.
     *
     * **Note**: *all* Date arguments passed to any *date-fns* function is processed by `toDate`.
     *
     * @param {Date|Number} argument - the value to convert
     * @returns {Date} the parsed date in the local time zone
     * @throws {TypeError} 1 argument required
     *
     * @example
     * // Clone the date:
     * const result = toDate(new Date(2014, 1, 11, 11, 30, 30))
     * //=> Tue Feb 11 2014 11:30:30
     *
     * @example
     * // Convert the timestamp to date:
     * const result = toDate(1392098430000)
     * //=> Tue Feb 11 2014 11:30:30
     */

    function toDate(argument) {
      requiredArgs(1, arguments);
      var argStr = Object.prototype.toString.call(argument); // Clone the date

      if (argument instanceof Date || typeof argument === 'object' && argStr === '[object Date]') {
        // Prevent the date to lose the milliseconds when passed to new Date() in IE10
        return new Date(argument.getTime());
      } else if (typeof argument === 'number' || argStr === '[object Number]') {
        return new Date(argument);
      } else {
        if ((typeof argument === 'string' || argStr === '[object String]') && typeof console !== 'undefined') {
          // eslint-disable-next-line no-console
          console.warn("Starting with v2.0.0-beta.1 date-fns doesn't accept strings as date arguments. Please use `parseISO` to parse strings. See: https://git.io/fjule"); // eslint-disable-next-line no-console

          console.warn(new Error().stack);
        }

        return new Date(NaN);
      }
    }

    /**
     * @name addMilliseconds
     * @category Millisecond Helpers
     * @summary Add the specified number of milliseconds to the given date.
     *
     * @description
     * Add the specified number of milliseconds to the given date.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the date to be changed
     * @param {Number} amount - the amount of milliseconds to be added. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
     * @returns {Date} the new date with the milliseconds added
     * @throws {TypeError} 2 arguments required
     *
     * @example
     * // Add 750 milliseconds to 10 July 2014 12:45:30.000:
     * const result = addMilliseconds(new Date(2014, 6, 10, 12, 45, 30, 0), 750)
     * //=> Thu Jul 10 2014 12:45:30.750
     */

    function addMilliseconds(dirtyDate, dirtyAmount) {
      requiredArgs(2, arguments);
      var timestamp = toDate(dirtyDate).getTime();
      var amount = toInteger(dirtyAmount);
      return new Date(timestamp + amount);
    }

    var MILLISECONDS_IN_MINUTE = 60000;

    function getDateMillisecondsPart(date) {
      return date.getTime() % MILLISECONDS_IN_MINUTE;
    }
    /**
     * Google Chrome as of 67.0.3396.87 introduced timezones with offset that includes seconds.
     * They usually appear for dates that denote time before the timezones were introduced
     * (e.g. for 'Europe/Prague' timezone the offset is GMT+00:57:44 before 1 October 1891
     * and GMT+01:00:00 after that date)
     *
     * Date#getTimezoneOffset returns the offset in minutes and would return 57 for the example above,
     * which would lead to incorrect calculations.
     *
     * This function returns the timezone offset in milliseconds that takes seconds in account.
     */


    function getTimezoneOffsetInMilliseconds(dirtyDate) {
      var date = new Date(dirtyDate.getTime());
      var baseTimezoneOffset = Math.ceil(date.getTimezoneOffset());
      date.setSeconds(0, 0);
      var hasNegativeUTCOffset = baseTimezoneOffset > 0;
      var millisecondsPartOfTimezoneOffset = hasNegativeUTCOffset ? (MILLISECONDS_IN_MINUTE + getDateMillisecondsPart(date)) % MILLISECONDS_IN_MINUTE : getDateMillisecondsPart(date);
      return baseTimezoneOffset * MILLISECONDS_IN_MINUTE + millisecondsPartOfTimezoneOffset;
    }

    /**
     * @name startOfDay
     * @category Day Helpers
     * @summary Return the start of a day for the given date.
     *
     * @description
     * Return the start of a day for the given date.
     * The result will be in the local timezone.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the original date
     * @returns {Date} the start of a day
     * @throws {TypeError} 1 argument required
     *
     * @example
     * // The start of a day for 2 September 2014 11:55:00:
     * const result = startOfDay(new Date(2014, 8, 2, 11, 55, 0))
     * //=> Tue Sep 02 2014 00:00:00
     */

    function startOfDay(dirtyDate) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      date.setHours(0, 0, 0, 0);
      return date;
    }

    var formatDistanceLocale = {
      lessThanXSeconds: {
        one: 'less than a second',
        other: 'less than {{count}} seconds'
      },
      xSeconds: {
        one: '1 second',
        other: '{{count}} seconds'
      },
      halfAMinute: 'half a minute',
      lessThanXMinutes: {
        one: 'less than a minute',
        other: 'less than {{count}} minutes'
      },
      xMinutes: {
        one: '1 minute',
        other: '{{count}} minutes'
      },
      aboutXHours: {
        one: 'about 1 hour',
        other: 'about {{count}} hours'
      },
      xHours: {
        one: '1 hour',
        other: '{{count}} hours'
      },
      xDays: {
        one: '1 day',
        other: '{{count}} days'
      },
      aboutXWeeks: {
        one: 'about 1 week',
        other: 'about {{count}} weeks'
      },
      xWeeks: {
        one: '1 week',
        other: '{{count}} weeks'
      },
      aboutXMonths: {
        one: 'about 1 month',
        other: 'about {{count}} months'
      },
      xMonths: {
        one: '1 month',
        other: '{{count}} months'
      },
      aboutXYears: {
        one: 'about 1 year',
        other: 'about {{count}} years'
      },
      xYears: {
        one: '1 year',
        other: '{{count}} years'
      },
      overXYears: {
        one: 'over 1 year',
        other: 'over {{count}} years'
      },
      almostXYears: {
        one: 'almost 1 year',
        other: 'almost {{count}} years'
      }
    };
    function formatDistance(token, count, options) {
      options = options || {};
      var result;

      if (typeof formatDistanceLocale[token] === 'string') {
        result = formatDistanceLocale[token];
      } else if (count === 1) {
        result = formatDistanceLocale[token].one;
      } else {
        result = formatDistanceLocale[token].other.replace('{{count}}', count);
      }

      if (options.addSuffix) {
        if (options.comparison > 0) {
          return 'in ' + result;
        } else {
          return result + ' ago';
        }
      }

      return result;
    }

    function buildFormatLongFn(args) {
      return function (dirtyOptions) {
        var options = dirtyOptions || {};
        var width = options.width ? String(options.width) : args.defaultWidth;
        var format = args.formats[width] || args.formats[args.defaultWidth];
        return format;
      };
    }

    var dateFormats = {
      full: 'EEEE, MMMM do, y',
      long: 'MMMM do, y',
      medium: 'MMM d, y',
      short: 'MM/dd/yyyy'
    };
    var timeFormats = {
      full: 'h:mm:ss a zzzz',
      long: 'h:mm:ss a z',
      medium: 'h:mm:ss a',
      short: 'h:mm a'
    };
    var dateTimeFormats = {
      full: "{{date}} 'at' {{time}}",
      long: "{{date}} 'at' {{time}}",
      medium: '{{date}}, {{time}}',
      short: '{{date}}, {{time}}'
    };
    var formatLong = {
      date: buildFormatLongFn({
        formats: dateFormats,
        defaultWidth: 'full'
      }),
      time: buildFormatLongFn({
        formats: timeFormats,
        defaultWidth: 'full'
      }),
      dateTime: buildFormatLongFn({
        formats: dateTimeFormats,
        defaultWidth: 'full'
      })
    };

    var formatRelativeLocale = {
      lastWeek: "'last' eeee 'at' p",
      yesterday: "'yesterday at' p",
      today: "'today at' p",
      tomorrow: "'tomorrow at' p",
      nextWeek: "eeee 'at' p",
      other: 'P'
    };
    function formatRelative(token, _date, _baseDate, _options) {
      return formatRelativeLocale[token];
    }

    function buildLocalizeFn(args) {
      return function (dirtyIndex, dirtyOptions) {
        var options = dirtyOptions || {};
        var context = options.context ? String(options.context) : 'standalone';
        var valuesArray;

        if (context === 'formatting' && args.formattingValues) {
          var defaultWidth = args.defaultFormattingWidth || args.defaultWidth;
          var width = options.width ? String(options.width) : defaultWidth;
          valuesArray = args.formattingValues[width] || args.formattingValues[defaultWidth];
        } else {
          var _defaultWidth = args.defaultWidth;

          var _width = options.width ? String(options.width) : args.defaultWidth;

          valuesArray = args.values[_width] || args.values[_defaultWidth];
        }

        var index = args.argumentCallback ? args.argumentCallback(dirtyIndex) : dirtyIndex;
        return valuesArray[index];
      };
    }

    var eraValues = {
      narrow: ['B', 'A'],
      abbreviated: ['BC', 'AD'],
      wide: ['Before Christ', 'Anno Domini']
    };
    var quarterValues = {
      narrow: ['1', '2', '3', '4'],
      abbreviated: ['Q1', 'Q2', 'Q3', 'Q4'],
      wide: ['1st quarter', '2nd quarter', '3rd quarter', '4th quarter'] // Note: in English, the names of days of the week and months are capitalized.
      // If you are making a new locale based on this one, check if the same is true for the language you're working on.
      // Generally, formatted dates should look like they are in the middle of a sentence,
      // e.g. in Spanish language the weekdays and months should be in the lowercase.

    };
    var monthValues = {
      narrow: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
      abbreviated: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      wide: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    };
    var dayValues = {
      narrow: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
      short: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
      abbreviated: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      wide: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    };
    var dayPeriodValues = {
      narrow: {
        am: 'a',
        pm: 'p',
        midnight: 'mi',
        noon: 'n',
        morning: 'morning',
        afternoon: 'afternoon',
        evening: 'evening',
        night: 'night'
      },
      abbreviated: {
        am: 'AM',
        pm: 'PM',
        midnight: 'midnight',
        noon: 'noon',
        morning: 'morning',
        afternoon: 'afternoon',
        evening: 'evening',
        night: 'night'
      },
      wide: {
        am: 'a.m.',
        pm: 'p.m.',
        midnight: 'midnight',
        noon: 'noon',
        morning: 'morning',
        afternoon: 'afternoon',
        evening: 'evening',
        night: 'night'
      }
    };
    var formattingDayPeriodValues = {
      narrow: {
        am: 'a',
        pm: 'p',
        midnight: 'mi',
        noon: 'n',
        morning: 'in the morning',
        afternoon: 'in the afternoon',
        evening: 'in the evening',
        night: 'at night'
      },
      abbreviated: {
        am: 'AM',
        pm: 'PM',
        midnight: 'midnight',
        noon: 'noon',
        morning: 'in the morning',
        afternoon: 'in the afternoon',
        evening: 'in the evening',
        night: 'at night'
      },
      wide: {
        am: 'a.m.',
        pm: 'p.m.',
        midnight: 'midnight',
        noon: 'noon',
        morning: 'in the morning',
        afternoon: 'in the afternoon',
        evening: 'in the evening',
        night: 'at night'
      }
    };

    function ordinalNumber(dirtyNumber, _dirtyOptions) {
      var number = Number(dirtyNumber); // If ordinal numbers depend on context, for example,
      // if they are different for different grammatical genders,
      // use `options.unit`:
      //
      //   var options = dirtyOptions || {}
      //   var unit = String(options.unit)
      //
      // where `unit` can be 'year', 'quarter', 'month', 'week', 'date', 'dayOfYear',
      // 'day', 'hour', 'minute', 'second'

      var rem100 = number % 100;

      if (rem100 > 20 || rem100 < 10) {
        switch (rem100 % 10) {
          case 1:
            return number + 'st';

          case 2:
            return number + 'nd';

          case 3:
            return number + 'rd';
        }
      }

      return number + 'th';
    }

    var localize = {
      ordinalNumber: ordinalNumber,
      era: buildLocalizeFn({
        values: eraValues,
        defaultWidth: 'wide'
      }),
      quarter: buildLocalizeFn({
        values: quarterValues,
        defaultWidth: 'wide',
        argumentCallback: function (quarter) {
          return Number(quarter) - 1;
        }
      }),
      month: buildLocalizeFn({
        values: monthValues,
        defaultWidth: 'wide'
      }),
      day: buildLocalizeFn({
        values: dayValues,
        defaultWidth: 'wide'
      }),
      dayPeriod: buildLocalizeFn({
        values: dayPeriodValues,
        defaultWidth: 'wide',
        formattingValues: formattingDayPeriodValues,
        defaultFormattingWidth: 'wide'
      })
    };

    function buildMatchPatternFn(args) {
      return function (dirtyString, dirtyOptions) {
        var string = String(dirtyString);
        var options = dirtyOptions || {};
        var matchResult = string.match(args.matchPattern);

        if (!matchResult) {
          return null;
        }

        var matchedString = matchResult[0];
        var parseResult = string.match(args.parsePattern);

        if (!parseResult) {
          return null;
        }

        var value = args.valueCallback ? args.valueCallback(parseResult[0]) : parseResult[0];
        value = options.valueCallback ? options.valueCallback(value) : value;
        return {
          value: value,
          rest: string.slice(matchedString.length)
        };
      };
    }

    function buildMatchFn(args) {
      return function (dirtyString, dirtyOptions) {
        var string = String(dirtyString);
        var options = dirtyOptions || {};
        var width = options.width;
        var matchPattern = width && args.matchPatterns[width] || args.matchPatterns[args.defaultMatchWidth];
        var matchResult = string.match(matchPattern);

        if (!matchResult) {
          return null;
        }

        var matchedString = matchResult[0];
        var parsePatterns = width && args.parsePatterns[width] || args.parsePatterns[args.defaultParseWidth];
        var value;

        if (Object.prototype.toString.call(parsePatterns) === '[object Array]') {
          value = findIndex$1(parsePatterns, function (pattern) {
            return pattern.test(matchedString);
          });
        } else {
          value = findKey(parsePatterns, function (pattern) {
            return pattern.test(matchedString);
          });
        }

        value = args.valueCallback ? args.valueCallback(value) : value;
        value = options.valueCallback ? options.valueCallback(value) : value;
        return {
          value: value,
          rest: string.slice(matchedString.length)
        };
      };
    }

    function findKey(object, predicate) {
      for (var key in object) {
        if (object.hasOwnProperty(key) && predicate(object[key])) {
          return key;
        }
      }
    }

    function findIndex$1(array, predicate) {
      for (var key = 0; key < array.length; key++) {
        if (predicate(array[key])) {
          return key;
        }
      }
    }

    var matchOrdinalNumberPattern = /^(\d+)(th|st|nd|rd)?/i;
    var parseOrdinalNumberPattern = /\d+/i;
    var matchEraPatterns = {
      narrow: /^(b|a)/i,
      abbreviated: /^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,
      wide: /^(before christ|before common era|anno domini|common era)/i
    };
    var parseEraPatterns = {
      any: [/^b/i, /^(a|c)/i]
    };
    var matchQuarterPatterns = {
      narrow: /^[1234]/i,
      abbreviated: /^q[1234]/i,
      wide: /^[1234](th|st|nd|rd)? quarter/i
    };
    var parseQuarterPatterns = {
      any: [/1/i, /2/i, /3/i, /4/i]
    };
    var matchMonthPatterns = {
      narrow: /^[jfmasond]/i,
      abbreviated: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
      wide: /^(january|february|march|april|may|june|july|august|september|october|november|december)/i
    };
    var parseMonthPatterns = {
      narrow: [/^j/i, /^f/i, /^m/i, /^a/i, /^m/i, /^j/i, /^j/i, /^a/i, /^s/i, /^o/i, /^n/i, /^d/i],
      any: [/^ja/i, /^f/i, /^mar/i, /^ap/i, /^may/i, /^jun/i, /^jul/i, /^au/i, /^s/i, /^o/i, /^n/i, /^d/i]
    };
    var matchDayPatterns = {
      narrow: /^[smtwf]/i,
      short: /^(su|mo|tu|we|th|fr|sa)/i,
      abbreviated: /^(sun|mon|tue|wed|thu|fri|sat)/i,
      wide: /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i
    };
    var parseDayPatterns = {
      narrow: [/^s/i, /^m/i, /^t/i, /^w/i, /^t/i, /^f/i, /^s/i],
      any: [/^su/i, /^m/i, /^tu/i, /^w/i, /^th/i, /^f/i, /^sa/i]
    };
    var matchDayPeriodPatterns = {
      narrow: /^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,
      any: /^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i
    };
    var parseDayPeriodPatterns = {
      any: {
        am: /^a/i,
        pm: /^p/i,
        midnight: /^mi/i,
        noon: /^no/i,
        morning: /morning/i,
        afternoon: /afternoon/i,
        evening: /evening/i,
        night: /night/i
      }
    };
    var match$1 = {
      ordinalNumber: buildMatchPatternFn({
        matchPattern: matchOrdinalNumberPattern,
        parsePattern: parseOrdinalNumberPattern,
        valueCallback: function (value) {
          return parseInt(value, 10);
        }
      }),
      era: buildMatchFn({
        matchPatterns: matchEraPatterns,
        defaultMatchWidth: 'wide',
        parsePatterns: parseEraPatterns,
        defaultParseWidth: 'any'
      }),
      quarter: buildMatchFn({
        matchPatterns: matchQuarterPatterns,
        defaultMatchWidth: 'wide',
        parsePatterns: parseQuarterPatterns,
        defaultParseWidth: 'any',
        valueCallback: function (index) {
          return index + 1;
        }
      }),
      month: buildMatchFn({
        matchPatterns: matchMonthPatterns,
        defaultMatchWidth: 'wide',
        parsePatterns: parseMonthPatterns,
        defaultParseWidth: 'any'
      }),
      day: buildMatchFn({
        matchPatterns: matchDayPatterns,
        defaultMatchWidth: 'wide',
        parsePatterns: parseDayPatterns,
        defaultParseWidth: 'any'
      }),
      dayPeriod: buildMatchFn({
        matchPatterns: matchDayPeriodPatterns,
        defaultMatchWidth: 'any',
        parsePatterns: parseDayPeriodPatterns,
        defaultParseWidth: 'any'
      })
    };

    /**
     * @type {Locale}
     * @category Locales
     * @summary English locale (United States).
     * @language English
     * @iso-639-2 eng
     * @author Sasha Koss [@kossnocorp]{@link https://github.com/kossnocorp}
     * @author Lesha Koss [@leshakoss]{@link https://github.com/leshakoss}
     */

    var locale = {
      code: 'en-US',
      formatDistance: formatDistance,
      formatLong: formatLong,
      formatRelative: formatRelative,
      localize: localize,
      match: match$1,
      options: {
        weekStartsOn: 0
        /* Sunday */
        ,
        firstWeekContainsDate: 1
      }
    };

    /**
     * @name subMilliseconds
     * @category Millisecond Helpers
     * @summary Subtract the specified number of milliseconds from the given date.
     *
     * @description
     * Subtract the specified number of milliseconds from the given date.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the date to be changed
     * @param {Number} amount - the amount of milliseconds to be subtracted. Positive decimals will be rounded using `Math.floor`, decimals less than zero will be rounded using `Math.ceil`.
     * @returns {Date} the new date with the milliseconds subtracted
     * @throws {TypeError} 2 arguments required
     *
     * @example
     * // Subtract 750 milliseconds from 10 July 2014 12:45:30.000:
     * const result = subMilliseconds(new Date(2014, 6, 10, 12, 45, 30, 0), 750)
     * //=> Thu Jul 10 2014 12:45:29.250
     */

    function subMilliseconds(dirtyDate, dirtyAmount) {
      requiredArgs(2, arguments);
      var amount = toInteger(dirtyAmount);
      return addMilliseconds(dirtyDate, -amount);
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function startOfUTCISOWeek(dirtyDate) {
      requiredArgs(1, arguments);
      var weekStartsOn = 1;
      var date = toDate(dirtyDate);
      var day = date.getUTCDay();
      var diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
      date.setUTCDate(date.getUTCDate() - diff);
      date.setUTCHours(0, 0, 0, 0);
      return date;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCISOWeekYear(dirtyDate) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      var year = date.getUTCFullYear();
      var fourthOfJanuaryOfNextYear = new Date(0);
      fourthOfJanuaryOfNextYear.setUTCFullYear(year + 1, 0, 4);
      fourthOfJanuaryOfNextYear.setUTCHours(0, 0, 0, 0);
      var startOfNextYear = startOfUTCISOWeek(fourthOfJanuaryOfNextYear);
      var fourthOfJanuaryOfThisYear = new Date(0);
      fourthOfJanuaryOfThisYear.setUTCFullYear(year, 0, 4);
      fourthOfJanuaryOfThisYear.setUTCHours(0, 0, 0, 0);
      var startOfThisYear = startOfUTCISOWeek(fourthOfJanuaryOfThisYear);

      if (date.getTime() >= startOfNextYear.getTime()) {
        return year + 1;
      } else if (date.getTime() >= startOfThisYear.getTime()) {
        return year;
      } else {
        return year - 1;
      }
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function startOfUTCISOWeekYear(dirtyDate) {
      requiredArgs(1, arguments);
      var year = getUTCISOWeekYear(dirtyDate);
      var fourthOfJanuary = new Date(0);
      fourthOfJanuary.setUTCFullYear(year, 0, 4);
      fourthOfJanuary.setUTCHours(0, 0, 0, 0);
      var date = startOfUTCISOWeek(fourthOfJanuary);
      return date;
    }

    var MILLISECONDS_IN_WEEK = 604800000; // This function will be a part of public API when UTC function will be implemented.
    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCISOWeek(dirtyDate) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      var diff = startOfUTCISOWeek(date).getTime() - startOfUTCISOWeekYear(date).getTime(); // Round the number of days to the nearest integer
      // because the number of milliseconds in a week is not constant
      // (e.g. it's different in the week of the daylight saving time clock shift)

      return Math.round(diff / MILLISECONDS_IN_WEEK) + 1;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function startOfUTCWeek(dirtyDate, dirtyOptions) {
      requiredArgs(1, arguments);
      var options = dirtyOptions || {};
      var locale = options.locale;
      var localeWeekStartsOn = locale && locale.options && locale.options.weekStartsOn;
      var defaultWeekStartsOn = localeWeekStartsOn == null ? 0 : toInteger(localeWeekStartsOn);
      var weekStartsOn = options.weekStartsOn == null ? defaultWeekStartsOn : toInteger(options.weekStartsOn); // Test if weekStartsOn is between 0 and 6 _and_ is not NaN

      if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
        throw new RangeError('weekStartsOn must be between 0 and 6 inclusively');
      }

      var date = toDate(dirtyDate);
      var day = date.getUTCDay();
      var diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
      date.setUTCDate(date.getUTCDate() - diff);
      date.setUTCHours(0, 0, 0, 0);
      return date;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCWeekYear(dirtyDate, dirtyOptions) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate, dirtyOptions);
      var year = date.getUTCFullYear();
      var options = dirtyOptions || {};
      var locale = options.locale;
      var localeFirstWeekContainsDate = locale && locale.options && locale.options.firstWeekContainsDate;
      var defaultFirstWeekContainsDate = localeFirstWeekContainsDate == null ? 1 : toInteger(localeFirstWeekContainsDate);
      var firstWeekContainsDate = options.firstWeekContainsDate == null ? defaultFirstWeekContainsDate : toInteger(options.firstWeekContainsDate); // Test if weekStartsOn is between 1 and 7 _and_ is not NaN

      if (!(firstWeekContainsDate >= 1 && firstWeekContainsDate <= 7)) {
        throw new RangeError('firstWeekContainsDate must be between 1 and 7 inclusively');
      }

      var firstWeekOfNextYear = new Date(0);
      firstWeekOfNextYear.setUTCFullYear(year + 1, 0, firstWeekContainsDate);
      firstWeekOfNextYear.setUTCHours(0, 0, 0, 0);
      var startOfNextYear = startOfUTCWeek(firstWeekOfNextYear, dirtyOptions);
      var firstWeekOfThisYear = new Date(0);
      firstWeekOfThisYear.setUTCFullYear(year, 0, firstWeekContainsDate);
      firstWeekOfThisYear.setUTCHours(0, 0, 0, 0);
      var startOfThisYear = startOfUTCWeek(firstWeekOfThisYear, dirtyOptions);

      if (date.getTime() >= startOfNextYear.getTime()) {
        return year + 1;
      } else if (date.getTime() >= startOfThisYear.getTime()) {
        return year;
      } else {
        return year - 1;
      }
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function startOfUTCWeekYear(dirtyDate, dirtyOptions) {
      requiredArgs(1, arguments);
      var options = dirtyOptions || {};
      var locale = options.locale;
      var localeFirstWeekContainsDate = locale && locale.options && locale.options.firstWeekContainsDate;
      var defaultFirstWeekContainsDate = localeFirstWeekContainsDate == null ? 1 : toInteger(localeFirstWeekContainsDate);
      var firstWeekContainsDate = options.firstWeekContainsDate == null ? defaultFirstWeekContainsDate : toInteger(options.firstWeekContainsDate);
      var year = getUTCWeekYear(dirtyDate, dirtyOptions);
      var firstWeek = new Date(0);
      firstWeek.setUTCFullYear(year, 0, firstWeekContainsDate);
      firstWeek.setUTCHours(0, 0, 0, 0);
      var date = startOfUTCWeek(firstWeek, dirtyOptions);
      return date;
    }

    var MILLISECONDS_IN_WEEK$1 = 604800000; // This function will be a part of public API when UTC function will be implemented.
    // See issue: https://github.com/date-fns/date-fns/issues/376

    function getUTCWeek(dirtyDate, options) {
      requiredArgs(1, arguments);
      var date = toDate(dirtyDate);
      var diff = startOfUTCWeek(date, options).getTime() - startOfUTCWeekYear(date, options).getTime(); // Round the number of days to the nearest integer
      // because the number of milliseconds in a week is not constant
      // (e.g. it's different in the week of the daylight saving time clock shift)

      return Math.round(diff / MILLISECONDS_IN_WEEK$1) + 1;
    }

    function dateLongFormatter(pattern, formatLong) {
      switch (pattern) {
        case 'P':
          return formatLong.date({
            width: 'short'
          });

        case 'PP':
          return formatLong.date({
            width: 'medium'
          });

        case 'PPP':
          return formatLong.date({
            width: 'long'
          });

        case 'PPPP':
        default:
          return formatLong.date({
            width: 'full'
          });
      }
    }

    function timeLongFormatter(pattern, formatLong) {
      switch (pattern) {
        case 'p':
          return formatLong.time({
            width: 'short'
          });

        case 'pp':
          return formatLong.time({
            width: 'medium'
          });

        case 'ppp':
          return formatLong.time({
            width: 'long'
          });

        case 'pppp':
        default:
          return formatLong.time({
            width: 'full'
          });
      }
    }

    function dateTimeLongFormatter(pattern, formatLong) {
      var matchResult = pattern.match(/(P+)(p+)?/);
      var datePattern = matchResult[1];
      var timePattern = matchResult[2];

      if (!timePattern) {
        return dateLongFormatter(pattern, formatLong);
      }

      var dateTimeFormat;

      switch (datePattern) {
        case 'P':
          dateTimeFormat = formatLong.dateTime({
            width: 'short'
          });
          break;

        case 'PP':
          dateTimeFormat = formatLong.dateTime({
            width: 'medium'
          });
          break;

        case 'PPP':
          dateTimeFormat = formatLong.dateTime({
            width: 'long'
          });
          break;

        case 'PPPP':
        default:
          dateTimeFormat = formatLong.dateTime({
            width: 'full'
          });
          break;
      }

      return dateTimeFormat.replace('{{date}}', dateLongFormatter(datePattern, formatLong)).replace('{{time}}', timeLongFormatter(timePattern, formatLong));
    }

    var longFormatters = {
      p: timeLongFormatter,
      P: dateTimeLongFormatter
    };

    var protectedDayOfYearTokens = ['D', 'DD'];
    var protectedWeekYearTokens = ['YY', 'YYYY'];
    function isProtectedDayOfYearToken(token) {
      return protectedDayOfYearTokens.indexOf(token) !== -1;
    }
    function isProtectedWeekYearToken(token) {
      return protectedWeekYearTokens.indexOf(token) !== -1;
    }
    function throwProtectedError(token, format, input) {
      if (token === 'YYYY') {
        throw new RangeError("Use `yyyy` instead of `YYYY` (in `".concat(format, "`) for formatting years to the input `").concat(input, "`; see: https://git.io/fxCyr"));
      } else if (token === 'YY') {
        throw new RangeError("Use `yy` instead of `YY` (in `".concat(format, "`) for formatting years to the input `").concat(input, "`; see: https://git.io/fxCyr"));
      } else if (token === 'D') {
        throw new RangeError("Use `d` instead of `D` (in `".concat(format, "`) for formatting days of the month to the input `").concat(input, "`; see: https://git.io/fxCyr"));
      } else if (token === 'DD') {
        throw new RangeError("Use `dd` instead of `DD` (in `".concat(format, "`) for formatting days of the month to the input `").concat(input, "`; see: https://git.io/fxCyr"));
      }
    }

    function assign(target, dirtyObject) {
      if (target == null) {
        throw new TypeError('assign requires that input parameter not be null or undefined');
      }

      dirtyObject = dirtyObject || {};

      for (var property in dirtyObject) {
        if (dirtyObject.hasOwnProperty(property)) {
          target[property] = dirtyObject[property];
        }
      }

      return target;
    }

    /**
     * @name isBefore
     * @category Common Helpers
     * @summary Is the first date before the second one?
     *
     * @description
     * Is the first date before the second one?
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @param {Date|Number} date - the date that should be before the other one to return true
     * @param {Date|Number} dateToCompare - the date to compare with
     * @returns {Boolean} the first date is before the second date
     * @throws {TypeError} 2 arguments required
     *
     * @example
     * // Is 10 July 1989 before 11 February 1987?
     * var result = isBefore(new Date(1989, 6, 10), new Date(1987, 1, 11))
     * //=> false
     */

    function isBefore(dirtyDate, dirtyDateToCompare) {
      requiredArgs(2, arguments);
      var date = toDate(dirtyDate);
      var dateToCompare = toDate(dirtyDateToCompare);
      return date.getTime() < dateToCompare.getTime();
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function setUTCDay(dirtyDate, dirtyDay, dirtyOptions) {
      requiredArgs(2, arguments);
      var options = dirtyOptions || {};
      var locale = options.locale;
      var localeWeekStartsOn = locale && locale.options && locale.options.weekStartsOn;
      var defaultWeekStartsOn = localeWeekStartsOn == null ? 0 : toInteger(localeWeekStartsOn);
      var weekStartsOn = options.weekStartsOn == null ? defaultWeekStartsOn : toInteger(options.weekStartsOn); // Test if weekStartsOn is between 0 and 6 _and_ is not NaN

      if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
        throw new RangeError('weekStartsOn must be between 0 and 6 inclusively');
      }

      var date = toDate(dirtyDate);
      var day = toInteger(dirtyDay);
      var currentDay = date.getUTCDay();
      var remainder = day % 7;
      var dayIndex = (remainder + 7) % 7;
      var diff = (dayIndex < weekStartsOn ? 7 : 0) + day - currentDay;
      date.setUTCDate(date.getUTCDate() + diff);
      return date;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function setUTCISODay(dirtyDate, dirtyDay) {
      requiredArgs(2, arguments);
      var day = toInteger(dirtyDay);

      if (day % 7 === 0) {
        day = day - 7;
      }

      var weekStartsOn = 1;
      var date = toDate(dirtyDate);
      var currentDay = date.getUTCDay();
      var remainder = day % 7;
      var dayIndex = (remainder + 7) % 7;
      var diff = (dayIndex < weekStartsOn ? 7 : 0) + day - currentDay;
      date.setUTCDate(date.getUTCDate() + diff);
      return date;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function setUTCISOWeek(dirtyDate, dirtyISOWeek) {
      requiredArgs(2, arguments);
      var date = toDate(dirtyDate);
      var isoWeek = toInteger(dirtyISOWeek);
      var diff = getUTCISOWeek(date) - isoWeek;
      date.setUTCDate(date.getUTCDate() - diff * 7);
      return date;
    }

    // See issue: https://github.com/date-fns/date-fns/issues/376

    function setUTCWeek(dirtyDate, dirtyWeek, options) {
      requiredArgs(2, arguments);
      var date = toDate(dirtyDate);
      var week = toInteger(dirtyWeek);
      var diff = getUTCWeek(date, options) - week;
      date.setUTCDate(date.getUTCDate() - diff * 7);
      return date;
    }

    var MILLISECONDS_IN_HOUR = 3600000;
    var MILLISECONDS_IN_MINUTE$1 = 60000;
    var MILLISECONDS_IN_SECOND = 1000;
    var numericPatterns = {
      month: /^(1[0-2]|0?\d)/,
      // 0 to 12
      date: /^(3[0-1]|[0-2]?\d)/,
      // 0 to 31
      dayOfYear: /^(36[0-6]|3[0-5]\d|[0-2]?\d?\d)/,
      // 0 to 366
      week: /^(5[0-3]|[0-4]?\d)/,
      // 0 to 53
      hour23h: /^(2[0-3]|[0-1]?\d)/,
      // 0 to 23
      hour24h: /^(2[0-4]|[0-1]?\d)/,
      // 0 to 24
      hour11h: /^(1[0-1]|0?\d)/,
      // 0 to 11
      hour12h: /^(1[0-2]|0?\d)/,
      // 0 to 12
      minute: /^[0-5]?\d/,
      // 0 to 59
      second: /^[0-5]?\d/,
      // 0 to 59
      singleDigit: /^\d/,
      // 0 to 9
      twoDigits: /^\d{1,2}/,
      // 0 to 99
      threeDigits: /^\d{1,3}/,
      // 0 to 999
      fourDigits: /^\d{1,4}/,
      // 0 to 9999
      anyDigitsSigned: /^-?\d+/,
      singleDigitSigned: /^-?\d/,
      // 0 to 9, -0 to -9
      twoDigitsSigned: /^-?\d{1,2}/,
      // 0 to 99, -0 to -99
      threeDigitsSigned: /^-?\d{1,3}/,
      // 0 to 999, -0 to -999
      fourDigitsSigned: /^-?\d{1,4}/ // 0 to 9999, -0 to -9999

    };
    var timezonePatterns = {
      basicOptionalMinutes: /^([+-])(\d{2})(\d{2})?|Z/,
      basic: /^([+-])(\d{2})(\d{2})|Z/,
      basicOptionalSeconds: /^([+-])(\d{2})(\d{2})((\d{2}))?|Z/,
      extended: /^([+-])(\d{2}):(\d{2})|Z/,
      extendedOptionalSeconds: /^([+-])(\d{2}):(\d{2})(:(\d{2}))?|Z/
    };

    function parseNumericPattern(pattern, string, valueCallback) {
      var matchResult = string.match(pattern);

      if (!matchResult) {
        return null;
      }

      var value = parseInt(matchResult[0], 10);
      return {
        value: valueCallback ? valueCallback(value) : value,
        rest: string.slice(matchResult[0].length)
      };
    }

    function parseTimezonePattern(pattern, string) {
      var matchResult = string.match(pattern);

      if (!matchResult) {
        return null;
      } // Input is 'Z'


      if (matchResult[0] === 'Z') {
        return {
          value: 0,
          rest: string.slice(1)
        };
      }

      var sign = matchResult[1] === '+' ? 1 : -1;
      var hours = matchResult[2] ? parseInt(matchResult[2], 10) : 0;
      var minutes = matchResult[3] ? parseInt(matchResult[3], 10) : 0;
      var seconds = matchResult[5] ? parseInt(matchResult[5], 10) : 0;
      return {
        value: sign * (hours * MILLISECONDS_IN_HOUR + minutes * MILLISECONDS_IN_MINUTE$1 + seconds * MILLISECONDS_IN_SECOND),
        rest: string.slice(matchResult[0].length)
      };
    }

    function parseAnyDigitsSigned(string, valueCallback) {
      return parseNumericPattern(numericPatterns.anyDigitsSigned, string, valueCallback);
    }

    function parseNDigits(n, string, valueCallback) {
      switch (n) {
        case 1:
          return parseNumericPattern(numericPatterns.singleDigit, string, valueCallback);

        case 2:
          return parseNumericPattern(numericPatterns.twoDigits, string, valueCallback);

        case 3:
          return parseNumericPattern(numericPatterns.threeDigits, string, valueCallback);

        case 4:
          return parseNumericPattern(numericPatterns.fourDigits, string, valueCallback);

        default:
          return parseNumericPattern(new RegExp('^\\d{1,' + n + '}'), string, valueCallback);
      }
    }

    function parseNDigitsSigned(n, string, valueCallback) {
      switch (n) {
        case 1:
          return parseNumericPattern(numericPatterns.singleDigitSigned, string, valueCallback);

        case 2:
          return parseNumericPattern(numericPatterns.twoDigitsSigned, string, valueCallback);

        case 3:
          return parseNumericPattern(numericPatterns.threeDigitsSigned, string, valueCallback);

        case 4:
          return parseNumericPattern(numericPatterns.fourDigitsSigned, string, valueCallback);

        default:
          return parseNumericPattern(new RegExp('^-?\\d{1,' + n + '}'), string, valueCallback);
      }
    }

    function dayPeriodEnumToHours(enumValue) {
      switch (enumValue) {
        case 'morning':
          return 4;

        case 'evening':
          return 17;

        case 'pm':
        case 'noon':
        case 'afternoon':
          return 12;

        case 'am':
        case 'midnight':
        case 'night':
        default:
          return 0;
      }
    }

    function normalizeTwoDigitYear(twoDigitYear, currentYear) {
      var isCommonEra = currentYear > 0; // Absolute number of the current year:
      // 1 -> 1 AC
      // 0 -> 1 BC
      // -1 -> 2 BC

      var absCurrentYear = isCommonEra ? currentYear : 1 - currentYear;
      var result;

      if (absCurrentYear <= 50) {
        result = twoDigitYear || 100;
      } else {
        var rangeEnd = absCurrentYear + 50;
        var rangeEndCentury = Math.floor(rangeEnd / 100) * 100;
        var isPreviousCentury = twoDigitYear >= rangeEnd % 100;
        result = twoDigitYear + rangeEndCentury - (isPreviousCentury ? 100 : 0);
      }

      return isCommonEra ? result : 1 - result;
    }

    var DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var DAYS_IN_MONTH_LEAP_YEAR = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // User for validation

    function isLeapYearIndex(year) {
      return year % 400 === 0 || year % 4 === 0 && year % 100 !== 0;
    }
    /*
     * |     | Unit                           |     | Unit                           |
     * |-----|--------------------------------|-----|--------------------------------|
     * |  a  | AM, PM                         |  A* | Milliseconds in day            |
     * |  b  | AM, PM, noon, midnight         |  B  | Flexible day period            |
     * |  c  | Stand-alone local day of week  |  C* | Localized hour w/ day period   |
     * |  d  | Day of month                   |  D  | Day of year                    |
     * |  e  | Local day of week              |  E  | Day of week                    |
     * |  f  |                                |  F* | Day of week in month           |
     * |  g* | Modified Julian day            |  G  | Era                            |
     * |  h  | Hour [1-12]                    |  H  | Hour [0-23]                    |
     * |  i! | ISO day of week                |  I! | ISO week of year               |
     * |  j* | Localized hour w/ day period   |  J* | Localized hour w/o day period  |
     * |  k  | Hour [1-24]                    |  K  | Hour [0-11]                    |
     * |  l* | (deprecated)                   |  L  | Stand-alone month              |
     * |  m  | Minute                         |  M  | Month                          |
     * |  n  |                                |  N  |                                |
     * |  o! | Ordinal number modifier        |  O* | Timezone (GMT)                 |
     * |  p  |                                |  P  |                                |
     * |  q  | Stand-alone quarter            |  Q  | Quarter                        |
     * |  r* | Related Gregorian year         |  R! | ISO week-numbering year        |
     * |  s  | Second                         |  S  | Fraction of second             |
     * |  t! | Seconds timestamp              |  T! | Milliseconds timestamp         |
     * |  u  | Extended year                  |  U* | Cyclic year                    |
     * |  v* | Timezone (generic non-locat.)  |  V* | Timezone (location)            |
     * |  w  | Local week of year             |  W* | Week of month                  |
     * |  x  | Timezone (ISO-8601 w/o Z)      |  X  | Timezone (ISO-8601)            |
     * |  y  | Year (abs)                     |  Y  | Local week-numbering year      |
     * |  z* | Timezone (specific non-locat.) |  Z* | Timezone (aliases)             |
     *
     * Letters marked by * are not implemented but reserved by Unicode standard.
     *
     * Letters marked by ! are non-standard, but implemented by date-fns:
     * - `o` modifies the previous token to turn it into an ordinal (see `parse` docs)
     * - `i` is ISO day of week. For `i` and `ii` is returns numeric ISO week days,
     *   i.e. 7 for Sunday, 1 for Monday, etc.
     * - `I` is ISO week of year, as opposed to `w` which is local week of year.
     * - `R` is ISO week-numbering year, as opposed to `Y` which is local week-numbering year.
     *   `R` is supposed to be used in conjunction with `I` and `i`
     *   for universal ISO week-numbering date, whereas
     *   `Y` is supposed to be used in conjunction with `w` and `e`
     *   for week-numbering date specific to the locale.
     */


    var parsers = {
      // Era
      G: {
        priority: 140,
        parse: function (string, token, match, _options) {
          switch (token) {
            // AD, BC
            case 'G':
            case 'GG':
            case 'GGG':
              return match.era(string, {
                width: 'abbreviated'
              }) || match.era(string, {
                width: 'narrow'
              });
            // A, B

            case 'GGGGG':
              return match.era(string, {
                width: 'narrow'
              });
            // Anno Domini, Before Christ

            case 'GGGG':
            default:
              return match.era(string, {
                width: 'wide'
              }) || match.era(string, {
                width: 'abbreviated'
              }) || match.era(string, {
                width: 'narrow'
              });
          }
        },
        set: function (date, flags, value, _options) {
          flags.era = value;
          date.setUTCFullYear(value, 0, 1);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['R', 'u', 't', 'T']
      },
      // Year
      y: {
        // From http://www.unicode.org/reports/tr35/tr35-31/tr35-dates.html#Date_Format_Patterns
        // | Year     |     y | yy |   yyy |  yyyy | yyyyy |
        // |----------|-------|----|-------|-------|-------|
        // | AD 1     |     1 | 01 |   001 |  0001 | 00001 |
        // | AD 12    |    12 | 12 |   012 |  0012 | 00012 |
        // | AD 123   |   123 | 23 |   123 |  0123 | 00123 |
        // | AD 1234  |  1234 | 34 |  1234 |  1234 | 01234 |
        // | AD 12345 | 12345 | 45 | 12345 | 12345 | 12345 |
        priority: 130,
        parse: function (string, token, match, _options) {
          var valueCallback = function (year) {
            return {
              year: year,
              isTwoDigitYear: token === 'yy'
            };
          };

          switch (token) {
            case 'y':
              return parseNDigits(4, string, valueCallback);

            case 'yo':
              return match.ordinalNumber(string, {
                unit: 'year',
                valueCallback: valueCallback
              });

            default:
              return parseNDigits(token.length, string, valueCallback);
          }
        },
        validate: function (_date, value, _options) {
          return value.isTwoDigitYear || value.year > 0;
        },
        set: function (date, flags, value, _options) {
          var currentYear = date.getUTCFullYear();

          if (value.isTwoDigitYear) {
            var normalizedTwoDigitYear = normalizeTwoDigitYear(value.year, currentYear);
            date.setUTCFullYear(normalizedTwoDigitYear, 0, 1);
            date.setUTCHours(0, 0, 0, 0);
            return date;
          }

          var year = !('era' in flags) || flags.era === 1 ? value.year : 1 - value.year;
          date.setUTCFullYear(year, 0, 1);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['Y', 'R', 'u', 'w', 'I', 'i', 'e', 'c', 't', 'T']
      },
      // Local week-numbering year
      Y: {
        priority: 130,
        parse: function (string, token, match, _options) {
          var valueCallback = function (year) {
            return {
              year: year,
              isTwoDigitYear: token === 'YY'
            };
          };

          switch (token) {
            case 'Y':
              return parseNDigits(4, string, valueCallback);

            case 'Yo':
              return match.ordinalNumber(string, {
                unit: 'year',
                valueCallback: valueCallback
              });

            default:
              return parseNDigits(token.length, string, valueCallback);
          }
        },
        validate: function (_date, value, _options) {
          return value.isTwoDigitYear || value.year > 0;
        },
        set: function (date, flags, value, options) {
          var currentYear = getUTCWeekYear(date, options);

          if (value.isTwoDigitYear) {
            var normalizedTwoDigitYear = normalizeTwoDigitYear(value.year, currentYear);
            date.setUTCFullYear(normalizedTwoDigitYear, 0, options.firstWeekContainsDate);
            date.setUTCHours(0, 0, 0, 0);
            return startOfUTCWeek(date, options);
          }

          var year = !('era' in flags) || flags.era === 1 ? value.year : 1 - value.year;
          date.setUTCFullYear(year, 0, options.firstWeekContainsDate);
          date.setUTCHours(0, 0, 0, 0);
          return startOfUTCWeek(date, options);
        },
        incompatibleTokens: ['y', 'R', 'u', 'Q', 'q', 'M', 'L', 'I', 'd', 'D', 'i', 't', 'T']
      },
      // ISO week-numbering year
      R: {
        priority: 130,
        parse: function (string, token, _match, _options) {
          if (token === 'R') {
            return parseNDigitsSigned(4, string);
          }

          return parseNDigitsSigned(token.length, string);
        },
        set: function (_date, _flags, value, _options) {
          var firstWeekOfYear = new Date(0);
          firstWeekOfYear.setUTCFullYear(value, 0, 4);
          firstWeekOfYear.setUTCHours(0, 0, 0, 0);
          return startOfUTCISOWeek(firstWeekOfYear);
        },
        incompatibleTokens: ['G', 'y', 'Y', 'u', 'Q', 'q', 'M', 'L', 'w', 'd', 'D', 'e', 'c', 't', 'T']
      },
      // Extended year
      u: {
        priority: 130,
        parse: function (string, token, _match, _options) {
          if (token === 'u') {
            return parseNDigitsSigned(4, string);
          }

          return parseNDigitsSigned(token.length, string);
        },
        set: function (date, _flags, value, _options) {
          date.setUTCFullYear(value, 0, 1);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['G', 'y', 'Y', 'R', 'w', 'I', 'i', 'e', 'c', 't', 'T']
      },
      // Quarter
      Q: {
        priority: 120,
        parse: function (string, token, match, _options) {
          switch (token) {
            // 1, 2, 3, 4
            case 'Q':
            case 'QQ':
              // 01, 02, 03, 04
              return parseNDigits(token.length, string);
            // 1st, 2nd, 3rd, 4th

            case 'Qo':
              return match.ordinalNumber(string, {
                unit: 'quarter'
              });
            // Q1, Q2, Q3, Q4

            case 'QQQ':
              return match.quarter(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.quarter(string, {
                width: 'narrow',
                context: 'formatting'
              });
            // 1, 2, 3, 4 (narrow quarter; could be not numerical)

            case 'QQQQQ':
              return match.quarter(string, {
                width: 'narrow',
                context: 'formatting'
              });
            // 1st quarter, 2nd quarter, ...

            case 'QQQQ':
            default:
              return match.quarter(string, {
                width: 'wide',
                context: 'formatting'
              }) || match.quarter(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.quarter(string, {
                width: 'narrow',
                context: 'formatting'
              });
          }
        },
        validate: function (_date, value, _options) {
          return value >= 1 && value <= 4;
        },
        set: function (date, _flags, value, _options) {
          date.setUTCMonth((value - 1) * 3, 1);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['Y', 'R', 'q', 'M', 'L', 'w', 'I', 'd', 'D', 'i', 'e', 'c', 't', 'T']
      },
      // Stand-alone quarter
      q: {
        priority: 120,
        parse: function (string, token, match, _options) {
          switch (token) {
            // 1, 2, 3, 4
            case 'q':
            case 'qq':
              // 01, 02, 03, 04
              return parseNDigits(token.length, string);
            // 1st, 2nd, 3rd, 4th

            case 'qo':
              return match.ordinalNumber(string, {
                unit: 'quarter'
              });
            // Q1, Q2, Q3, Q4

            case 'qqq':
              return match.quarter(string, {
                width: 'abbreviated',
                context: 'standalone'
              }) || match.quarter(string, {
                width: 'narrow',
                context: 'standalone'
              });
            // 1, 2, 3, 4 (narrow quarter; could be not numerical)

            case 'qqqqq':
              return match.quarter(string, {
                width: 'narrow',
                context: 'standalone'
              });
            // 1st quarter, 2nd quarter, ...

            case 'qqqq':
            default:
              return match.quarter(string, {
                width: 'wide',
                context: 'standalone'
              }) || match.quarter(string, {
                width: 'abbreviated',
                context: 'standalone'
              }) || match.quarter(string, {
                width: 'narrow',
                context: 'standalone'
              });
          }
        },
        validate: function (_date, value, _options) {
          return value >= 1 && value <= 4;
        },
        set: function (date, _flags, value, _options) {
          date.setUTCMonth((value - 1) * 3, 1);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['Y', 'R', 'Q', 'M', 'L', 'w', 'I', 'd', 'D', 'i', 'e', 'c', 't', 'T']
      },
      // Month
      M: {
        priority: 110,
        parse: function (string, token, match, _options) {
          var valueCallback = function (value) {
            return value - 1;
          };

          switch (token) {
            // 1, 2, ..., 12
            case 'M':
              return parseNumericPattern(numericPatterns.month, string, valueCallback);
            // 01, 02, ..., 12

            case 'MM':
              return parseNDigits(2, string, valueCallback);
            // 1st, 2nd, ..., 12th

            case 'Mo':
              return match.ordinalNumber(string, {
                unit: 'month',
                valueCallback: valueCallback
              });
            // Jan, Feb, ..., Dec

            case 'MMM':
              return match.month(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.month(string, {
                width: 'narrow',
                context: 'formatting'
              });
            // J, F, ..., D

            case 'MMMMM':
              return match.month(string, {
                width: 'narrow',
                context: 'formatting'
              });
            // January, February, ..., December

            case 'MMMM':
            default:
              return match.month(string, {
                width: 'wide',
                context: 'formatting'
              }) || match.month(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.month(string, {
                width: 'narrow',
                context: 'formatting'
              });
          }
        },
        validate: function (_date, value, _options) {
          return value >= 0 && value <= 11;
        },
        set: function (date, _flags, value, _options) {
          date.setUTCMonth(value, 1);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['Y', 'R', 'q', 'Q', 'L', 'w', 'I', 'D', 'i', 'e', 'c', 't', 'T']
      },
      // Stand-alone month
      L: {
        priority: 110,
        parse: function (string, token, match, _options) {
          var valueCallback = function (value) {
            return value - 1;
          };

          switch (token) {
            // 1, 2, ..., 12
            case 'L':
              return parseNumericPattern(numericPatterns.month, string, valueCallback);
            // 01, 02, ..., 12

            case 'LL':
              return parseNDigits(2, string, valueCallback);
            // 1st, 2nd, ..., 12th

            case 'Lo':
              return match.ordinalNumber(string, {
                unit: 'month',
                valueCallback: valueCallback
              });
            // Jan, Feb, ..., Dec

            case 'LLL':
              return match.month(string, {
                width: 'abbreviated',
                context: 'standalone'
              }) || match.month(string, {
                width: 'narrow',
                context: 'standalone'
              });
            // J, F, ..., D

            case 'LLLLL':
              return match.month(string, {
                width: 'narrow',
                context: 'standalone'
              });
            // January, February, ..., December

            case 'LLLL':
            default:
              return match.month(string, {
                width: 'wide',
                context: 'standalone'
              }) || match.month(string, {
                width: 'abbreviated',
                context: 'standalone'
              }) || match.month(string, {
                width: 'narrow',
                context: 'standalone'
              });
          }
        },
        validate: function (_date, value, _options) {
          return value >= 0 && value <= 11;
        },
        set: function (date, _flags, value, _options) {
          date.setUTCMonth(value, 1);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['Y', 'R', 'q', 'Q', 'M', 'w', 'I', 'D', 'i', 'e', 'c', 't', 'T']
      },
      // Local week of year
      w: {
        priority: 100,
        parse: function (string, token, match, _options) {
          switch (token) {
            case 'w':
              return parseNumericPattern(numericPatterns.week, string);

            case 'wo':
              return match.ordinalNumber(string, {
                unit: 'week'
              });

            default:
              return parseNDigits(token.length, string);
          }
        },
        validate: function (_date, value, _options) {
          return value >= 1 && value <= 53;
        },
        set: function (date, _flags, value, options) {
          return startOfUTCWeek(setUTCWeek(date, value, options), options);
        },
        incompatibleTokens: ['y', 'R', 'u', 'q', 'Q', 'M', 'L', 'I', 'd', 'D', 'i', 't', 'T']
      },
      // ISO week of year
      I: {
        priority: 100,
        parse: function (string, token, match, _options) {
          switch (token) {
            case 'I':
              return parseNumericPattern(numericPatterns.week, string);

            case 'Io':
              return match.ordinalNumber(string, {
                unit: 'week'
              });

            default:
              return parseNDigits(token.length, string);
          }
        },
        validate: function (_date, value, _options) {
          return value >= 1 && value <= 53;
        },
        set: function (date, _flags, value, options) {
          return startOfUTCISOWeek(setUTCISOWeek(date, value, options), options);
        },
        incompatibleTokens: ['y', 'Y', 'u', 'q', 'Q', 'M', 'L', 'w', 'd', 'D', 'e', 'c', 't', 'T']
      },
      // Day of the month
      d: {
        priority: 90,
        subPriority: 1,
        parse: function (string, token, match, _options) {
          switch (token) {
            case 'd':
              return parseNumericPattern(numericPatterns.date, string);

            case 'do':
              return match.ordinalNumber(string, {
                unit: 'date'
              });

            default:
              return parseNDigits(token.length, string);
          }
        },
        validate: function (date, value, _options) {
          var year = date.getUTCFullYear();
          var isLeapYear = isLeapYearIndex(year);
          var month = date.getUTCMonth();

          if (isLeapYear) {
            return value >= 1 && value <= DAYS_IN_MONTH_LEAP_YEAR[month];
          } else {
            return value >= 1 && value <= DAYS_IN_MONTH[month];
          }
        },
        set: function (date, _flags, value, _options) {
          date.setUTCDate(value);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['Y', 'R', 'q', 'Q', 'w', 'I', 'D', 'i', 'e', 'c', 't', 'T']
      },
      // Day of year
      D: {
        priority: 90,
        subPriority: 1,
        parse: function (string, token, match, _options) {
          switch (token) {
            case 'D':
            case 'DD':
              return parseNumericPattern(numericPatterns.dayOfYear, string);

            case 'Do':
              return match.ordinalNumber(string, {
                unit: 'date'
              });

            default:
              return parseNDigits(token.length, string);
          }
        },
        validate: function (date, value, _options) {
          var year = date.getUTCFullYear();
          var isLeapYear = isLeapYearIndex(year);

          if (isLeapYear) {
            return value >= 1 && value <= 366;
          } else {
            return value >= 1 && value <= 365;
          }
        },
        set: function (date, _flags, value, _options) {
          date.setUTCMonth(0, value);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['Y', 'R', 'q', 'Q', 'M', 'L', 'w', 'I', 'd', 'E', 'i', 'e', 'c', 't', 'T']
      },
      // Day of week
      E: {
        priority: 90,
        parse: function (string, token, match, _options) {
          switch (token) {
            // Tue
            case 'E':
            case 'EE':
            case 'EEE':
              return match.day(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.day(string, {
                width: 'short',
                context: 'formatting'
              }) || match.day(string, {
                width: 'narrow',
                context: 'formatting'
              });
            // T

            case 'EEEEE':
              return match.day(string, {
                width: 'narrow',
                context: 'formatting'
              });
            // Tu

            case 'EEEEEE':
              return match.day(string, {
                width: 'short',
                context: 'formatting'
              }) || match.day(string, {
                width: 'narrow',
                context: 'formatting'
              });
            // Tuesday

            case 'EEEE':
            default:
              return match.day(string, {
                width: 'wide',
                context: 'formatting'
              }) || match.day(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.day(string, {
                width: 'short',
                context: 'formatting'
              }) || match.day(string, {
                width: 'narrow',
                context: 'formatting'
              });
          }
        },
        validate: function (_date, value, _options) {
          return value >= 0 && value <= 6;
        },
        set: function (date, _flags, value, options) {
          date = setUTCDay(date, value, options);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['D', 'i', 'e', 'c', 't', 'T']
      },
      // Local day of week
      e: {
        priority: 90,
        parse: function (string, token, match, options) {
          var valueCallback = function (value) {
            var wholeWeekDays = Math.floor((value - 1) / 7) * 7;
            return (value + options.weekStartsOn + 6) % 7 + wholeWeekDays;
          };

          switch (token) {
            // 3
            case 'e':
            case 'ee':
              // 03
              return parseNDigits(token.length, string, valueCallback);
            // 3rd

            case 'eo':
              return match.ordinalNumber(string, {
                unit: 'day',
                valueCallback: valueCallback
              });
            // Tue

            case 'eee':
              return match.day(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.day(string, {
                width: 'short',
                context: 'formatting'
              }) || match.day(string, {
                width: 'narrow',
                context: 'formatting'
              });
            // T

            case 'eeeee':
              return match.day(string, {
                width: 'narrow',
                context: 'formatting'
              });
            // Tu

            case 'eeeeee':
              return match.day(string, {
                width: 'short',
                context: 'formatting'
              }) || match.day(string, {
                width: 'narrow',
                context: 'formatting'
              });
            // Tuesday

            case 'eeee':
            default:
              return match.day(string, {
                width: 'wide',
                context: 'formatting'
              }) || match.day(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.day(string, {
                width: 'short',
                context: 'formatting'
              }) || match.day(string, {
                width: 'narrow',
                context: 'formatting'
              });
          }
        },
        validate: function (_date, value, _options) {
          return value >= 0 && value <= 6;
        },
        set: function (date, _flags, value, options) {
          date = setUTCDay(date, value, options);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['y', 'R', 'u', 'q', 'Q', 'M', 'L', 'I', 'd', 'D', 'E', 'i', 'c', 't', 'T']
      },
      // Stand-alone local day of week
      c: {
        priority: 90,
        parse: function (string, token, match, options) {
          var valueCallback = function (value) {
            var wholeWeekDays = Math.floor((value - 1) / 7) * 7;
            return (value + options.weekStartsOn + 6) % 7 + wholeWeekDays;
          };

          switch (token) {
            // 3
            case 'c':
            case 'cc':
              // 03
              return parseNDigits(token.length, string, valueCallback);
            // 3rd

            case 'co':
              return match.ordinalNumber(string, {
                unit: 'day',
                valueCallback: valueCallback
              });
            // Tue

            case 'ccc':
              return match.day(string, {
                width: 'abbreviated',
                context: 'standalone'
              }) || match.day(string, {
                width: 'short',
                context: 'standalone'
              }) || match.day(string, {
                width: 'narrow',
                context: 'standalone'
              });
            // T

            case 'ccccc':
              return match.day(string, {
                width: 'narrow',
                context: 'standalone'
              });
            // Tu

            case 'cccccc':
              return match.day(string, {
                width: 'short',
                context: 'standalone'
              }) || match.day(string, {
                width: 'narrow',
                context: 'standalone'
              });
            // Tuesday

            case 'cccc':
            default:
              return match.day(string, {
                width: 'wide',
                context: 'standalone'
              }) || match.day(string, {
                width: 'abbreviated',
                context: 'standalone'
              }) || match.day(string, {
                width: 'short',
                context: 'standalone'
              }) || match.day(string, {
                width: 'narrow',
                context: 'standalone'
              });
          }
        },
        validate: function (_date, value, _options) {
          return value >= 0 && value <= 6;
        },
        set: function (date, _flags, value, options) {
          date = setUTCDay(date, value, options);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['y', 'R', 'u', 'q', 'Q', 'M', 'L', 'I', 'd', 'D', 'E', 'i', 'e', 't', 'T']
      },
      // ISO day of week
      i: {
        priority: 90,
        parse: function (string, token, match, _options) {
          var valueCallback = function (value) {
            if (value === 0) {
              return 7;
            }

            return value;
          };

          switch (token) {
            // 2
            case 'i':
            case 'ii':
              // 02
              return parseNDigits(token.length, string);
            // 2nd

            case 'io':
              return match.ordinalNumber(string, {
                unit: 'day'
              });
            // Tue

            case 'iii':
              return match.day(string, {
                width: 'abbreviated',
                context: 'formatting',
                valueCallback: valueCallback
              }) || match.day(string, {
                width: 'short',
                context: 'formatting',
                valueCallback: valueCallback
              }) || match.day(string, {
                width: 'narrow',
                context: 'formatting',
                valueCallback: valueCallback
              });
            // T

            case 'iiiii':
              return match.day(string, {
                width: 'narrow',
                context: 'formatting',
                valueCallback: valueCallback
              });
            // Tu

            case 'iiiiii':
              return match.day(string, {
                width: 'short',
                context: 'formatting',
                valueCallback: valueCallback
              }) || match.day(string, {
                width: 'narrow',
                context: 'formatting',
                valueCallback: valueCallback
              });
            // Tuesday

            case 'iiii':
            default:
              return match.day(string, {
                width: 'wide',
                context: 'formatting',
                valueCallback: valueCallback
              }) || match.day(string, {
                width: 'abbreviated',
                context: 'formatting',
                valueCallback: valueCallback
              }) || match.day(string, {
                width: 'short',
                context: 'formatting',
                valueCallback: valueCallback
              }) || match.day(string, {
                width: 'narrow',
                context: 'formatting',
                valueCallback: valueCallback
              });
          }
        },
        validate: function (_date, value, _options) {
          return value >= 1 && value <= 7;
        },
        set: function (date, _flags, value, options) {
          date = setUTCISODay(date, value, options);
          date.setUTCHours(0, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['y', 'Y', 'u', 'q', 'Q', 'M', 'L', 'w', 'd', 'D', 'E', 'e', 'c', 't', 'T']
      },
      // AM or PM
      a: {
        priority: 80,
        parse: function (string, token, match, _options) {
          switch (token) {
            case 'a':
            case 'aa':
            case 'aaa':
              return match.dayPeriod(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.dayPeriod(string, {
                width: 'narrow',
                context: 'formatting'
              });

            case 'aaaaa':
              return match.dayPeriod(string, {
                width: 'narrow',
                context: 'formatting'
              });

            case 'aaaa':
            default:
              return match.dayPeriod(string, {
                width: 'wide',
                context: 'formatting'
              }) || match.dayPeriod(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.dayPeriod(string, {
                width: 'narrow',
                context: 'formatting'
              });
          }
        },
        set: function (date, _flags, value, _options) {
          date.setUTCHours(dayPeriodEnumToHours(value), 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['b', 'B', 'H', 'K', 'k', 't', 'T']
      },
      // AM, PM, midnight
      b: {
        priority: 80,
        parse: function (string, token, match, _options) {
          switch (token) {
            case 'b':
            case 'bb':
            case 'bbb':
              return match.dayPeriod(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.dayPeriod(string, {
                width: 'narrow',
                context: 'formatting'
              });

            case 'bbbbb':
              return match.dayPeriod(string, {
                width: 'narrow',
                context: 'formatting'
              });

            case 'bbbb':
            default:
              return match.dayPeriod(string, {
                width: 'wide',
                context: 'formatting'
              }) || match.dayPeriod(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.dayPeriod(string, {
                width: 'narrow',
                context: 'formatting'
              });
          }
        },
        set: function (date, _flags, value, _options) {
          date.setUTCHours(dayPeriodEnumToHours(value), 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['a', 'B', 'H', 'K', 'k', 't', 'T']
      },
      // in the morning, in the afternoon, in the evening, at night
      B: {
        priority: 80,
        parse: function (string, token, match, _options) {
          switch (token) {
            case 'B':
            case 'BB':
            case 'BBB':
              return match.dayPeriod(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.dayPeriod(string, {
                width: 'narrow',
                context: 'formatting'
              });

            case 'BBBBB':
              return match.dayPeriod(string, {
                width: 'narrow',
                context: 'formatting'
              });

            case 'BBBB':
            default:
              return match.dayPeriod(string, {
                width: 'wide',
                context: 'formatting'
              }) || match.dayPeriod(string, {
                width: 'abbreviated',
                context: 'formatting'
              }) || match.dayPeriod(string, {
                width: 'narrow',
                context: 'formatting'
              });
          }
        },
        set: function (date, _flags, value, _options) {
          date.setUTCHours(dayPeriodEnumToHours(value), 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['a', 'b', 't', 'T']
      },
      // Hour [1-12]
      h: {
        priority: 70,
        parse: function (string, token, match, _options) {
          switch (token) {
            case 'h':
              return parseNumericPattern(numericPatterns.hour12h, string);

            case 'ho':
              return match.ordinalNumber(string, {
                unit: 'hour'
              });

            default:
              return parseNDigits(token.length, string);
          }
        },
        validate: function (_date, value, _options) {
          return value >= 1 && value <= 12;
        },
        set: function (date, _flags, value, _options) {
          var isPM = date.getUTCHours() >= 12;

          if (isPM && value < 12) {
            date.setUTCHours(value + 12, 0, 0, 0);
          } else if (!isPM && value === 12) {
            date.setUTCHours(0, 0, 0, 0);
          } else {
            date.setUTCHours(value, 0, 0, 0);
          }

          return date;
        },
        incompatibleTokens: ['H', 'K', 'k', 't', 'T']
      },
      // Hour [0-23]
      H: {
        priority: 70,
        parse: function (string, token, match, _options) {
          switch (token) {
            case 'H':
              return parseNumericPattern(numericPatterns.hour23h, string);

            case 'Ho':
              return match.ordinalNumber(string, {
                unit: 'hour'
              });

            default:
              return parseNDigits(token.length, string);
          }
        },
        validate: function (_date, value, _options) {
          return value >= 0 && value <= 23;
        },
        set: function (date, _flags, value, _options) {
          date.setUTCHours(value, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['a', 'b', 'h', 'K', 'k', 't', 'T']
      },
      // Hour [0-11]
      K: {
        priority: 70,
        parse: function (string, token, match, _options) {
          switch (token) {
            case 'K':
              return parseNumericPattern(numericPatterns.hour11h, string);

            case 'Ko':
              return match.ordinalNumber(string, {
                unit: 'hour'
              });

            default:
              return parseNDigits(token.length, string);
          }
        },
        validate: function (_date, value, _options) {
          return value >= 0 && value <= 11;
        },
        set: function (date, _flags, value, _options) {
          var isPM = date.getUTCHours() >= 12;

          if (isPM && value < 12) {
            date.setUTCHours(value + 12, 0, 0, 0);
          } else {
            date.setUTCHours(value, 0, 0, 0);
          }

          return date;
        },
        incompatibleTokens: ['a', 'b', 'h', 'H', 'k', 't', 'T']
      },
      // Hour [1-24]
      k: {
        priority: 70,
        parse: function (string, token, match, _options) {
          switch (token) {
            case 'k':
              return parseNumericPattern(numericPatterns.hour24h, string);

            case 'ko':
              return match.ordinalNumber(string, {
                unit: 'hour'
              });

            default:
              return parseNDigits(token.length, string);
          }
        },
        validate: function (_date, value, _options) {
          return value >= 1 && value <= 24;
        },
        set: function (date, _flags, value, _options) {
          var hours = value <= 24 ? value % 24 : value;
          date.setUTCHours(hours, 0, 0, 0);
          return date;
        },
        incompatibleTokens: ['a', 'b', 'h', 'H', 'K', 't', 'T']
      },
      // Minute
      m: {
        priority: 60,
        parse: function (string, token, match, _options) {
          switch (token) {
            case 'm':
              return parseNumericPattern(numericPatterns.minute, string);

            case 'mo':
              return match.ordinalNumber(string, {
                unit: 'minute'
              });

            default:
              return parseNDigits(token.length, string);
          }
        },
        validate: function (_date, value, _options) {
          return value >= 0 && value <= 59;
        },
        set: function (date, _flags, value, _options) {
          date.setUTCMinutes(value, 0, 0);
          return date;
        },
        incompatibleTokens: ['t', 'T']
      },
      // Second
      s: {
        priority: 50,
        parse: function (string, token, match, _options) {
          switch (token) {
            case 's':
              return parseNumericPattern(numericPatterns.second, string);

            case 'so':
              return match.ordinalNumber(string, {
                unit: 'second'
              });

            default:
              return parseNDigits(token.length, string);
          }
        },
        validate: function (_date, value, _options) {
          return value >= 0 && value <= 59;
        },
        set: function (date, _flags, value, _options) {
          date.setUTCSeconds(value, 0);
          return date;
        },
        incompatibleTokens: ['t', 'T']
      },
      // Fraction of second
      S: {
        priority: 30,
        parse: function (string, token, _match, _options) {
          var valueCallback = function (value) {
            return Math.floor(value * Math.pow(10, -token.length + 3));
          };

          return parseNDigits(token.length, string, valueCallback);
        },
        set: function (date, _flags, value, _options) {
          date.setUTCMilliseconds(value);
          return date;
        },
        incompatibleTokens: ['t', 'T']
      },
      // Timezone (ISO-8601. +00:00 is `'Z'`)
      X: {
        priority: 10,
        parse: function (string, token, _match, _options) {
          switch (token) {
            case 'X':
              return parseTimezonePattern(timezonePatterns.basicOptionalMinutes, string);

            case 'XX':
              return parseTimezonePattern(timezonePatterns.basic, string);

            case 'XXXX':
              return parseTimezonePattern(timezonePatterns.basicOptionalSeconds, string);

            case 'XXXXX':
              return parseTimezonePattern(timezonePatterns.extendedOptionalSeconds, string);

            case 'XXX':
            default:
              return parseTimezonePattern(timezonePatterns.extended, string);
          }
        },
        set: function (date, flags, value, _options) {
          if (flags.timestampIsSet) {
            return date;
          }

          return new Date(date.getTime() - value);
        },
        incompatibleTokens: ['t', 'T', 'x']
      },
      // Timezone (ISO-8601)
      x: {
        priority: 10,
        parse: function (string, token, _match, _options) {
          switch (token) {
            case 'x':
              return parseTimezonePattern(timezonePatterns.basicOptionalMinutes, string);

            case 'xx':
              return parseTimezonePattern(timezonePatterns.basic, string);

            case 'xxxx':
              return parseTimezonePattern(timezonePatterns.basicOptionalSeconds, string);

            case 'xxxxx':
              return parseTimezonePattern(timezonePatterns.extendedOptionalSeconds, string);

            case 'xxx':
            default:
              return parseTimezonePattern(timezonePatterns.extended, string);
          }
        },
        set: function (date, flags, value, _options) {
          if (flags.timestampIsSet) {
            return date;
          }

          return new Date(date.getTime() - value);
        },
        incompatibleTokens: ['t', 'T', 'X']
      },
      // Seconds timestamp
      t: {
        priority: 40,
        parse: function (string, _token, _match, _options) {
          return parseAnyDigitsSigned(string);
        },
        set: function (_date, _flags, value, _options) {
          return [new Date(value * 1000), {
            timestampIsSet: true
          }];
        },
        incompatibleTokens: '*'
      },
      // Milliseconds timestamp
      T: {
        priority: 20,
        parse: function (string, _token, _match, _options) {
          return parseAnyDigitsSigned(string);
        },
        set: function (_date, _flags, value, _options) {
          return [new Date(value), {
            timestampIsSet: true
          }];
        },
        incompatibleTokens: '*'
      }
    };

    var TIMEZONE_UNIT_PRIORITY = 10; // This RegExp consists of three parts separated by `|`:
    // - [yYQqMLwIdDecihHKkms]o matches any available ordinal number token
    //   (one of the certain letters followed by `o`)
    // - (\w)\1* matches any sequences of the same letter
    // - '' matches two quote characters in a row
    // - '(''|[^'])+('|$) matches anything surrounded by two quote characters ('),
    //   except a single quote symbol, which ends the sequence.
    //   Two quote characters do not end the sequence.
    //   If there is no matching single quote
    //   then the sequence will continue until the end of the string.
    // - . matches any single character unmatched by previous parts of the RegExps

    var formattingTokensRegExp = /[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g; // This RegExp catches symbols escaped by quotes, and also
    // sequences of symbols P, p, and the combinations like `PPPPPPPppppp`

    var longFormattingTokensRegExp = /P+p+|P+|p+|''|'(''|[^'])+('|$)|./g;
    var escapedStringRegExp = /^'([^]*?)'?$/;
    var doubleQuoteRegExp = /''/g;
    var notWhitespaceRegExp = /\S/;
    var unescapedLatinCharacterRegExp = /[a-zA-Z]/;
    /**
     * @name parse
     * @category Common Helpers
     * @summary Parse the date.
     *
     * @description
     * Return the date parsed from string using the given format string.
     *
     * > ⚠️ Please note that the `format` tokens differ from Moment.js and other libraries.
     * > See: https://git.io/fxCyr
     *
     * The characters in the format string wrapped between two single quotes characters (') are escaped.
     * Two single quotes in a row, whether inside or outside a quoted sequence, represent a 'real' single quote.
     *
     * Format of the format string is based on Unicode Technical Standard #35:
     * https://www.unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table
     * with a few additions (see note 5 below the table).
     *
     * Not all tokens are compatible. Combinations that don't make sense or could lead to bugs are prohibited
     * and will throw `RangeError`. For example usage of 24-hour format token with AM/PM token will throw an exception:
     *
     * ```javascript
     * parse('23 AM', 'HH a', new Date())
     * //=> RangeError: The format string mustn't contain `HH` and `a` at the same time
     * ```
     *
     * See the compatibility table: https://docs.google.com/spreadsheets/d/e/2PACX-1vQOPU3xUhplll6dyoMmVUXHKl_8CRDs6_ueLmex3SoqwhuolkuN3O05l4rqx5h1dKX8eb46Ul-CCSrq/pubhtml?gid=0&single=true
     *
     * Accepted format string patterns:
     * | Unit                            |Prior| Pattern | Result examples                   | Notes |
     * |---------------------------------|-----|---------|-----------------------------------|-------|
     * | Era                             | 140 | G..GGG  | AD, BC                            |       |
     * |                                 |     | GGGG    | Anno Domini, Before Christ        | 2     |
     * |                                 |     | GGGGG   | A, B                              |       |
     * | Calendar year                   | 130 | y       | 44, 1, 1900, 2017, 9999           | 4     |
     * |                                 |     | yo      | 44th, 1st, 1900th, 9999999th      | 4,5   |
     * |                                 |     | yy      | 44, 01, 00, 17                    | 4     |
     * |                                 |     | yyy     | 044, 001, 123, 999                | 4     |
     * |                                 |     | yyyy    | 0044, 0001, 1900, 2017            | 4     |
     * |                                 |     | yyyyy   | ...                               | 2,4   |
     * | Local week-numbering year       | 130 | Y       | 44, 1, 1900, 2017, 9000           | 4     |
     * |                                 |     | Yo      | 44th, 1st, 1900th, 9999999th      | 4,5   |
     * |                                 |     | YY      | 44, 01, 00, 17                    | 4,6   |
     * |                                 |     | YYY     | 044, 001, 123, 999                | 4     |
     * |                                 |     | YYYY    | 0044, 0001, 1900, 2017            | 4,6   |
     * |                                 |     | YYYYY   | ...                               | 2,4   |
     * | ISO week-numbering year         | 130 | R       | -43, 1, 1900, 2017, 9999, -9999   | 4,5   |
     * |                                 |     | RR      | -43, 01, 00, 17                   | 4,5   |
     * |                                 |     | RRR     | -043, 001, 123, 999, -999         | 4,5   |
     * |                                 |     | RRRR    | -0043, 0001, 2017, 9999, -9999    | 4,5   |
     * |                                 |     | RRRRR   | ...                               | 2,4,5 |
     * | Extended year                   | 130 | u       | -43, 1, 1900, 2017, 9999, -999    | 4     |
     * |                                 |     | uu      | -43, 01, 99, -99                  | 4     |
     * |                                 |     | uuu     | -043, 001, 123, 999, -999         | 4     |
     * |                                 |     | uuuu    | -0043, 0001, 2017, 9999, -9999    | 4     |
     * |                                 |     | uuuuu   | ...                               | 2,4   |
     * | Quarter (formatting)            | 120 | Q       | 1, 2, 3, 4                        |       |
     * |                                 |     | Qo      | 1st, 2nd, 3rd, 4th                | 5     |
     * |                                 |     | QQ      | 01, 02, 03, 04                    |       |
     * |                                 |     | QQQ     | Q1, Q2, Q3, Q4                    |       |
     * |                                 |     | QQQQ    | 1st quarter, 2nd quarter, ...     | 2     |
     * |                                 |     | QQQQQ   | 1, 2, 3, 4                        | 4     |
     * | Quarter (stand-alone)           | 120 | q       | 1, 2, 3, 4                        |       |
     * |                                 |     | qo      | 1st, 2nd, 3rd, 4th                | 5     |
     * |                                 |     | qq      | 01, 02, 03, 04                    |       |
     * |                                 |     | qqq     | Q1, Q2, Q3, Q4                    |       |
     * |                                 |     | qqqq    | 1st quarter, 2nd quarter, ...     | 2     |
     * |                                 |     | qqqqq   | 1, 2, 3, 4                        | 3     |
     * | Month (formatting)              | 110 | M       | 1, 2, ..., 12                     |       |
     * |                                 |     | Mo      | 1st, 2nd, ..., 12th               | 5     |
     * |                                 |     | MM      | 01, 02, ..., 12                   |       |
     * |                                 |     | MMM     | Jan, Feb, ..., Dec                |       |
     * |                                 |     | MMMM    | January, February, ..., December  | 2     |
     * |                                 |     | MMMMM   | J, F, ..., D                      |       |
     * | Month (stand-alone)             | 110 | L       | 1, 2, ..., 12                     |       |
     * |                                 |     | Lo      | 1st, 2nd, ..., 12th               | 5     |
     * |                                 |     | LL      | 01, 02, ..., 12                   |       |
     * |                                 |     | LLL     | Jan, Feb, ..., Dec                |       |
     * |                                 |     | LLLL    | January, February, ..., December  | 2     |
     * |                                 |     | LLLLL   | J, F, ..., D                      |       |
     * | Local week of year              | 100 | w       | 1, 2, ..., 53                     |       |
     * |                                 |     | wo      | 1st, 2nd, ..., 53th               | 5     |
     * |                                 |     | ww      | 01, 02, ..., 53                   |       |
     * | ISO week of year                | 100 | I       | 1, 2, ..., 53                     | 5     |
     * |                                 |     | Io      | 1st, 2nd, ..., 53th               | 5     |
     * |                                 |     | II      | 01, 02, ..., 53                   | 5     |
     * | Day of month                    |  90 | d       | 1, 2, ..., 31                     |       |
     * |                                 |     | do      | 1st, 2nd, ..., 31st               | 5     |
     * |                                 |     | dd      | 01, 02, ..., 31                   |       |
     * | Day of year                     |  90 | D       | 1, 2, ..., 365, 366               | 7     |
     * |                                 |     | Do      | 1st, 2nd, ..., 365th, 366th       | 5     |
     * |                                 |     | DD      | 01, 02, ..., 365, 366             | 7     |
     * |                                 |     | DDD     | 001, 002, ..., 365, 366           |       |
     * |                                 |     | DDDD    | ...                               | 2     |
     * | Day of week (formatting)        |  90 | E..EEE  | Mon, Tue, Wed, ..., Sun           |       |
     * |                                 |     | EEEE    | Monday, Tuesday, ..., Sunday      | 2     |
     * |                                 |     | EEEEE   | M, T, W, T, F, S, S               |       |
     * |                                 |     | EEEEEE  | Mo, Tu, We, Th, Fr, Su, Sa        |       |
     * | ISO day of week (formatting)    |  90 | i       | 1, 2, 3, ..., 7                   | 5     |
     * |                                 |     | io      | 1st, 2nd, ..., 7th                | 5     |
     * |                                 |     | ii      | 01, 02, ..., 07                   | 5     |
     * |                                 |     | iii     | Mon, Tue, Wed, ..., Sun           | 5     |
     * |                                 |     | iiii    | Monday, Tuesday, ..., Sunday      | 2,5   |
     * |                                 |     | iiiii   | M, T, W, T, F, S, S               | 5     |
     * |                                 |     | iiiiii  | Mo, Tu, We, Th, Fr, Su, Sa        | 5     |
     * | Local day of week (formatting)  |  90 | e       | 2, 3, 4, ..., 1                   |       |
     * |                                 |     | eo      | 2nd, 3rd, ..., 1st                | 5     |
     * |                                 |     | ee      | 02, 03, ..., 01                   |       |
     * |                                 |     | eee     | Mon, Tue, Wed, ..., Sun           |       |
     * |                                 |     | eeee    | Monday, Tuesday, ..., Sunday      | 2     |
     * |                                 |     | eeeee   | M, T, W, T, F, S, S               |       |
     * |                                 |     | eeeeee  | Mo, Tu, We, Th, Fr, Su, Sa        |       |
     * | Local day of week (stand-alone) |  90 | c       | 2, 3, 4, ..., 1                   |       |
     * |                                 |     | co      | 2nd, 3rd, ..., 1st                | 5     |
     * |                                 |     | cc      | 02, 03, ..., 01                   |       |
     * |                                 |     | ccc     | Mon, Tue, Wed, ..., Sun           |       |
     * |                                 |     | cccc    | Monday, Tuesday, ..., Sunday      | 2     |
     * |                                 |     | ccccc   | M, T, W, T, F, S, S               |       |
     * |                                 |     | cccccc  | Mo, Tu, We, Th, Fr, Su, Sa        |       |
     * | AM, PM                          |  80 | a..aaa  | AM, PM                            |       |
     * |                                 |     | aaaa    | a.m., p.m.                        | 2     |
     * |                                 |     | aaaaa   | a, p                              |       |
     * | AM, PM, noon, midnight          |  80 | b..bbb  | AM, PM, noon, midnight            |       |
     * |                                 |     | bbbb    | a.m., p.m., noon, midnight        | 2     |
     * |                                 |     | bbbbb   | a, p, n, mi                       |       |
     * | Flexible day period             |  80 | B..BBB  | at night, in the morning, ...     |       |
     * |                                 |     | BBBB    | at night, in the morning, ...     | 2     |
     * |                                 |     | BBBBB   | at night, in the morning, ...     |       |
     * | Hour [1-12]                     |  70 | h       | 1, 2, ..., 11, 12                 |       |
     * |                                 |     | ho      | 1st, 2nd, ..., 11th, 12th         | 5     |
     * |                                 |     | hh      | 01, 02, ..., 11, 12               |       |
     * | Hour [0-23]                     |  70 | H       | 0, 1, 2, ..., 23                  |       |
     * |                                 |     | Ho      | 0th, 1st, 2nd, ..., 23rd          | 5     |
     * |                                 |     | HH      | 00, 01, 02, ..., 23               |       |
     * | Hour [0-11]                     |  70 | K       | 1, 2, ..., 11, 0                  |       |
     * |                                 |     | Ko      | 1st, 2nd, ..., 11th, 0th          | 5     |
     * |                                 |     | KK      | 01, 02, ..., 11, 00               |       |
     * | Hour [1-24]                     |  70 | k       | 24, 1, 2, ..., 23                 |       |
     * |                                 |     | ko      | 24th, 1st, 2nd, ..., 23rd         | 5     |
     * |                                 |     | kk      | 24, 01, 02, ..., 23               |       |
     * | Minute                          |  60 | m       | 0, 1, ..., 59                     |       |
     * |                                 |     | mo      | 0th, 1st, ..., 59th               | 5     |
     * |                                 |     | mm      | 00, 01, ..., 59                   |       |
     * | Second                          |  50 | s       | 0, 1, ..., 59                     |       |
     * |                                 |     | so      | 0th, 1st, ..., 59th               | 5     |
     * |                                 |     | ss      | 00, 01, ..., 59                   |       |
     * | Seconds timestamp               |  40 | t       | 512969520                         |       |
     * |                                 |     | tt      | ...                               | 2     |
     * | Fraction of second              |  30 | S       | 0, 1, ..., 9                      |       |
     * |                                 |     | SS      | 00, 01, ..., 99                   |       |
     * |                                 |     | SSS     | 000, 0001, ..., 999               |       |
     * |                                 |     | SSSS    | ...                               | 2     |
     * | Milliseconds timestamp          |  20 | T       | 512969520900                      |       |
     * |                                 |     | TT      | ...                               | 2     |
     * | Timezone (ISO-8601 w/ Z)        |  10 | X       | -08, +0530, Z                     |       |
     * |                                 |     | XX      | -0800, +0530, Z                   |       |
     * |                                 |     | XXX     | -08:00, +05:30, Z                 |       |
     * |                                 |     | XXXX    | -0800, +0530, Z, +123456          | 2     |
     * |                                 |     | XXXXX   | -08:00, +05:30, Z, +12:34:56      |       |
     * | Timezone (ISO-8601 w/o Z)       |  10 | x       | -08, +0530, +00                   |       |
     * |                                 |     | xx      | -0800, +0530, +0000               |       |
     * |                                 |     | xxx     | -08:00, +05:30, +00:00            | 2     |
     * |                                 |     | xxxx    | -0800, +0530, +0000, +123456      |       |
     * |                                 |     | xxxxx   | -08:00, +05:30, +00:00, +12:34:56 |       |
     * | Long localized date             |  NA | P       | 05/29/1453                        | 5,8   |
     * |                                 |     | PP      | May 29, 1453                      |       |
     * |                                 |     | PPP     | May 29th, 1453                    |       |
     * |                                 |     | PPPP    | Sunday, May 29th, 1453            | 2,5,8 |
     * | Long localized time             |  NA | p       | 12:00 AM                          | 5,8   |
     * |                                 |     | pp      | 12:00:00 AM                       |       |
     * | Combination of date and time    |  NA | Pp      | 05/29/1453, 12:00 AM              |       |
     * |                                 |     | PPpp    | May 29, 1453, 12:00:00 AM         |       |
     * |                                 |     | PPPpp   | May 29th, 1453 at ...             |       |
     * |                                 |     | PPPPpp  | Sunday, May 29th, 1453 at ...     | 2,5,8 |
     * Notes:
     * 1. "Formatting" units (e.g. formatting quarter) in the default en-US locale
     *    are the same as "stand-alone" units, but are different in some languages.
     *    "Formatting" units are declined according to the rules of the language
     *    in the context of a date. "Stand-alone" units are always nominative singular.
     *    In `format` function, they will produce different result:
     *
     *    `format(new Date(2017, 10, 6), 'do LLLL', {locale: cs}) //=> '6. listopad'`
     *
     *    `format(new Date(2017, 10, 6), 'do MMMM', {locale: cs}) //=> '6. listopadu'`
     *
     *    `parse` will try to match both formatting and stand-alone units interchangably.
     *
     * 2. Any sequence of the identical letters is a pattern, unless it is escaped by
     *    the single quote characters (see below).
     *    If the sequence is longer than listed in table:
     *    - for numerical units (`yyyyyyyy`) `parse` will try to match a number
     *      as wide as the sequence
     *    - for text units (`MMMMMMMM`) `parse` will try to match the widest variation of the unit.
     *      These variations are marked with "2" in the last column of the table.
     *
     * 3. `QQQQQ` and `qqqqq` could be not strictly numerical in some locales.
     *    These tokens represent the shortest form of the quarter.
     *
     * 4. The main difference between `y` and `u` patterns are B.C. years:
     *
     *    | Year | `y` | `u` |
     *    |------|-----|-----|
     *    | AC 1 |   1 |   1 |
     *    | BC 1 |   1 |   0 |
     *    | BC 2 |   2 |  -1 |
     *
     *    Also `yy` will try to guess the century of two digit year by proximity with `referenceDate`:
     *
     *    `parse('50', 'yy', new Date(2018, 0, 1)) //=> Sat Jan 01 2050 00:00:00`
     *
     *    `parse('75', 'yy', new Date(2018, 0, 1)) //=> Wed Jan 01 1975 00:00:00`
     *
     *    while `uu` will just assign the year as is:
     *
     *    `parse('50', 'uu', new Date(2018, 0, 1)) //=> Sat Jan 01 0050 00:00:00`
     *
     *    `parse('75', 'uu', new Date(2018, 0, 1)) //=> Tue Jan 01 0075 00:00:00`
     *
     *    The same difference is true for local and ISO week-numbering years (`Y` and `R`),
     *    except local week-numbering years are dependent on `options.weekStartsOn`
     *    and `options.firstWeekContainsDate` (compare [setISOWeekYear]{@link https://date-fns.org/docs/setISOWeekYear}
     *    and [setWeekYear]{@link https://date-fns.org/docs/setWeekYear}).
     *
     * 5. These patterns are not in the Unicode Technical Standard #35:
     *    - `i`: ISO day of week
     *    - `I`: ISO week of year
     *    - `R`: ISO week-numbering year
     *    - `o`: ordinal number modifier
     *    - `P`: long localized date
     *    - `p`: long localized time
     *
     * 6. `YY` and `YYYY` tokens represent week-numbering years but they are often confused with years.
     *    You should enable `options.useAdditionalWeekYearTokens` to use them. See: https://git.io/fxCyr
     *
     * 7. `D` and `DD` tokens represent days of the year but they are ofthen confused with days of the month.
     *    You should enable `options.useAdditionalDayOfYearTokens` to use them. See: https://git.io/fxCyr
     *
     * 8. `P+` tokens do not have a defined priority since they are merely aliases to other tokens based
     *    on the given locale.
     *
     *    using `en-US` locale: `P` => `MM/dd/yyyy`
     *    using `en-US` locale: `p` => `hh:mm a`
     *    using `pt-BR` locale: `P` => `dd/MM/yyyy`
     *    using `pt-BR` locale: `p` => `HH:mm`
     *
     * Values will be assigned to the date in the descending order of its unit's priority.
     * Units of an equal priority overwrite each other in the order of appearance.
     *
     * If no values of higher priority are parsed (e.g. when parsing string 'January 1st' without a year),
     * the values will be taken from 3rd argument `referenceDate` which works as a context of parsing.
     *
     * `referenceDate` must be passed for correct work of the function.
     * If you're not sure which `referenceDate` to supply, create a new instance of Date:
     * `parse('02/11/2014', 'MM/dd/yyyy', new Date())`
     * In this case parsing will be done in the context of the current date.
     * If `referenceDate` is `Invalid Date` or a value not convertible to valid `Date`,
     * then `Invalid Date` will be returned.
     *
     * The result may vary by locale.
     *
     * If `formatString` matches with `dateString` but does not provides tokens, `referenceDate` will be returned.
     *
     * If parsing failed, `Invalid Date` will be returned.
     * Invalid Date is a Date, whose time value is NaN.
     * Time value of Date: http://es5.github.io/#x15.9.1.1
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * - Old `parse` was renamed to `toDate`.
     *   Now `parse` is a new function which parses a string using a provided format.
     *
     *   ```javascript
     *   // Before v2.0.0
     *   parse('2016-01-01')
     *
     *   // v2.0.0 onward (toDate no longer accepts a string)
     *   toDate(1392098430000) // Unix to timestamp
     *   toDate(new Date(2014, 1, 11, 11, 30, 30)) // Cloning the date
     *   parse('2016-01-01', 'yyyy-MM-dd', new Date())
     *   ```
     *
     * @param {String} dateString - the string to parse
     * @param {String} formatString - the string of tokens
     * @param {Date|Number} referenceDate - defines values missing from the parsed dateString
     * @param {Object} [options] - an object with options.
     * @param {Locale} [options.locale=defaultLocale] - the locale object. See [Locale]{@link https://date-fns.org/docs/Locale}
     * @param {0|1|2|3|4|5|6} [options.weekStartsOn=0] - the index of the first day of the week (0 - Sunday)
     * @param {1|2|3|4|5|6|7} [options.firstWeekContainsDate=1] - the day of January, which is always in the first week of the year
     * @param {Boolean} [options.useAdditionalWeekYearTokens=false] - if true, allows usage of the week-numbering year tokens `YY` and `YYYY`;
     *   see: https://git.io/fxCyr
     * @param {Boolean} [options.useAdditionalDayOfYearTokens=false] - if true, allows usage of the day of year tokens `D` and `DD`;
     *   see: https://git.io/fxCyr
     * @returns {Date} the parsed date
     * @throws {TypeError} 3 arguments required
     * @throws {RangeError} `options.weekStartsOn` must be between 0 and 6
     * @throws {RangeError} `options.firstWeekContainsDate` must be between 1 and 7
     * @throws {RangeError} `options.locale` must contain `match` property
     * @throws {RangeError} use `yyyy` instead of `YYYY` for formatting years using [format provided] to the input [input provided]; see: https://git.io/fxCyr
     * @throws {RangeError} use `yy` instead of `YY` for formatting years using [format provided] to the input [input provided]; see: https://git.io/fxCyr
     * @throws {RangeError} use `d` instead of `D` for formatting days of the month using [format provided] to the input [input provided]; see: https://git.io/fxCyr
     * @throws {RangeError} use `dd` instead of `DD` for formatting days of the month using [format provided] to the input [input provided]; see: https://git.io/fxCyr
     * @throws {RangeError} format string contains an unescaped latin alphabet character
     *
     * @example
     * // Parse 11 February 2014 from middle-endian format:
     * var result = parse('02/11/2014', 'MM/dd/yyyy', new Date())
     * //=> Tue Feb 11 2014 00:00:00
     *
     * @example
     * // Parse 28th of February in Esperanto locale in the context of 2010 year:
     * import eo from 'date-fns/locale/eo'
     * var result = parse('28-a de februaro', "do 'de' MMMM", new Date(2010, 0, 1), {
     *   locale: eo
     * })
     * //=> Sun Feb 28 2010 00:00:00
     */

    function parse(dirtyDateString, dirtyFormatString, dirtyReferenceDate, dirtyOptions) {
      requiredArgs(3, arguments);
      var dateString = String(dirtyDateString);
      var formatString = String(dirtyFormatString);
      var options = dirtyOptions || {};
      var locale$1 = options.locale || locale;

      if (!locale$1.match) {
        throw new RangeError('locale must contain match property');
      }

      var localeFirstWeekContainsDate = locale$1.options && locale$1.options.firstWeekContainsDate;
      var defaultFirstWeekContainsDate = localeFirstWeekContainsDate == null ? 1 : toInteger(localeFirstWeekContainsDate);
      var firstWeekContainsDate = options.firstWeekContainsDate == null ? defaultFirstWeekContainsDate : toInteger(options.firstWeekContainsDate); // Test if weekStartsOn is between 1 and 7 _and_ is not NaN

      if (!(firstWeekContainsDate >= 1 && firstWeekContainsDate <= 7)) {
        throw new RangeError('firstWeekContainsDate must be between 1 and 7 inclusively');
      }

      var localeWeekStartsOn = locale$1.options && locale$1.options.weekStartsOn;
      var defaultWeekStartsOn = localeWeekStartsOn == null ? 0 : toInteger(localeWeekStartsOn);
      var weekStartsOn = options.weekStartsOn == null ? defaultWeekStartsOn : toInteger(options.weekStartsOn); // Test if weekStartsOn is between 0 and 6 _and_ is not NaN

      if (!(weekStartsOn >= 0 && weekStartsOn <= 6)) {
        throw new RangeError('weekStartsOn must be between 0 and 6 inclusively');
      }

      if (formatString === '') {
        if (dateString === '') {
          return toDate(dirtyReferenceDate);
        } else {
          return new Date(NaN);
        }
      }

      var subFnOptions = {
        firstWeekContainsDate: firstWeekContainsDate,
        weekStartsOn: weekStartsOn,
        locale: locale$1 // If timezone isn't specified, it will be set to the system timezone

      };
      var setters = [{
        priority: TIMEZONE_UNIT_PRIORITY,
        subPriority: -1,
        set: dateToSystemTimezone,
        index: 0
      }];
      var i;
      var tokens = formatString.match(longFormattingTokensRegExp).map(function (substring) {
        var firstCharacter = substring[0];

        if (firstCharacter === 'p' || firstCharacter === 'P') {
          var longFormatter = longFormatters[firstCharacter];
          return longFormatter(substring, locale$1.formatLong, subFnOptions);
        }

        return substring;
      }).join('').match(formattingTokensRegExp);
      var usedTokens = [];

      for (i = 0; i < tokens.length; i++) {
        var token = tokens[i];

        if (!options.useAdditionalWeekYearTokens && isProtectedWeekYearToken(token)) {
          throwProtectedError(token, formatString, dirtyDateString);
        }

        if (!options.useAdditionalDayOfYearTokens && isProtectedDayOfYearToken(token)) {
          throwProtectedError(token, formatString, dirtyDateString);
        }

        var firstCharacter = token[0];
        var parser = parsers[firstCharacter];

        if (parser) {
          var incompatibleTokens = parser.incompatibleTokens;

          if (Array.isArray(incompatibleTokens)) {
            var incompatibleToken = void 0;

            for (var _i = 0; _i < usedTokens.length; _i++) {
              var usedToken = usedTokens[_i].token;

              if (incompatibleTokens.indexOf(usedToken) !== -1 || usedToken === firstCharacter) {
                incompatibleToken = usedTokens[_i];
                break;
              }
            }

            if (incompatibleToken) {
              throw new RangeError("The format string mustn't contain `".concat(incompatibleToken.fullToken, "` and `").concat(token, "` at the same time"));
            }
          } else if (parser.incompatibleTokens === '*' && usedTokens.length) {
            throw new RangeError("The format string mustn't contain `".concat(token, "` and any other token at the same time"));
          }

          usedTokens.push({
            token: firstCharacter,
            fullToken: token
          });
          var parseResult = parser.parse(dateString, token, locale$1.match, subFnOptions);

          if (!parseResult) {
            return new Date(NaN);
          }

          setters.push({
            priority: parser.priority,
            subPriority: parser.subPriority || 0,
            set: parser.set,
            validate: parser.validate,
            value: parseResult.value,
            index: setters.length
          });
          dateString = parseResult.rest;
        } else {
          if (firstCharacter.match(unescapedLatinCharacterRegExp)) {
            throw new RangeError('Format string contains an unescaped latin alphabet character `' + firstCharacter + '`');
          } // Replace two single quote characters with one single quote character


          if (token === "''") {
            token = "'";
          } else if (firstCharacter === "'") {
            token = cleanEscapedString(token);
          } // Cut token from string, or, if string doesn't match the token, return Invalid Date


          if (dateString.indexOf(token) === 0) {
            dateString = dateString.slice(token.length);
          } else {
            return new Date(NaN);
          }
        }
      } // Check if the remaining input contains something other than whitespace


      if (dateString.length > 0 && notWhitespaceRegExp.test(dateString)) {
        return new Date(NaN);
      }

      var uniquePrioritySetters = setters.map(function (setter) {
        return setter.priority;
      }).sort(function (a, b) {
        return b - a;
      }).filter(function (priority, index, array) {
        return array.indexOf(priority) === index;
      }).map(function (priority) {
        return setters.filter(function (setter) {
          return setter.priority === priority;
        }).sort(function (a, b) {
          return b.subPriority - a.subPriority;
        });
      }).map(function (setterArray) {
        return setterArray[0];
      });
      var date = toDate(dirtyReferenceDate);

      if (isNaN(date)) {
        return new Date(NaN);
      } // Convert the date in system timezone to the same date in UTC+00:00 timezone.
      // This ensures that when UTC functions will be implemented, locales will be compatible with them.
      // See an issue about UTC functions: https://github.com/date-fns/date-fns/issues/37


      var utcDate = subMilliseconds(date, getTimezoneOffsetInMilliseconds(date));
      var flags = {};

      for (i = 0; i < uniquePrioritySetters.length; i++) {
        var setter = uniquePrioritySetters[i];

        if (setter.validate && !setter.validate(utcDate, setter.value, subFnOptions)) {
          return new Date(NaN);
        }

        var result = setter.set(utcDate, flags, setter.value, subFnOptions); // Result is tuple (date, flags)

        if (result[0]) {
          utcDate = result[0];
          assign(flags, result[1]); // Result is date
        } else {
          utcDate = result;
        }
      }

      return utcDate;
    }

    function dateToSystemTimezone(date, flags) {
      if (flags.timestampIsSet) {
        return date;
      }

      var convertedDate = new Date(0);
      convertedDate.setFullYear(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      convertedDate.setHours(date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds());
      return convertedDate;
    }

    function cleanEscapedString(input) {
      return input.match(escapedStringRegExp)[1].replace(doubleQuoteRegExp, "'");
    }

    /**
     * @name startOfToday
     * @category Day Helpers
     * @summary Return the start of today.
     * @pure false
     *
     * @description
     * Return the start of today.
     *
     * > ⚠️ Please note that this function is not present in the FP submodule as
     * > it uses `Date.now()` internally hence impure and can't be safely curried.
     *
     * ### v2.0.0 breaking changes:
     *
     * - [Changes that are common for the whole library](https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#Common-Changes).
     *
     * @returns {Date} the start of today
     *
     * @example
     * // If today is 6 October 2014:
     * var result = startOfToday()
     * //=> Mon Oct 6 2014 00:00:00
     */

    function startOfToday() {
      return startOfDay(Date.now());
    }

    /* src/App.svelte generated by Svelte v3.34.0 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[46] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[51] = list[i];
    	child_ctx[53] = i;
    	return child_ctx;
    }

    // (303:4) {#if serverType === SERVER_TYPE.RELAY_SERVER}
    function create_if_block_11(ctx) {
    	let label;
    	let t1;
    	let div;
    	let span;
    	let t3;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label = element("label");
    			label.textContent = "Relay server IP address (http://x.x.x.x)";
    			t1 = space();
    			div = element("div");
    			span = element("span");
    			span.textContent = "http://";
    			t3 = space();
    			input = element("input");
    			attr_dev(label, "for", "relay-server-ip-address");
    			add_location(label, file, 303, 8, 10291);
    			add_location(span, file, 307, 12, 10447);
    			attr_dev(input, "type", "url");
    			attr_dev(input, "id", "relay-server-ip-address");
    			add_location(input, file, 308, 12, 10480);
    			set_style(div, "display", "flex");
    			add_location(div, file, 306, 8, 10407);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(div, t3);
    			append_dev(div, input);
    			set_input_value(input, /*relayServerIpAddress*/ ctx[1]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[32]),
    					listen_dev(input, "keydown", /*handleRelayUrlTextFieldKeyDown*/ ctx[15], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*relayServerIpAddress*/ 2) {
    				set_input_value(input, /*relayServerIpAddress*/ ctx[1]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_11.name,
    		type: "if",
    		source: "(303:4) {#if serverType === SERVER_TYPE.RELAY_SERVER}",
    		ctx
    	});

    	return block;
    }

    // (324:4) {#if meetsPromise}
    function create_if_block_10(ctx) {
    	let hr;
    	let t;
    	let await_block_anchor;
    	let promise;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: true,
    		pending: create_pending_block_1,
    		then: create_then_block_1,
    		catch: create_catch_block_1,
    		value: 50,
    		error: 49
    	};

    	handle_promise(promise = /*meetsPromise*/ ctx[11], info);

    	const block = {
    		c: function create() {
    			hr = element("hr");
    			t = space();
    			await_block_anchor = empty();
    			info.block.c();
    			attr_dev(hr, "class", "svelte-1dqar03");
    			add_location(hr, file, 324, 8, 10870);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, hr, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, await_block_anchor, anchor);
    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => await_block_anchor.parentNode;
    			info.anchor = await_block_anchor;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			info.ctx = ctx;

    			if (dirty[0] & /*meetsPromise*/ 2048 && promise !== (promise = /*meetsPromise*/ ctx[11]) && handle_promise(promise, info)) ; else {
    				const child_ctx = ctx.slice();
    				child_ctx[50] = child_ctx[49] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(hr);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(await_block_anchor);
    			info.block.d(detaching);
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_10.name,
    		type: "if",
    		source: "(324:4) {#if meetsPromise}",
    		ctx
    	});

    	return block;
    }

    // (351:8) {:catch error}
    function create_catch_block_1(ctx) {
    	let p0;
    	let t2;
    	let p1;
    	let t3;
    	let t4_value = /*error*/ ctx[49].message + "";
    	let t4;
    	let t5;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			p0 = element("p");
    			p0.textContent = `Network error; could not fetch meets from ${/*liftingCastMeetsUrl*/ ctx[16]()}`;
    			t2 = space();
    			p1 = element("p");
    			t3 = text("Error message: ");
    			t4 = text(t4_value);
    			t5 = space();
    			button = element("button");
    			button.textContent = "Retry";
    			attr_dev(p0, "class", "error svelte-1dqar03");
    			add_location(p0, file, 351, 12, 11644);
    			attr_dev(p1, "class", "error svelte-1dqar03");
    			add_location(p1, file, 352, 12, 11743);
    			add_location(button, file, 353, 12, 11807);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, t3);
    			append_dev(p1, t4);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[35], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*meetsPromise*/ 2048 && t4_value !== (t4_value = /*error*/ ctx[49].message + "")) set_data_dev(t4, t4_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(p1);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block_1.name,
    		type: "catch",
    		source: "(351:8) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (329:8) {:then meets}
    function create_then_block_1(ctx) {
    	let div;
    	let t0_value = /*meets*/ ctx[50].length + "";
    	let t0;
    	let t1;
    	let t2;
    	let select;
    	let option;
    	let mounted;
    	let dispose;
    	let each_value_1 = /*meets*/ ctx[50];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = text(" meets");
    			t2 = space();
    			select = element("select");
    			option = element("option");
    			option.textContent = "Select a meet\n                ";

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(div, file, 329, 12, 10982);
    			option.disabled = true;
    			option.selected = true;
    			option.__value = "";
    			option.value = option.__value;
    			add_location(option, file, 334, 16, 11164);
    			if (/*selectedMeetId*/ ctx[2] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[34].call(select));
    			add_location(select, file, 330, 12, 11026);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, select, anchor);
    			append_dev(select, option);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, /*selectedMeetId*/ ctx[2]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(select, "change", /*select_change_handler*/ ctx[34]),
    					listen_dev(select, "change", /*handleMeetSelection*/ ctx[20], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*meetsPromise*/ 2048 && t0_value !== (t0_value = /*meets*/ ctx[50].length + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*meetsPromise*/ 2048) {
    				each_value_1 = /*meets*/ ctx[50];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}

    			if (dirty[0] & /*selectedMeetId, meetsPromise*/ 2052) {
    				select_option(select, /*selectedMeetId*/ ctx[2]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(select);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block_1.name,
    		type: "then",
    		source: "(329:8) {:then meets}",
    		ctx
    	});

    	return block;
    }

    // (343:16) {#each meets as meet, i}
    function create_each_block_1(ctx) {
    	let option;
    	let t0_value = /*meet*/ ctx[51].name + "";
    	let t0;
    	let t1;
    	let t2_value = /*meet*/ ctx[51].date + "";
    	let t2;
    	let t3;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = text(" (");
    			t2 = text(t2_value);
    			t3 = text(")\n                    ");
    			option.__value = option_value_value = /*meet*/ ctx[51]._id;
    			option.value = option.__value;
    			add_location(option, file, 343, 20, 11408);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t0);
    			append_dev(option, t1);
    			append_dev(option, t2);
    			append_dev(option, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*meetsPromise*/ 2048 && t0_value !== (t0_value = /*meet*/ ctx[51].name + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*meetsPromise*/ 2048 && t2_value !== (t2_value = /*meet*/ ctx[51].date + "")) set_data_dev(t2, t2_value);

    			if (dirty[0] & /*meetsPromise*/ 2048 && option_value_value !== (option_value_value = /*meet*/ ctx[51]._id)) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(343:16) {#each meets as meet, i}",
    		ctx
    	});

    	return block;
    }

    // (327:29)              <p>... loading meets ...</p>         {:then meets}
    function create_pending_block_1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "... loading meets ...";
    			add_location(p, file, 327, 12, 10919);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block_1.name,
    		type: "pending",
    		source: "(327:29)              <p>... loading meets ...</p>         {:then meets}",
    		ctx
    	});

    	return block;
    }

    // (362:4) {#if platformsPromise}
    function create_if_block_9(ctx) {
    	let hr;
    	let t;
    	let await_block_anchor;
    	let promise;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: true,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 45,
    		error: 49
    	};

    	handle_promise(promise = /*platformsPromise*/ ctx[12], info);

    	const block = {
    		c: function create() {
    			hr = element("hr");
    			t = space();
    			await_block_anchor = empty();
    			info.block.c();
    			attr_dev(hr, "class", "svelte-1dqar03");
    			add_location(hr, file, 362, 8, 12004);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, hr, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, await_block_anchor, anchor);
    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => await_block_anchor.parentNode;
    			info.anchor = await_block_anchor;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			info.ctx = ctx;

    			if (dirty[0] & /*platformsPromise*/ 4096 && promise !== (promise = /*platformsPromise*/ ctx[12]) && handle_promise(promise, info)) ; else {
    				const child_ctx = ctx.slice();
    				child_ctx[45] = child_ctx[49] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(hr);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(await_block_anchor);
    			info.block.d(detaching);
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(362:4) {#if platformsPromise}",
    		ctx
    	});

    	return block;
    }

    // (388:8) {:catch error}
    function create_catch_block(ctx) {
    	let p0;
    	let t0;
    	let t1;
    	let t2;
    	let t3_value = /*liftingCastPlatfomsUrl*/ ctx[17](/*selectedMeetId*/ ctx[2]) + "";
    	let t3;
    	let t4;
    	let p1;
    	let t5;
    	let t6_value = /*error*/ ctx[49].message + "";
    	let t6;
    	let t7;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			p0 = element("p");
    			t0 = text("Network error; could not fetch platforms for meet ");
    			t1 = text(/*selectedMeetId*/ ctx[2]);
    			t2 = text("\n                from ");
    			t3 = text(t3_value);
    			t4 = space();
    			p1 = element("p");
    			t5 = text("Error message: ");
    			t6 = text(t6_value);
    			t7 = space();
    			button = element("button");
    			button.textContent = "Retry";
    			attr_dev(p0, "class", "error svelte-1dqar03");
    			add_location(p0, file, 388, 12, 12808);
    			attr_dev(p1, "class", "error svelte-1dqar03");
    			add_location(p1, file, 390, 12, 12970);
    			add_location(button, file, 391, 12, 13034);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p0, anchor);
    			append_dev(p0, t0);
    			append_dev(p0, t1);
    			append_dev(p0, t2);
    			append_dev(p0, t3);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, t5);
    			append_dev(p1, t6);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[37], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedMeetId*/ 4) set_data_dev(t1, /*selectedMeetId*/ ctx[2]);
    			if (dirty[0] & /*selectedMeetId*/ 4 && t3_value !== (t3_value = /*liftingCastPlatfomsUrl*/ ctx[17](/*selectedMeetId*/ ctx[2]) + "")) set_data_dev(t3, t3_value);
    			if (dirty[0] & /*platformsPromise*/ 4096 && t6_value !== (t6_value = /*error*/ ctx[49].message + "")) set_data_dev(t6, t6_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(p1);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(388:8) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (367:8) {:then platforms}
    function create_then_block(ctx) {
    	let div;
    	let t0_value = /*platforms*/ ctx[45].length + "";
    	let t0;
    	let t1;
    	let t2;
    	let select;
    	let option;
    	let mounted;
    	let dispose;
    	let each_value = /*platforms*/ ctx[45];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = text(" platforms");
    			t2 = space();
    			select = element("select");
    			option = element("option");
    			option.textContent = "Select a platform\n                ";

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(div, file, 367, 12, 12128);
    			option.disabled = true;
    			option.selected = true;
    			option.__value = "";
    			option.value = option.__value;
    			add_location(option, file, 372, 16, 12326);
    			if (/*selectedPlatformId*/ ctx[3] === void 0) add_render_callback(() => /*select_change_handler_1*/ ctx[36].call(select));
    			add_location(select, file, 368, 12, 12180);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, select, anchor);
    			append_dev(select, option);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, /*selectedPlatformId*/ ctx[3]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(select, "change", /*select_change_handler_1*/ ctx[36]),
    					listen_dev(select, "change", /*handlePlatformSelection*/ ctx[21], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*platformsPromise*/ 4096 && t0_value !== (t0_value = /*platforms*/ ctx[45].length + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*platformsPromise*/ 4096) {
    				each_value = /*platforms*/ ctx[45];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty[0] & /*selectedPlatformId, platformsPromise*/ 4104) {
    				select_option(select, /*selectedPlatformId*/ ctx[3]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(select);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(367:8) {:then platforms}",
    		ctx
    	});

    	return block;
    }

    // (380:16) {#each platforms as platform}
    function create_each_block(ctx) {
    	let option;
    	let t0_value = /*platform*/ ctx[46].name + "";
    	let t0;
    	let t1;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();
    			option.__value = option_value_value = /*platform*/ ctx[46]._id;
    			option.value = option.__value;
    			add_location(option, file, 380, 20, 12578);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t0);
    			append_dev(option, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*platformsPromise*/ 4096 && t0_value !== (t0_value = /*platform*/ ctx[46].name + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*platformsPromise*/ 4096 && option_value_value !== (option_value_value = /*platform*/ ctx[46]._id)) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(380:16) {#each platforms as platform}",
    		ctx
    	});

    	return block;
    }

    // (365:33)              <p>... loading platforms ...</p>         {:then platforms}
    function create_pending_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "... loading platforms ...";
    			add_location(p, file, 365, 12, 12057);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(365:33)              <p>... loading platforms ...</p>         {:then platforms}",
    		ctx
    	});

    	return block;
    }

    // (400:4) {#if selectedMeetId && selectedPlatformId}
    function create_if_block_6(ctx) {
    	let hr;
    	let t0;
    	let label;
    	let t2;
    	let input;
    	let t3;
    	let button;
    	let t5;
    	let if_block_anchor;
    	let mounted;
    	let dispose;
    	let if_block = /*attemptedToCheckLiftingCastCredentials*/ ctx[5] && create_if_block_7(ctx);

    	const block = {
    		c: function create() {
    			hr = element("hr");
    			t0 = space();
    			label = element("label");
    			label.textContent = "LiftingCast meet password";
    			t2 = space();
    			input = element("input");
    			t3 = space();
    			button = element("button");
    			button.textContent = "Verify meet credentials";
    			t5 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(hr, "class", "svelte-1dqar03");
    			add_location(hr, file, 400, 8, 13273);
    			attr_dev(label, "for", "password");
    			add_location(label, file, 402, 8, 13288);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "id", "password");
    			set_style(input, "display", "block");
    			add_location(input, file, 405, 8, 13374);
    			set_style(button, "display", "block");
    			add_location(button, file, 412, 8, 13596);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, hr, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, label, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*password*/ ctx[4]);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, button, anchor);
    			insert_dev(target, t5, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler_1*/ ctx[38]),
    					listen_dev(input, "keydown", /*handlePasswordTextFieldKeyDown*/ ctx[23], false, false, false),
    					listen_dev(button, "click", /*checkLiftingCastCredentials*/ ctx[22], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*password*/ 16 && input.value !== /*password*/ ctx[4]) {
    				set_input_value(input, /*password*/ ctx[4]);
    			}

    			if (/*attemptedToCheckLiftingCastCredentials*/ ctx[5]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_7(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(hr);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(label);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t5);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(400:4) {#if selectedMeetId && selectedPlatformId}",
    		ctx
    	});

    	return block;
    }

    // (420:8) {#if attemptedToCheckLiftingCastCredentials}
    function create_if_block_7(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*completedCheckingLiftingCastCredentials*/ ctx[6] && /*areLiftingCastCredentialsValid*/ ctx[7]) return create_if_block_8;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(420:8) {#if attemptedToCheckLiftingCastCredentials}",
    		ctx
    	});

    	return block;
    }

    // (423:12) {:else}
    function create_else_block(ctx) {
    	let p0;
    	let t0;
    	let t1;
    	let t2;
    	let p1;
    	let t3;
    	let t4;

    	const block = {
    		c: function create() {
    			p0 = element("p");
    			t0 = text("Could not successfully verify meet credentials via ");
    			t1 = text(/*credentialCheckUrl*/ ctx[13]);
    			t2 = space();
    			p1 = element("p");
    			t3 = text("Error message: ");
    			t4 = text(/*liftingCastLoginResponse*/ ctx[8]);
    			attr_dev(p0, "class", "error svelte-1dqar03");
    			add_location(p0, file, 423, 16, 14020);
    			attr_dev(p1, "class", "error svelte-1dqar03");
    			add_location(p1, file, 424, 16, 14129);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p0, anchor);
    			append_dev(p0, t0);
    			append_dev(p0, t1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, t3);
    			append_dev(p1, t4);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*credentialCheckUrl*/ 8192) set_data_dev(t1, /*credentialCheckUrl*/ ctx[13]);
    			if (dirty[0] & /*liftingCastLoginResponse*/ 256) set_data_dev(t4, /*liftingCastLoginResponse*/ ctx[8]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(p1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(423:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (421:12) {#if completedCheckingLiftingCastCredentials && areLiftingCastCredentialsValid }
    function create_if_block_8(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Meet credentials verified with LiftingCast server.";
    			add_location(p, file, 421, 16, 13926);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(421:12) {#if completedCheckingLiftingCastCredentials && areLiftingCastCredentialsValid }",
    		ctx
    	});

    	return block;
    }

    // (440:42) 
    function create_if_block_5(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Click button below to configure DRL with your LiftingCast meet and platform info.";
    			attr_dev(p, "class", "help svelte-1dqar03");
    			add_location(p, file, 440, 8, 14802);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(440:42) ",
    		ctx
    	});

    	return block;
    }

    // (438:83) 
    function create_if_block_4(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Enter your meet password and verify meet credentials before submitting configuration to DRL.";
    			attr_dev(p, "class", "help svelte-1dqar03");
    			add_location(p, file, 438, 8, 14638);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(438:83) ",
    		ctx
    	});

    	return block;
    }

    // (436:54) 
    function create_if_block_3(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Select your platform.";
    			attr_dev(p, "class", "help svelte-1dqar03");
    			add_location(p, file, 436, 8, 14504);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(436:54) ",
    		ctx
    	});

    	return block;
    }

    // (434:46) 
    function create_if_block_2(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Select your meet.";
    			attr_dev(p, "class", "help svelte-1dqar03");
    			add_location(p, file, 434, 8, 14403);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(434:46) ",
    		ctx
    	});

    	return block;
    }

    // (432:4) {#if !meetsPromise}
    function create_if_block_1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Fetch the meets for your LiftingCast server type.";
    			attr_dev(p, "class", "help svelte-1dqar03");
    			add_location(p, file, 432, 8, 14278);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(432:4) {#if !meetsPromise}",
    		ctx
    	});

    	return block;
    }

    // (451:4) {#if isDrlConfigured}
    function create_if_block(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "DRL has been configured";
    			add_location(div, file, 451, 8, 15145);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(451:4) {#if isDrlConfigured}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let raw_value = "DRL <-> LiftingCast Configuration" + "";
    	let t0;
    	let div;
    	let label0;
    	let input0;
    	let t1;
    	let t2;
    	let label1;
    	let input1;
    	let t3;
    	let t4;
    	let t5;
    	let button0;
    	let t7;
    	let t8;
    	let t9;
    	let t10;
    	let hr;
    	let t11;
    	let t12;
    	let button1;
    	let t13;
    	let button1_disabled_value;
    	let t14;
    	let mounted;
    	let dispose;
    	let if_block0 = /*serverType*/ ctx[0] === /*SERVER_TYPE*/ ctx[14].RELAY_SERVER && create_if_block_11(ctx);
    	let if_block1 = /*meetsPromise*/ ctx[11] && create_if_block_10(ctx);
    	let if_block2 = /*platformsPromise*/ ctx[12] && create_if_block_9(ctx);
    	let if_block3 = /*selectedMeetId*/ ctx[2] && /*selectedPlatformId*/ ctx[3] && create_if_block_6(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (!/*meetsPromise*/ ctx[11]) return create_if_block_1;
    		if (/*meetsPromise*/ ctx[11] && !/*selectedMeetId*/ ctx[2]) return create_if_block_2;
    		if (/*platformsPromise*/ ctx[12] && !/*selectedPlatformId*/ ctx[3]) return create_if_block_3;
    		if (/*selectedMeetId*/ ctx[2] && /*selectedPlatformId*/ ctx[3] && !/*canSubmitConfigurationToDrl*/ ctx[10]) return create_if_block_4;
    		if (/*canSubmitConfigurationToDrl*/ ctx[10]) return create_if_block_5;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block4 = current_block_type && current_block_type(ctx);
    	let if_block5 = /*isDrlConfigured*/ ctx[9] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			t0 = space();
    			div = element("div");
    			label0 = element("label");
    			input0 = element("input");
    			t1 = text("\n            LiftingCast.com");
    			t2 = space();
    			label1 = element("label");
    			input1 = element("input");
    			t3 = text("\n            Relay Server");
    			t4 = space();
    			if (if_block0) if_block0.c();
    			t5 = space();
    			button0 = element("button");
    			button0.textContent = "Fetch meets";
    			t7 = space();
    			if (if_block1) if_block1.c();
    			t8 = space();
    			if (if_block2) if_block2.c();
    			t9 = space();
    			if (if_block3) if_block3.c();
    			t10 = space();
    			hr = element("hr");
    			t11 = space();
    			if (if_block4) if_block4.c();
    			t12 = space();
    			button1 = element("button");
    			t13 = text("Configure DRL with meet and platform info");
    			t14 = space();
    			if (if_block5) if_block5.c();
    			attr_dev(h1, "class", "svelte-1dqar03");
    			add_location(h1, file, 275, 4, 9443);
    			attr_dev(input0, "type", "radio");
    			attr_dev(input0, "name", "serverType");
    			attr_dev(input0, "id", "lifting-cast-server-type");
    			input0.__value = /*SERVER_TYPE*/ ctx[14].LIFTING_CAST;
    			input0.value = input0.__value;
    			input0.checked = true;
    			/*$$binding_groups*/ ctx[30][0].push(input0);
    			add_location(input0, file, 279, 12, 9566);
    			attr_dev(label0, "for", "lifting-cast-server-type");
    			add_location(label0, file, 278, 8, 9515);
    			attr_dev(input1, "type", "radio");
    			attr_dev(input1, "name", "serverType");
    			attr_dev(input1, "id", "server-type-relay-server");
    			input1.__value = /*SERVER_TYPE*/ ctx[14].RELAY_SERVER;
    			input1.value = input1.__value;
    			/*$$binding_groups*/ ctx[30][0].push(input1);
    			add_location(input1, file, 291, 12, 9939);
    			attr_dev(label1, "for", "server-type-relay-server");
    			add_location(label1, file, 290, 8, 9888);
    			add_location(div, file, 277, 4, 9501);
    			add_location(button0, file, 317, 4, 10730);
    			attr_dev(hr, "class", "svelte-1dqar03");
    			add_location(hr, file, 429, 4, 14239);
    			button1.disabled = button1_disabled_value = !/*canSubmitConfigurationToDrl*/ ctx[10] || undefined;
    			add_location(button1, file, 443, 4, 14919);
    			attr_dev(main, "class", "svelte-1dqar03");
    			add_location(main, file, 274, 0, 9432);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			h1.innerHTML = raw_value;
    			append_dev(main, t0);
    			append_dev(main, div);
    			append_dev(div, label0);
    			append_dev(label0, input0);
    			input0.checked = input0.__value === /*serverType*/ ctx[0];
    			append_dev(label0, t1);
    			append_dev(div, t2);
    			append_dev(div, label1);
    			append_dev(label1, input1);
    			input1.checked = input1.__value === /*serverType*/ ctx[0];
    			append_dev(label1, t3);
    			append_dev(main, t4);
    			if (if_block0) if_block0.m(main, null);
    			append_dev(main, t5);
    			append_dev(main, button0);
    			append_dev(main, t7);
    			if (if_block1) if_block1.m(main, null);
    			append_dev(main, t8);
    			if (if_block2) if_block2.m(main, null);
    			append_dev(main, t9);
    			if (if_block3) if_block3.m(main, null);
    			append_dev(main, t10);
    			append_dev(main, hr);
    			append_dev(main, t11);
    			if (if_block4) if_block4.m(main, null);
    			append_dev(main, t12);
    			append_dev(main, button1);
    			append_dev(button1, t13);
    			append_dev(main, t14);
    			if (if_block5) if_block5.m(main, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*input0_change_handler*/ ctx[29]),
    					listen_dev(input1, "change", /*input1_change_handler*/ ctx[31]),
    					listen_dev(button0, "click", /*click_handler*/ ctx[33], false, false, false),
    					listen_dev(button1, "click", /*sendLiftingCastInfoToDrl*/ ctx[24], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*serverType*/ 1) {
    				input0.checked = input0.__value === /*serverType*/ ctx[0];
    			}

    			if (dirty[0] & /*serverType*/ 1) {
    				input1.checked = input1.__value === /*serverType*/ ctx[0];
    			}

    			if (/*serverType*/ ctx[0] === /*SERVER_TYPE*/ ctx[14].RELAY_SERVER) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_11(ctx);
    					if_block0.c();
    					if_block0.m(main, t5);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*meetsPromise*/ ctx[11]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_10(ctx);
    					if_block1.c();
    					if_block1.m(main, t8);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*platformsPromise*/ ctx[12]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_9(ctx);
    					if_block2.c();
    					if_block2.m(main, t9);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*selectedMeetId*/ ctx[2] && /*selectedPlatformId*/ ctx[3]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_6(ctx);
    					if_block3.c();
    					if_block3.m(main, t10);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (current_block_type !== (current_block_type = select_block_type_1(ctx))) {
    				if (if_block4) if_block4.d(1);
    				if_block4 = current_block_type && current_block_type(ctx);

    				if (if_block4) {
    					if_block4.c();
    					if_block4.m(main, t12);
    				}
    			}

    			if (dirty[0] & /*canSubmitConfigurationToDrl*/ 1024 && button1_disabled_value !== (button1_disabled_value = !/*canSubmitConfigurationToDrl*/ ctx[10] || undefined)) {
    				prop_dev(button1, "disabled", button1_disabled_value);
    			}

    			if (/*isDrlConfigured*/ ctx[9]) {
    				if (if_block5) ; else {
    					if_block5 = create_if_block(ctx);
    					if_block5.c();
    					if_block5.m(main, null);
    				}
    			} else if (if_block5) {
    				if_block5.d(1);
    				if_block5 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			/*$$binding_groups*/ ctx[30][0].splice(/*$$binding_groups*/ ctx[30][0].indexOf(input0), 1);
    			/*$$binding_groups*/ ctx[30][0].splice(/*$$binding_groups*/ ctx[30][0].indexOf(input1), 1);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();

    			if (if_block4) {
    				if_block4.d();
    			}

    			if (if_block5) if_block5.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const DRL_URL = "/lifting-cast-platform-config";
    const LIFTING_CAST_BASE_URL = "https://liftingcast.com";
    const LIFTING_CAST_CREDENTIAL_CHECK_URL = "https://couchdb.liftingcast.com/_session";

    function isServerError(response) {
    	return response.status >= 500;
    }

    function isUnauthorized(response) {
    	return response.status === 401;
    }

    function instance($$self, $$props, $$invalidate) {
    	let isRelayServer;
    	let liftingCastBaseUrl;
    	let credentialCheckUrl;
    	let liftingCastApiUrl;
    	let canSubmitConfigurationToDrl;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let DEBUG_LOGGING = true;

    	function debug_log(...args) {
    		if (DEBUG_LOGGING) {
    			console.log.apply(undefined, args);
    		}
    	}

    	// These will be sent to the server as "server_type"; the values match those expected server-side.
    	const SERVER_TYPE = {
    		LIFTING_CAST: "mainSite",
    		RELAY_SERVER: "relay"
    	};

    	let serverType = SERVER_TYPE.LIFTING_CAST;
    	let relayServerIpAddress = "";

    	// Or http://<ip address>
    	//   ex:
    	//   let liftingCastBaseUrl = "http://10.0.0.58";
    	let meetsPromise;

    	let meetsForDebug = [];
    	let selectedMeetId = "";
    	let platformsPromise;
    	let platformsForDebug = [];
    	let selectedPlatformId = "";
    	let password = "";
    	let attemptedToCheckLiftingCastCredentials = false;
    	let completedCheckingLiftingCastCredentials = false;
    	let areLiftingCastCredentialsValid = false;
    	let liftingCastLoginResponse = "";
    	let isDrlConfigured = false;

    	function handleRelayUrlTextFieldKeyDown(event) {
    		if (event.key === "Enter") {
    			$$invalidate(11, meetsPromise = fetchMeets());
    		}
    	}

    	function parseDate(dateString) {
    		return parse(dateString, "MM/dd/yyyy", new Date());
    	}

    	function isBeforeToday(dateString) {
    		return isBefore(parseDate(dateString), startOfToday());
    	}

    	function liftingCastMeetsUrl() {
    		return `${liftingCastApiUrl}/meets`;
    	}

    	function liftingCastPlatfomsUrl(meetId) {
    		return `${liftingCastApiUrl}/meets/${meetId}/platforms`;
    	}

    	async function fetchMeets() {
    		const response = await fetch(liftingCastMeetsUrl());
    		const json = await response.json();

    		// TODO: Handle HTTP errors and response errors
    		const docs = json.docs;

    		const meets = transduce(compose(filter(prop("date")), filter(propSatisfies(dateString => !isBeforeToday(dateString), "date"))), flip(append$1), [], sortBy(prop("date"))(docs));
    		debug_log("sorted meets not in the past", meets);
    		$$invalidate(25, meetsForDebug = meets);
    		return meets;
    	}

    	async function fetchPlatforms(meetId) {
    		debug_log(`Fetching platforms for meet id ${meetId}`);
    		const response = await fetch(liftingCastPlatfomsUrl(meetId));
    		const json = await response.json();

    		// TODO: Handle HTTP errors and response errors
    		const docs = json.docs;

    		const platforms = sortBy(prop("name"))(docs);
    		debug_log("sorted platforms", JSON.stringify(platforms, undefined, 2));
    		$$invalidate(26, platformsForDebug = platforms);
    		return platforms;
    	}

    	function handleMeetSelection(event) {
    		const meetId = event.target.value;
    		$$invalidate(2, selectedMeetId = meetId);
    		debug_log("selectedMeetId", meetId);
    		$$invalidate(12, platformsPromise = fetchPlatforms(meetId));
    	}

    	function handlePlatformSelection(event) {
    		const platformId = event.target.value;
    		$$invalidate(3, selectedPlatformId = platformId);
    		debug_log("selectedPlatformId", platformId);
    	}

    	async function checkLiftingCastCredentials() {
    		$$invalidate(5, attemptedToCheckLiftingCastCredentials = true);
    		debug_log("Checking LiftingCast credentials:", JSON.stringify({ name: selectedMeetId, password }, undefined, 2));

    		const request = new Request(credentialCheckUrl,
    		{
    				method: "POST",
    				headers: {
    					"Content-Type": "application/json",
    					"Accept": "application/json"
    				},
    				body: JSON.stringify({ name: selectedMeetId, password })
    			});

    		try {
    			const response = await fetch(request);
    			const json = await response.json();
    			debug_log("response status:", response.status);
    			debug_log("login response:", JSON.stringify(json, undefined, 2));
    			debug_log("LiftingCast reports ok?", prop("ok", json));

    			if (isUnauthorized(response)) {
    				$$invalidate(6, completedCheckingLiftingCastCredentials = true);
    				$$invalidate(8, liftingCastLoginResponse = JSON.stringify(json, undefined, 2));
    				$$invalidate(7, areLiftingCastCredentialsValid = false);
    			}

    			if (isServerError(response)) {
    				$$invalidate(6, completedCheckingLiftingCastCredentials = false);
    				$$invalidate(8, liftingCastLoginResponse = `Something went wrong with the LiftingCast server: ${json}`);
    				$$invalidate(7, areLiftingCastCredentialsValid = undefined);
    			} else if (!response.ok) {
    				// Any other non-2xx HTTP response
    				$$invalidate(6, completedCheckingLiftingCastCredentials = true);

    				$$invalidate(8, liftingCastLoginResponse = `Response from LiftingCast Server: ${JSON.stringify(json, undefined, 2)}`);
    				$$invalidate(7, areLiftingCastCredentialsValid = undefined);
    			} else {
    				// Success
    				$$invalidate(6, completedCheckingLiftingCastCredentials = true);

    				$$invalidate(7, areLiftingCastCredentialsValid = true);
    			}
    		} catch(e) {
    			// Network error
    			$$invalidate(6, completedCheckingLiftingCastCredentials = false);

    			$$invalidate(8, liftingCastLoginResponse = e);
    			$$invalidate(7, areLiftingCastCredentialsValid = undefined);
    		}
    	}

    	function handlePasswordTextFieldKeyDown(event) {
    		if (event.key === "Enter") {
    			checkLiftingCastCredentials();
    		} else {
    			$$invalidate(5, attemptedToCheckLiftingCastCredentials = false);
    			$$invalidate(6, completedCheckingLiftingCastCredentials = false);
    		}
    	}

    	const conditionallyAddRelayServerIpAddress = when(propEq("server_type", SERVER_TYPE.RELAY_SERVER), assoc("local_relay_server_ip_address", relayServerIpAddress));

    	async function sendLiftingCastInfoToDrl() {
    		if (canSubmitConfigurationToDrl) {
    			const request = new Request(DRL_URL,
    			{
    					method: "POST",
    					headers: {
    						"Content-Type": "application/json",
    						"Accept": "application/json"
    					},
    					body: JSON.stringify(conditionallyAddRelayServerIpAddress({
    						server_type: serverType,
    						meet_id: selectedMeetId,
    						password,
    						platform_id: selectedPlatformId
    					}))
    				});

    			const response = await fetch(request);

    			// TODO: Handle network error.
    			// TODO: Handle HTTP errors and response errors
    			if (response.ok) {
    				$$invalidate(9, isDrlConfigured = true);
    			} else {
    				$$invalidate(9, isDrlConfigured = false);
    			} // TODO: Error message
    			// TODO: Retry? Recover?
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const $$binding_groups = [[]];

    	function input0_change_handler() {
    		serverType = this.__value;
    		$$invalidate(0, serverType);
    	}

    	function input1_change_handler() {
    		serverType = this.__value;
    		$$invalidate(0, serverType);
    	}

    	function input_input_handler() {
    		relayServerIpAddress = this.value;
    		$$invalidate(1, relayServerIpAddress);
    	}

    	const click_handler = () => {
    		$$invalidate(11, meetsPromise = fetchMeets());
    	};

    	function select_change_handler() {
    		selectedMeetId = select_value(this);
    		$$invalidate(2, selectedMeetId);
    		$$invalidate(11, meetsPromise);
    	}

    	const click_handler_1 = () => {
    		$$invalidate(11, meetsPromise = fetchMeets());
    	};

    	function select_change_handler_1() {
    		selectedPlatformId = select_value(this);
    		$$invalidate(3, selectedPlatformId);
    		$$invalidate(12, platformsPromise);
    	}

    	const click_handler_2 = () => {
    		$$invalidate(12, platformsPromise = fetchPlatforms(selectedMeetId));
    	};

    	function input_input_handler_1() {
    		password = this.value;
    		$$invalidate(4, password);
    	}

    	$$self.$capture_state = () => ({
    		R,
    		isBefore,
    		parse,
    		startOfToday,
    		DEBUG_LOGGING,
    		debug_log,
    		DRL_URL,
    		SERVER_TYPE,
    		LIFTING_CAST_BASE_URL,
    		LIFTING_CAST_CREDENTIAL_CHECK_URL,
    		serverType,
    		relayServerIpAddress,
    		meetsPromise,
    		meetsForDebug,
    		selectedMeetId,
    		platformsPromise,
    		platformsForDebug,
    		selectedPlatformId,
    		password,
    		attemptedToCheckLiftingCastCredentials,
    		completedCheckingLiftingCastCredentials,
    		areLiftingCastCredentialsValid,
    		liftingCastLoginResponse,
    		isDrlConfigured,
    		handleRelayUrlTextFieldKeyDown,
    		parseDate,
    		isBeforeToday,
    		liftingCastMeetsUrl,
    		liftingCastPlatfomsUrl,
    		fetchMeets,
    		fetchPlatforms,
    		handleMeetSelection,
    		handlePlatformSelection,
    		isServerError,
    		isUnauthorized,
    		checkLiftingCastCredentials,
    		handlePasswordTextFieldKeyDown,
    		conditionallyAddRelayServerIpAddress,
    		sendLiftingCastInfoToDrl,
    		isRelayServer,
    		liftingCastBaseUrl,
    		credentialCheckUrl,
    		liftingCastApiUrl,
    		canSubmitConfigurationToDrl
    	});

    	$$self.$inject_state = $$props => {
    		if ("DEBUG_LOGGING" in $$props) DEBUG_LOGGING = $$props.DEBUG_LOGGING;
    		if ("serverType" in $$props) $$invalidate(0, serverType = $$props.serverType);
    		if ("relayServerIpAddress" in $$props) $$invalidate(1, relayServerIpAddress = $$props.relayServerIpAddress);
    		if ("meetsPromise" in $$props) $$invalidate(11, meetsPromise = $$props.meetsPromise);
    		if ("meetsForDebug" in $$props) $$invalidate(25, meetsForDebug = $$props.meetsForDebug);
    		if ("selectedMeetId" in $$props) $$invalidate(2, selectedMeetId = $$props.selectedMeetId);
    		if ("platformsPromise" in $$props) $$invalidate(12, platformsPromise = $$props.platformsPromise);
    		if ("platformsForDebug" in $$props) $$invalidate(26, platformsForDebug = $$props.platformsForDebug);
    		if ("selectedPlatformId" in $$props) $$invalidate(3, selectedPlatformId = $$props.selectedPlatformId);
    		if ("password" in $$props) $$invalidate(4, password = $$props.password);
    		if ("attemptedToCheckLiftingCastCredentials" in $$props) $$invalidate(5, attemptedToCheckLiftingCastCredentials = $$props.attemptedToCheckLiftingCastCredentials);
    		if ("completedCheckingLiftingCastCredentials" in $$props) $$invalidate(6, completedCheckingLiftingCastCredentials = $$props.completedCheckingLiftingCastCredentials);
    		if ("areLiftingCastCredentialsValid" in $$props) $$invalidate(7, areLiftingCastCredentialsValid = $$props.areLiftingCastCredentialsValid);
    		if ("liftingCastLoginResponse" in $$props) $$invalidate(8, liftingCastLoginResponse = $$props.liftingCastLoginResponse);
    		if ("isDrlConfigured" in $$props) $$invalidate(9, isDrlConfigured = $$props.isDrlConfigured);
    		if ("isRelayServer" in $$props) $$invalidate(27, isRelayServer = $$props.isRelayServer);
    		if ("liftingCastBaseUrl" in $$props) $$invalidate(28, liftingCastBaseUrl = $$props.liftingCastBaseUrl);
    		if ("credentialCheckUrl" in $$props) $$invalidate(13, credentialCheckUrl = $$props.credentialCheckUrl);
    		if ("liftingCastApiUrl" in $$props) liftingCastApiUrl = $$props.liftingCastApiUrl;
    		if ("canSubmitConfigurationToDrl" in $$props) $$invalidate(10, canSubmitConfigurationToDrl = $$props.canSubmitConfigurationToDrl);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*serverType*/ 1) {
    			debug_log("serverType set to", serverType);
    		}

    		if ($$self.$$.dirty[0] & /*serverType*/ 1) {
    			$$invalidate(27, isRelayServer = serverType === SERVER_TYPE.RELAY_SERVER);
    		}

    		if ($$self.$$.dirty[0] & /*isRelayServer, relayServerIpAddress*/ 134217730) {
    			$$invalidate(28, liftingCastBaseUrl = isRelayServer
    			? `http://${relayServerIpAddress}`
    			: LIFTING_CAST_BASE_URL);
    		}

    		if ($$self.$$.dirty[0] & /*isRelayServer, relayServerIpAddress*/ 134217730) {
    			$$invalidate(13, credentialCheckUrl = isRelayServer
    			? `http://couchdb.${relayServerIpAddress}/_session`
    			: LIFTING_CAST_CREDENTIAL_CHECK_URL);
    		}

    		if ($$self.$$.dirty[0] & /*liftingCastBaseUrl*/ 268435456) {
    			liftingCastApiUrl = `${liftingCastBaseUrl}/api`;
    		}

    		if ($$self.$$.dirty[0] & /*liftingCastBaseUrl*/ 268435456) {
    			debug_log("baseUrl set to", liftingCastBaseUrl);
    		}

    		if ($$self.$$.dirty[0] & /*selectedMeetId, meetsForDebug*/ 33554436) {
    			debug_log("meet selected:", find(propEq("_id", selectedMeetId), meetsForDebug));
    		}

    		if ($$self.$$.dirty[0] & /*selectedPlatformId, platformsForDebug*/ 67108872) {
    			debug_log("platform selected:", find(propEq("_id", selectedPlatformId), platformsForDebug));
    		}

    		if ($$self.$$.dirty[0] & /*password*/ 16) {
    			debug_log("password set to", password);
    		}

    		if ($$self.$$.dirty[0] & /*attemptedToCheckLiftingCastCredentials*/ 32) {
    			debug_log("attemptedToCheckLiftingCastCredentials set to", attemptedToCheckLiftingCastCredentials);
    		}

    		if ($$self.$$.dirty[0] & /*completedCheckingLiftingCastCredentials*/ 64) {
    			debug_log("completedCheckingLiftingCastCredentials set to", completedCheckingLiftingCastCredentials);
    		}

    		if ($$self.$$.dirty[0] & /*areLiftingCastCredentialsValid*/ 128) {
    			debug_log("areLiftingCastCredentialsValid set to", areLiftingCastCredentialsValid);
    		}

    		if ($$self.$$.dirty[0] & /*liftingCastLoginResponse*/ 256) {
    			debug_log("liftingCastLoginResponse:", liftingCastLoginResponse);
    		}

    		if ($$self.$$.dirty[0] & /*attemptedToCheckLiftingCastCredentials, completedCheckingLiftingCastCredentials, areLiftingCastCredentialsValid, serverType, relayServerIpAddress, selectedMeetId, password, selectedPlatformId*/ 255) {
    			$$invalidate(10, canSubmitConfigurationToDrl = attemptedToCheckLiftingCastCredentials && completedCheckingLiftingCastCredentials && areLiftingCastCredentialsValid && (serverType === SERVER_TYPE.LIFTING_CAST || serverType === SERVER_TYPE.RELAY_SERVER && !isEmpty(relayServerIpAddress)) && selectedMeetId && password && selectedPlatformId);
    		}

    		if ($$self.$$.dirty[0] & /*canSubmitConfigurationToDrl*/ 1024) {
    			debug_log("canSubmitConfigurationToDrl", canSubmitConfigurationToDrl);
    		}

    		if ($$self.$$.dirty[0] & /*isDrlConfigured*/ 512) {
    			debug_log("isDrlConfigured set to", isDrlConfigured);
    		}
    	};

    	return [
    		serverType,
    		relayServerIpAddress,
    		selectedMeetId,
    		selectedPlatformId,
    		password,
    		attemptedToCheckLiftingCastCredentials,
    		completedCheckingLiftingCastCredentials,
    		areLiftingCastCredentialsValid,
    		liftingCastLoginResponse,
    		isDrlConfigured,
    		canSubmitConfigurationToDrl,
    		meetsPromise,
    		platformsPromise,
    		credentialCheckUrl,
    		SERVER_TYPE,
    		handleRelayUrlTextFieldKeyDown,
    		liftingCastMeetsUrl,
    		liftingCastPlatfomsUrl,
    		fetchMeets,
    		fetchPlatforms,
    		handleMeetSelection,
    		handlePlatformSelection,
    		checkLiftingCastCredentials,
    		handlePasswordTextFieldKeyDown,
    		sendLiftingCastInfoToDrl,
    		meetsForDebug,
    		platformsForDebug,
    		isRelayServer,
    		liftingCastBaseUrl,
    		input0_change_handler,
    		$$binding_groups,
    		input1_change_handler,
    		input_input_handler,
    		click_handler,
    		select_change_handler,
    		click_handler_1,
    		select_change_handler_1,
    		click_handler_2,
    		input_input_handler_1
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
