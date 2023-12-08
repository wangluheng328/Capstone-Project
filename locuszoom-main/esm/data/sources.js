import {RegistryBase} from '../registry/base';
import { ADAPTERS } from '../registry';

/**
 * Create and coordinate an ensemble of (namespaced) data adapter instances.
 * This is the mechanism by which users tell a plot how to retrieve data for a specific plot: adapters are created
 *  through this object rather than instantiating directly.
 *
 * @public
 * @alias module:LocusZoom~DataSources
 * @extends module:registry/base~RegistryBase
 * @inheritDoc
 */
class DataSources extends RegistryBase {
    /**
     * @param {RegistryBase} [registry] Primarily used for unit testing. When creating sources by name, specify where to
     *  find the registry of known sources.
     */
    constructor(registry) {
        super();
        // This both acts as a registry (of the instantiated sources for this plot), and references a registry
        //   (to locate adapter classes by name, when creating from config)
        this._registry = registry || ADAPTERS;
    }

    /**
     * For data sources, there is a special behavior of "create item from config, then add"
     * @param {String} namespace Uniquely identify this datasource
     * @param {BaseAdapter|Array} item An instantiated datasource, or an array of arguments that can be used to
     *   create a known datasource type.
     * @param [override=false] Whether to allow existing sources to be redefined
     * @return {DataSources} Most registries return the created instance, but this registry returns a reference to
     *  itself (to support chaining)
     */
    add(namespace, item, override = false) {
        if (this._registry.has(namespace)) {
            throw new Error(`The namespace ${namespace} is already in use by another source`);
        }

        if (namespace.match(/[^A-Za-z0-9_]/)) {
            throw new Error(`Data source namespace names can only contain alphanumeric characters or underscores. Invalid name: ${namespace}`);
        }
        if (Array.isArray(item)) {
            const [type, options] = item;
            item = this._registry.create(type, options);
        }
        // Each datasource in the chain should be aware of its assigned namespace
        item.source_id = namespace;

        super.add(namespace, item, override);
        return this;
    }
}


export default DataSources;
