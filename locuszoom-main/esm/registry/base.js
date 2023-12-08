/**
 * @module
 * @private
 */

/**
 * Base class for all registries.
 *
 * LocusZoom is plugin-extensible, and layouts are JSON-serializable objects that refer to desired features by name (not by class).
 * This is achieved through the use of a central registry that holds a reference to each possible feature.
 *
 * Each registry has some syntactical sugar to make it easier to, eg, modify layouts or create classes.
 * This class is documented solely so that those helper methods can be referenced.
 */
class RegistryBase {
    constructor() {
        this._items = new Map();
    }

    /**
     * Return the registry member. If the registry stores classes, this returns the class, not the instance.
     * @param {String} name
     * @returns {Function}
     */
    get(name) {
        if (!this._items.has(name)) {
            throw new Error(`Item not found: ${name}`);
        }
        return this._items.get(name);
    }

    /**
     * Add a new item to the registry
     * @param {String} name The name of the item to add to the registry
     * @param {*} item The item to be added (constructor, value, etc)
     * @param {boolean} [override=false] Allow redefining an existing item?
     * @return {*} The actual object as added to the registry
     */
    add(name, item, override = false) {
        if (!override && this._items.has(name)) {
            throw new Error(`Item ${name} is already defined`);
        }
        this._items.set(name, item);
        return item;
    }

    /**
     * Remove a datasource from the registry (if present)
     * @param {String} name
     * @returns {boolean} True if item removed, false if item was never present
     */
    remove(name) {
        return this._items.delete(name);
    }

    /**
     * Check whether the specified item is registered
     * @param {String} name
     * @returns {boolean}
     */
    has(name) {
        return this._items.has(name);
    }

    /**
     * Names of each allowed
     * @returns {String[]}
     */
    list() {
        return Array.from(this._items.keys());
    }
}

/**
 * A specialized registry whose members are class constructors. Contains helper methods for creating instances
 *  and subclasses.
 * @ignore
 */
class ClassRegistry extends RegistryBase {
    /**
     * Create an instance of the specified class from the registry
     * @param {String} name
     * @param {*} args Any additional arguments to be passed to the constructor
     * @returns {*}
     */
    create(name, ...args) {
        const base = this.get(name);
        return new base(...args);
    }

    /**
     * Create a new child class for an item in the registry.
     *
     * This is (almost, but not quite) a compatibility layer for old sites that used locuszoom
     *
     * This is primarily aimed at low-tooling environments. It is syntactic sugar, roughly equivalent to:
     *   `registry.get(base); registry.add(name, class A extends base {});`
     *
     * Because this bypasses es6 class mechanics, certain things, esp super calls, may not work as well as using the
     *   "real" class expression. This method is provided solely for convenience.
     *
     * This method is a compatibility layer for old versions. Born to be deprecated!
     * @deprecated
     * @param {string} parent_name The name of the desired parent class as represented in the registry
     * @param {string} source_name The desired name of the class to be created, as it will be named in the registry
     * @param {object} overrides An object
     * @return {*}
     */
    extend(parent_name, source_name, overrides) {
        console.warn('Deprecation warning: .extend method will be removed in future versions, in favor of explicit ES6 subclasses');
        if (arguments.length !== 3) {
            throw new Error('Invalid arguments to .extend');
        }

        const base = this.get(parent_name);
        class sub extends base {}
        Object.assign(sub.prototype, overrides, base);
        this.add(source_name, sub);
        return sub;
    }
}


export default RegistryBase;
export {RegistryBase, ClassRegistry};
