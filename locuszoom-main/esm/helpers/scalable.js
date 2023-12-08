/**
 * Plugin registry of available functions that can be used in scalable layout directives.
 *
 * These "scale functions" are used during rendering to return output (eg color) based on input value
 *
 * @module LocusZoom_ScaleFunctions
 * @see {@link module:LocusZoom_DataLayers~ScalableParameter} for details on how scale functions are used by datalayers
 */

import * as d3 from 'd3';

/**
 * Basic conditional function to evaluate the value of the input field and return based on equality.
 * @alias module:LocusZoom_ScaleFunctions~if
 * @param {Object} parameters
 * @param {*} parameters.field_value The value against which to test the input value.
 * @param {*} parameters.then The value to return if the input value matches the field value
 * @param {*} parameters.else  The value to return if the input value does not match the field value. Optional. If not
 *   defined this scale function will return null (or value of null_value parameter, if defined) when input value fails
 *   to match field_value.
 * @param {*} value value
 */
const if_value = (parameters, value) => {
    if (typeof value == 'undefined' || parameters.field_value !== value) {
        if (typeof parameters.else != 'undefined') {
            return parameters.else;
        } else {
            return null;
        }
    } else {
        return parameters.then;
    }
};

/**
 * Function to sort numerical values into bins based on numerical break points. Will only operate on numbers and
 *   return null (or value of null_value parameter, if defined) if provided a non-numeric input value. Parameters:
 * @function numerical_bin
 * @param {Object} parameters
 * @param {Number[]} parameters.breaks  Array of numerical break points against which to evaluate the input value.
 *   Must be of equal length to values parameter. If the input value is greater than or equal to break n and less than
 *   or equal to break n+1 (or break n+1 doesn't exist) then returned value is the nth entry in the values parameter.
 * @param {Array} parameters.values  Array of values to return given evaluations against break points. Must be of
 *   equal length to breaks parameter. Each entry n represents the value to return if the input value is greater than
 *   or equal to break n and less than or equal to break n+1 (or break n+1 doesn't exist).
 * @param {*} parameters.null_value
 * @param {*} value value
 * @returns {*}
 */
const numerical_bin = (parameters, value) => {
    const breaks = parameters.breaks || [];
    const values = parameters.values || [];
    if (typeof value == 'undefined' || value === null || isNaN(+value)) {
        return (parameters.null_value ? parameters.null_value : null);
    }
    const threshold = breaks.reduce(function (prev, curr) {
        if (+value < prev || (+value >= prev && +value < curr)) {
            return prev;
        } else {
            return curr;
        }
    });
    return values[breaks.indexOf(threshold)];
};

/**
 * Function to sort values of any type into bins based on direct equality testing with a list of categories.
 *   Will return null if provided an input value that does not match to a listed category.
 * @function categorical_bin
 * @param {Object} parameters
 * @param {Array} parameters.categories  Array of values against which to evaluate the input value. Must be of equal
 *   length to values parameter. If the input value is equal to category n then returned value is the nth entry in the
 *   values parameter.
 * @param {Array} parameters.values  Array of values to return given evaluations against categories. Must be of equal
 *   length to categories parameter. Each entry n represents the value to return if the input value is equal to the nth
 *   value in the categories parameter.
 * @param {*} parameters.null_value  Value to return if the input value fails to match to any categories. Optional.
 */
const categorical_bin = (parameters, value) => {
    if (typeof value == 'undefined' || !parameters.categories.includes(value)) {
        return (parameters.null_value ? parameters.null_value : null);
    } else {
        return parameters.values[parameters.categories.indexOf(value)];
    }
};

/**
 * Cycle through a set of options, so that the each element in a set of data receives a value different than the
 *  element before it. For example: "use this palette of 10 colors to visually distinguish 100 adjacent items"
 * This is useful when ADJACENT items must be guaranteed to yield a different result, but it leads to unstable color
 *  choices if the user pans to a region with a different number/order of items. (the same item is assigned a different color)
 *
 *  See also: stable_choice.
 * @function ordinal_cycle
 *  @param {Object} parameters
 *  @param {Array} parameters.values A list of option values
 * @return {*}
 */
const ordinal_cycle = (parameters, value, index) => {
    const options = parameters.values;
    return options[index % options.length];
};

/**
 * A scale function that auto-chooses something (like color) from a preset scheme, and makes the same choice every
 * time given the same value, regardless of ordering or what other data is in the region
 *
 * This is useful when categories must be stable (same color, every time). But sometimes it will assign adjacent values
 *  the same color due to hash collisions.
 *
 * For performance reasons, this is memoized once per instance. Eg, each scalable color parameter has its own cache.
 *  This function is therefore slightly less amenable to layout mutations like "changing the options after scaling
 *  function is used", but this is not expected to be a common use case.
 *
 *  CAVEAT: Some datasets do not return true datum ids, but instead append synthetic ID fields ("item 1, item2"...)
 *    just to appease D3. This hash function only works if there is a meaningful, stable identifier in the data,
 *    like a category or gene name.
 *
 * @function stable_choice
 *
 * @param parameters
 * @param {Array} [parameters.values] A list of options to choose from
 * @param {Number} [parameters.max_cache_size=500] The maximum number of values to cache. This option is mostly used
 *  for unit testing, because stable choice is intended for datasets with a relatively limited number of
 *  discrete categories.
 * @param value
 * @param index
 */
let stable_choice = (parameters, value, index) => {
    // Each place the function gets used has its own parameters object. This function thus memoizes per usage
    //  ("association - point color - directive 1") rather than globally ("all properties/panels")
    const cache = parameters._cache = parameters._cache || new Map();
    const max_cache_size = parameters.max_cache_size || 500;

    if (cache.size >= max_cache_size) {
        // Prevent cache from growing out of control (eg as user moves between regions a lot)
        cache.clear();
    }
    if (cache.has(value)) {
        return cache.get(value);
    }

    // Simple JS hashcode implementation, from:
    //  https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
    let hash = 0;
    value = String(value);
    for (let i = 0; i < value.length; i++) {
        let chr = value.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    // Convert signed 32 bit integer to be within the range of options allowed
    const options = parameters.values;
    const result = options[Math.abs(hash) % options.length];
    cache.set(value, result);
    return result;
};

/**
 * Function for continuous interpolation of numerical values along a gradient with arbitrarily many break points.
 * @function interpolate
 * @parameters {Object} parameters
 * @parameters {Number[]} parameters.breaks  Array of numerical break points against which to evaluate the input value.
 *   Must be of equal length to values parameter and contain at least two elements. Input value will be evaluated for
 *   relative position between two break points n and n+1 and the returned value will be interpolated at a relative
 *   position between values n and n+1.
 * @parameters {*[]} parameters.values  Array of values to interpolate and return given evaluations against break
 *   points. Must be of equal length to breaks parameter and contain at least two elements. Each entry n represents
 *   the value to return if the input value matches the nth entry in breaks exactly. Note that this scale function
 *   uses d3.interpolate to provide for effective interpolation of many different value types, including numbers,
 *   colors, shapes, etc.
 * @parameters {*} parameters.null_value
 */
const interpolate = (parameters, value) => {
    var breaks = parameters.breaks || [];
    var values = parameters.values || [];
    var nullval = (parameters.null_value ? parameters.null_value : null);
    if (breaks.length < 2 || breaks.length !== values.length) {
        return nullval;
    }
    if (typeof value == 'undefined' || value === null || isNaN(+value)) {
        return nullval;
    }
    if (+value <= parameters.breaks[0]) {
        return values[0];
    } else if (+value >= parameters.breaks[parameters.breaks.length - 1]) {
        return values[breaks.length - 1];
    } else {
        var upper_idx = null;
        breaks.forEach(function (brk, idx) {
            if (!idx) {
                return;
            }
            if (breaks[idx - 1] <= +value && breaks[idx] >= +value) {
                upper_idx = idx;
            }
        });
        if (upper_idx === null) {
            return nullval;
        }
        const normalized_input = (+value - breaks[upper_idx - 1]) / (breaks[upper_idx] - breaks[upper_idx - 1]);
        if (!isFinite(normalized_input)) {
            return nullval;
        }
        return d3.interpolate(values[upper_idx - 1], values[upper_idx])(normalized_input);
    }
};


/**
 * Calculate the effect direction based on beta, or the combination of beta and standard error.
 *   Typically used with phewas plots, to show point shape based on the beta and stderr_beta fields.
 *
 * @function effect_direction
 * @param parameters
 * @param parameters.'+' The value to return if the effect direction is positive
 * @param parameters.'-' The value to return if the effect direction is positive
 * @param parameters.beta_field The name of the field containing beta
 * @param parameters.stderr_beta_field The name of the field containing stderr_beta
 * @param {Object} input This function should receive the entire datum object, rather than one single field
 * @returns {null}
 */
function effect_direction(parameters, input) {
    if (input === undefined) {
        return null;
    }

    const { beta_field, stderr_beta_field, '+': plus_result = null, '-': neg_result = null } = parameters;

    if (!beta_field || !stderr_beta_field) {
        throw new Error(`effect_direction must specify how to find required 'beta' and 'stderr_beta' fields`);
    }

    const beta_val = input[beta_field];
    const se_val = input[stderr_beta_field];

    if (beta_val !== undefined) {
        if (se_val !== undefined) {
            if ((beta_val - 1.96 * se_val) > 0) {
                return plus_result;
            } else if ((beta_val + 1.96 * se_val) < 0) {
                return neg_result || null;
            }
        } else {
            if (beta_val > 0) {
                return plus_result;
            } else if (beta_val < 0) {
                return neg_result;
            }
        }
    }
    // Note: The original PheWeb implementation allowed odds ratio in place of beta/se. LZ core is a bit more rigid
    //   about expected data formats for layouts.
    return null;
}

export { categorical_bin, stable_choice, if_value, interpolate, numerical_bin, ordinal_cycle, effect_direction };
