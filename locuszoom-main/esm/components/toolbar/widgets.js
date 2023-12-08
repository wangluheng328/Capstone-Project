/**
 * Interactive toolbar widgets that allow users to control the plot. These can be used to modify element display:
 *  adding contextual information, rearranging/removing panels, or toggling between sets of rendering options like
 *  different LD populations.
 * @module LocusZoom_Widgets
 */
import * as d3 from 'd3';

import {positionIntToString} from '../../helpers/display';
import {applyStyles, debounce} from '../../helpers/common';
import {deepCopy} from '../../helpers/layouts';

/**
 *
 * A widget is an empty div rendered on a toolbar that can display custom
 * html of user interface elements.
 */
class BaseWidget {
    /**
     * @param {('left'|'right')} [layout.position='left']  Whether to float the widget left or right.
     * @param {('start'|'middle'|'end')} [layout.group_position] Buttons can optionally be gathered into a visually
     *  distinctive group whose elements are closer together. If a button is identified as the start or end of a group,
     *  it will be drawn with rounded corners and an extra margin of spacing from any button not part of the group.
     *  For example, the region_nav_plot toolbar is a defined as a group.
     * @param {('gray'|'red'|'orange'|'yellow'|'green'|'blue'|'purple')} [layout.color='gray']  Color scheme for the
     *   widget. Applies to buttons and menus.
     * @param [layout.style] CSS styles that will be applied to the widget
     * @param {Toolbar} parent The toolbar that contains this widget
     */
    constructor(layout, parent) {
        /** @member {Object} */
        this.layout = layout || {};
        if (!this.layout.color) {
            this.layout.color = 'gray';
        }

        /** @member {Toolbar|*} */
        this.parent = parent || null;
        /**
         * Some widgets are attached to a panel, rather than directly to a plot
         * @member {Panel|null}
         */
        this.parent_panel = null;
        /** @member {Plot} */
        this.parent_plot = null;
        /**
         * This is a reference to either the panel or the plot, depending on what the toolbar is
         *   tied to. Useful when absolutely positioning toolbar widgets relative to their SVG anchor.
         * @member {Plot|Panel}
         */
        this.parent_svg = null;
        if (this.parent) {
            if (this.parent.type === 'panel') {
                this.parent_panel = this.parent.parent;
                this.parent_plot = this.parent.parent.parent;
                this.parent_svg = this.parent_panel;
            } else {
                this.parent_plot = this.parent.parent;
                this.parent_svg = this.parent_plot;
            }
        }
        /** @member {d3.selection} */
        this.selector = null;
        /**
         * If this is an interactive widget, it will contain a button or menu instance that handles the interactivity.
         *   There is a 1-to-1 relationship of toolbar widget to button
         * @member {null|Button}
         */
        this.button = null;
        /**
         * If any single widget is marked persistent, it will bubble up to prevent automatic hide behavior on a
         *   widget's parent toolbar. Check via `shouldPersist`
         * @protected
         * @member {Boolean}
         */
        this.persist = false;
        if (!this.layout.position) {
            this.layout.position = 'left';
        }
    }

    /**
     * Perform all rendering of widget, including toggling visibility to true. Will initialize and create SVG element
     *   if necessary, as well as updating with new data and performing layout actions.
     */
    show() {
        if (!this.parent || !this.parent.selector) {
            return;
        }
        if (!this.selector) {
            const group_position = (['start', 'middle', 'end'].includes(this.layout.group_position) ? ` lz-toolbar-group-${this.layout.group_position}` : '');
            this.selector = this.parent.selector.append('div')
                .attr('class', `lz-toolbar-${this.layout.position}${group_position}`);
            if (this.layout.style) {
                applyStyles(this.selector, this.layout.style);
            }
            if (typeof this.initialize == 'function') {
                this.initialize();
            }
        }
        if (this.button && this.button.status === 'highlighted') {
            this.button.menu.show();
        }
        this.selector.style('visibility', 'visible');
        this.update();
        return this.position();
    }

    /**
     * Update the toolbar widget with any new data or plot state as appropriate. This method performs all
     *  necessary rendering steps.
     */
    update() { /* stub */
    }

    /**
     * Place the widget correctly in the plot
     * @returns {BaseWidget}
     */
    position() {
        if (this.button) {
            this.button.menu.position();
        }
        return this;
    }

    /**
     * Determine whether the widget should persist (will bubble up to parent toolbar)
     * @returns {boolean}
     */
    shouldPersist() {
        if (this.persist) {
            return true;
        }
        return !!(this.button && this.button.persist);
    }

    /**
     * Toggle visibility to hidden, unless marked as persistent
     * @returns {BaseWidget}
     */
    hide() {
        if (!this.selector || this.shouldPersist()) {
            return this;
        }
        if (this.button) {
            this.button.menu.hide();
        }
        this.selector.style('visibility', 'hidden');
        return this;
    }

    /**
     * Completely remove widget and button. (may be overridden by persistence settings)
     * @param {Boolean} [force=false] If true, will ignore persistence settings and always destroy the toolbar
     * @returns {Toolbar}
     */
    destroy(force) {
        if (typeof force == 'undefined') {
            force = false;
        }
        if (!this.selector) {
            return this;
        }
        if (this.shouldPersist() && !force) {
            return this;
        }
        if (this.button && this.button.menu) {
            this.button.menu.destroy();
        }
        this.selector.remove();
        this.selector = null;
        this.button = null;
        return this;
    }
}

/**
 * Plots and panels may have a "toolbar" element suited for showing HTML widgets that may be interactive.
 *   When widgets need to incorporate a generic button, or additionally a button that generates a menu, this
 *   class provides much of the necessary framework. This widget is rarely used directly; it is usually used as
 *   part of the code for other widgets.
 * @alias module:LocusZoom_Widgets~_Button
 * @param {BaseWidget} parent
 */
class Button {
    constructor(parent) {
        if (!(parent instanceof BaseWidget)) {
            throw new Error('Unable to create toolbar widget button, invalid parent');
        }
        /** @member {BaseWidget} */
        this.parent = parent;
        /** @member {Panel} */
        this.parent_panel = this.parent.parent_panel;
        /** @member {Plot} */
        this.parent_plot = this.parent.parent_plot;
        /** @member {Plot|Panel} */
        this.parent_svg = this.parent.parent_svg;

        /** @member {Toolbar|null|*} */
        this.parent_toolbar = this.parent.parent;
        /** @member {d3.selection} */
        this.selector = null;

        /**
         * Tag to use for the button (default: a)
         * @member {String}
         */
        this.tag = 'a';

        /**
         * HTML for the button to show.
         * @protected
         * @member {String}
         */
        this.html = '';

        /**
         * Mouseover title text for the button to show
         * @protected
         * @member {String}
         */
        this.title = '';

        /**
         * Color of the button
         * @member {String}
         */
        this.color = 'gray';

        /**
         * Hash of arbitrary button styles to apply as {name: value} entries
         * @protected
         * @member {Object}
         */
        this.style = {};

        // Permanence
        /**
         * Track internal state on whether to keep showing the button/ menu contents at the moment
         * @protected
         * @member {Boolean}
         */
        this.persist = false;
        /**
         * Configuration when defining a button: track whether this widget should be allowed to keep open
         *   menu/button contents in response to certain events
         * @protected
         * @member {Boolean}
         */
        this.permanent = false;

        /**
         * Button status (highlighted / disabled/ etc)
         * @protected
         * @member {String}
         */
        this.status = '';

        /**
         * Button Menu Object
         * The menu is an HTML overlay that can appear below a button. It can contain arbitrary HTML and
         *   has logic to be automatically positioned and sized to behave more or less like a dropdown menu.
         * @member {Object}
         */
        this.menu = {
            outer_selector: null,
            inner_selector: null,
            scroll_position: 0,
            hidden: true,
            /**
             * Show the button menu, including setting up any DOM elements needed for first rendering
             */
            show: () => {
                if (!this.menu.outer_selector) {
                    this.menu.outer_selector = d3.select(this.parent_plot.svg.node().parentNode).append('div')
                        .attr('class', `lz-toolbar-menu lz-toolbar-menu-${this.color}`)
                        .attr('id', `${this.parent_svg.getBaseId()}.toolbar.menu`);
                    this.menu.inner_selector = this.menu.outer_selector.append('div')
                        .attr('class', 'lz-toolbar-menu-content');
                    this.menu.inner_selector.on('scroll', () => {
                        this.menu.scroll_position = this.menu.inner_selector.node().scrollTop;
                    });
                }
                this.menu.outer_selector.style('visibility', 'visible');
                this.menu.hidden = false;
                return this.menu.update();
            },
            /**
             * Update the rendering of the menu
             */
            update: () => {
                if (!this.menu.outer_selector) {
                    return this.menu;
                }
                this.menu.populate(); // This function is stubbed for all buttons by default and custom implemented in widget definition
                if (this.menu.inner_selector) {
                    this.menu.inner_selector.node().scrollTop = this.menu.scroll_position;
                }
                return this.menu.position();
            },
            position: () => {
                if (!this.menu.outer_selector) {
                    return this.menu;
                }
                // Unset any explicitly defined outer selector height so that menus dynamically shrink if content is removed
                this.menu.outer_selector.style('height', null);
                const padding = 3;
                const scrollbar_padding = 20;
                const menu_height_padding = 14; // 14: 2x 6px padding, 2x 1px border
                const page_origin = this.parent_svg._getPageOrigin();
                const page_scroll_top = document.documentElement.scrollTop || document.body.scrollTop;
                const container_offset = this.parent_plot.getContainerOffset();
                const toolbar_client_rect = this.parent_toolbar.selector.node().getBoundingClientRect();
                const button_client_rect = this.selector.node().getBoundingClientRect();
                const menu_client_rect = this.menu.outer_selector.node().getBoundingClientRect();
                const total_content_height = this.menu.inner_selector.node().scrollHeight;
                let top;
                let left;
                if (this.parent_toolbar.type === 'panel') {
                    top = (page_origin.y + toolbar_client_rect.height + (2 * padding));
                    left = Math.max(page_origin.x + this.parent_plot.layout.width - menu_client_rect.width - padding, page_origin.x + padding);
                } else {
                    top = button_client_rect.bottom + page_scroll_top + padding - container_offset.top;
                    left = Math.max(button_client_rect.left + button_client_rect.width - menu_client_rect.width - container_offset.left, page_origin.x + padding);
                }
                const base_max_width = Math.max(this.parent_plot.layout.width - (2 * padding) - scrollbar_padding, scrollbar_padding);
                const container_max_width = base_max_width;
                const content_max_width = (base_max_width - (4 * padding));
                const base_max_height = Math.max(this.parent_svg.layout.height - (10 * padding) - menu_height_padding, menu_height_padding);
                const height = Math.min(total_content_height + menu_height_padding, base_max_height);
                this.menu.outer_selector
                    .style('top', `${top}px`)
                    .style('left', `${left}px`)
                    .style('max-width', `${container_max_width}px`)
                    .style('max-height', `${base_max_height}px`)
                    .style('height', `${height}px`);
                this.menu.inner_selector
                    .style('max-width', `${content_max_width}px`);
                this.menu.inner_selector.node().scrollTop = this.menu.scroll_position;
                return this.menu;
            },
            hide: () => {
                if (!this.menu.outer_selector) {
                    return this.menu;
                }
                this.menu.outer_selector.style('visibility', 'hidden');
                this.menu.hidden = true;
                return this.menu;
            },
            destroy: () => {
                if (!this.menu.outer_selector) {
                    return this.menu;
                }
                this.menu.inner_selector.remove();
                this.menu.outer_selector.remove();
                this.menu.inner_selector = null;
                this.menu.outer_selector = null;
                return this.menu;
            },
            /**
             * Internal method definition
             * By convention populate() does nothing and should be reimplemented with each toolbar button definition
             *   Reimplement by way of Toolbar.BaseWidget.Button.menu.setPopulate to define the populate method and hook
             *   up standard menu click-toggle behavior prototype.
             * @protected
             */
            populate: () => {
                throw new Error('Method must be implemented');
            },
            /**
             * Define how the menu is populated with items, and set up click and display properties as appropriate
             * @public
             */
            setPopulate: (menu_populate_function) => {
                if (typeof menu_populate_function == 'function') {
                    this.menu.populate = menu_populate_function;
                    this.setOnclick(() => {
                        if (this.menu.hidden) {
                            this.menu.show();
                            this.highlight().update();
                            this.persist = true;
                        } else {
                            this.menu.hide();
                            this.highlight(false).update();
                            if (!this.permanent) {
                                this.persist = false;
                            }
                        }
                    });
                } else {
                    this.setOnclick();
                }
                return this;
            },
        };
    }

    /**
     * Set the color associated with this button
     * @param {('gray'|'red'|'orange'|'yellow'|'green'|'blue'|'purple')} color Any selection not in the preset list
     *   will be replaced with gray.
     * @returns {Button}
     */
    setColor (color) {
        if (typeof color != 'undefined') {
            if (['gray', 'red', 'orange', 'yellow', 'green', 'blue', 'purple'].includes(color)) {
                this.color = color;
            } else {
                this.color = 'gray';
            }
        }
        return this;
    }

    /**
     * Allow code to change whether the button is allowed to be `permanent`
     * @param {boolean} bool
     * @returns {Button}
     */
    setPermanent (bool) {
        if (typeof bool == 'undefined') {
            bool = true;
        } else {
            bool = Boolean(bool);
        }
        this.permanent = bool;
        if (this.permanent) {
            this.persist = true;
        }
        return this;
    }

    /**
     * Determine whether the button/menu contents should persist in response to a specific event
     * @returns {Boolean}
     */
    shouldPersist () {
        return this.permanent || this.persist;
    }

    /**
 * Set a collection of custom styles to be used by the button
 * @param {Object} style Hash of {name:value} entries
 * @returns {Button}
 */
    setStyle (style) {
        if (typeof style != 'undefined') {
            this.style = style;
        }
        return this;
    }

    /**
     * Method to generate a CSS class string
     * @returns {string}
     */
    getClass () {
        const group_position = (['start', 'middle', 'end'].includes(this.parent.layout.group_position) ? ` lz-toolbar-button-group-${this.parent.layout.group_position}` : '');
        return `lz-toolbar-button lz-toolbar-button-${this.color}${this.status ? `-${this.status}` : ''}${group_position}`;
    }

    /**
     * Change button state
     * @param {('highlighted'|'disabled'|'')} status
     */
    setStatus  (status) {
        if (typeof status != 'undefined' && ['', 'highlighted', 'disabled'].includes(status)) {
            this.status = status;
        }
        return this.update();
    }

    /**
     * Toggle whether the button is highlighted
     * @param {boolean} bool If provided, explicitly set highlighted state
     * @returns {Button}
     */
    highlight (bool) {
        if (typeof bool == 'undefined') {
            bool = true;
        } else {
            bool = Boolean(bool);
        }
        if (bool) {
            return this.setStatus('highlighted');
        } else if (this.status === 'highlighted') {
            return this.setStatus('');
        }
        return this;
    }

    /**
     * Toggle whether the button is disabled
     * @param {boolean} bool If provided, explicitly set disabled state
     * @returns {Button}
     */
    disable (bool) {
        if (typeof bool == 'undefined') {
            bool = true;
        } else {
            bool = Boolean(bool);
        }
        if (bool) {
            return this.setStatus('disabled');
        } else if (this.status === 'disabled') {
            return this.setStatus('');
        }
        return this;
    }

    // Mouse events
    /** @member {function} */
    onmouseover () {
    }
    setOnMouseover (onmouseover) {
        if (typeof onmouseover == 'function') {
            this.onmouseover = onmouseover;
        } else {
            this.onmouseover = function () {};
        }
        return this;
    }

    /** @member {function} */
    onmouseout () {
    }
    setOnMouseout (onmouseout) {
        if (typeof onmouseout == 'function') {
            this.onmouseout = onmouseout;
        } else {
            this.onmouseout = function () {};
        }
        return this;
    }

    /** @member {function} */
    onclick () {
    }
    setOnclick (onclick) {
        if (typeof onclick == 'function') {
            this.onclick = onclick;
        } else {
            this.onclick = function () {};
        }
        return this;
    }

    /**
     * Set the mouseover title text for the button (if any)
     * @param {String} title Simple text to display
     * @returns {Button}
     */
    setTitle(title) {
        if (typeof title != 'undefined') {
            this.title = title.toString();
        }
        return this;
    }

    /**
     * Specify the HTML content of this button.
     * WARNING: The string provided will be inserted into the document as raw markup; XSS mitigation is the
     *   responsibility of each button implementation.
     * @param {String} html
     * @returns {Button}
     */
    setHtml(html) {
        if (typeof html != 'undefined') {
            this.html = html.toString();
        }
        return this;
    }

    // Primary behavior functions
    /**
     * Show the button, including creating DOM elements if necessary for first render
     */
    show () {
        if (!this.parent) {
            return;
        }
        if (!this.selector) {
            this.selector = this.parent.selector.append(this.tag)
                .attr('class', this.getClass());
        }
        return this.update();
    }

    /**
     * Hook for any actions or state cleanup to be performed before rerendering
     * @returns {Button}
     */
    preUpdate () {
        return this;
    }

    /**
     * Update button state and contents, and fully rerender
     * @returns {Button}
     */
    update () {
        if (!this.selector) {
            return this;
        }
        this.preUpdate();
        this.selector
            .attr('class', this.getClass())
            .attr('title', this.title)
            .on('mouseover', (this.status === 'disabled') ? null : this.onmouseover)
            .on('mouseout', (this.status === 'disabled') ? null : this.onmouseout)
            .on('click', (this.status === 'disabled') ? null : this.onclick)
            .html(this.html)
            .call(applyStyles, this.style);

        this.menu.update();
        this.postUpdate();
        return this;
    }

    /**
     * Hook for any behavior to be added/changed after the button has been re-rendered
     * @returns {Button}
     */
    postUpdate () {
        return this;
    }

    /**
     * Hide the button by removing it from the DOM (may be overridden by current persistence setting)
     * @returns {Button}
     */
    hide() {
        if (this.selector && !this.shouldPersist()) {
            this.selector.remove();
            this.selector = null;
        }
        return this;
    }

}

/**
 * Renders arbitrary text with large title formatting
 * @alias module:LocusZoom_Widgets~title
 * @param {string} layout.title Text or HTML to render
 * @param {string} [layout.subtitle] Small text to render next to the title
 * @see {@link module:LocusZoom_Widgets~BaseWidget} for additional options
 */
class Title extends BaseWidget {
    show() {
        if (!this.div_selector) {
            this.div_selector = this.parent.selector.append('div')
                .attr('class', `lz-toolbar-title lz-toolbar-${this.layout.position}`);
            this.title_selector = this.div_selector.append('h3');
        }
        return this.update();
    }

    update() {
        let title = this.layout.title.toString();
        if (this.layout.subtitle) {
            title += ` <small>${this.layout.subtitle}</small>`;
        }
        this.title_selector.html(title);
        return this;
    }
}

/**
 * Display the current scale of the genome region displayed in the plot, as defined by the difference between
 *  `state.end` and `state.start`. Few users are interested in seeing coordinates with this level of precision, but
 *  it can be useful for debugging.
 *  TODO: It would be nice to move this to an extension, but helper functions drag in large dependencies as a side effect.
 *    (we'd need to reorganize internals a bit before moving this widget)
 * @alias module:LocusZoom_Widgets~region_scale
 * @see {@link module:LocusZoom_Widgets~BaseWidget} for additional options
 */
class RegionScale extends BaseWidget {
    update() {
        if (!isNaN(this.parent_plot.state.start) && !isNaN(this.parent_plot.state.end)
            && this.parent_plot.state.start !== null && this.parent_plot.state.end !== null) {
            this.selector.style('display', null);
            this.selector.html(positionIntToString(this.parent_plot.state.end - this.parent_plot.state.start, null, true));
        } else {
            this.selector.style('display', 'none');
        }
        if (this.layout.class) {
            this.selector.attr('class', this.layout.class);
        }
        if (this.layout.style) {
            applyStyles(this.selector, this.layout.style);
        }
        return this;
    }
}

/**
 * The filter field widget has triggered an update to the plot filtering rules
 *   Note: The widget can optionally be configured to broadcast this event under an alias (layout.custom_event_name)
 *
 * @event widget_filter_field_action
 * @property {Object} data { field, operator, value, filter_id }
 * @see event:any_lz_event
 */

/**
 * @alias module:LocusZoom_Widgets~filter_field
 */
class FilterField extends BaseWidget {
    /**
     * @param {string} layout.layer_name The data layer to control with filtering
     * @param {string} [layout.filter_id = null] Sometimes we want to define more than one filter with the same operator
     *  (eg != null, != bacon). The `filter_id` option allows us to identify which filter is controlled by this widget.
     * @param {string} layout.field The field to be filtered (eg `assoc:log_pvalue`)
     * @param {string} layout.field_display_html Human-readable label for the field to be filtered (`-log<sub>10</sub>p`)
     * @param {string} layout.operator The operator to use when filtering. This must be one of the options allowed by data_layer.filter.
     * @param {number} [layout.input_size=4] How wide to make the input textbox (number characters shown at a time)
     * @param {('number'|'string')} [layout.data_type='number'] Convert the text box input to the specified type, and warn the
     *  user if the value would be invalid (eg, not numeric)
     * @param {string} [layout.custom_event_name='widget_filter_field_action'] The name of the event that will be emitted when this filter is updated
     */
    constructor(layout, parent) {
        super(layout, parent);

        if (!this.parent_panel) {
            throw new Error('Filter widget can only be used in panel toolbars');
        }

        this._data_layer = this.parent_panel.data_layers[layout.layer_name];
        if (!this._data_layer) {
            throw new Error(`Filter widget could not locate the specified layer_name: '${layout.layer_name}'`);
        }

        this._event_name = layout.custom_event_name || 'widget_filter_field_action';
        this._field = layout.field;
        this._field_display_html = layout.field_display_html;
        this._operator = layout.operator;
        this._filter_id = null;
        this._data_type = layout.data_type || 'number';
        if (!['number', 'string'].includes(this._data_type)) {
            throw new Error('Filter must be either string or number');
        }

        this._value_selector = null;
    }

    _getTarget() {
        // Find the specific filter in layer.layout.filters, and if not present, add one
        if (!this._data_layer.layout.filters) {
            this._data_layer.layout.filters = [];
        }
        let result = this._data_layer.layout.filters
            .find((item) => item.field === this._field && item.operator === this._operator && (!this._filter_id || item.id === this._filter_id));

        if (!result) {
            result = { field: this._field, operator: this._operator, value: null };
            if (this._filter_id) {
                result['id'] = this._filter_id;
            }
            this._data_layer.layout.filters.push(result);
        }
        return result;
    }

    /** Clear the filter by removing it from the list */
    _clearFilter() {
        if (this._data_layer.layout.filters) {
            const index = this._data_layer.layout.filters.indexOf(this._getTarget());
            this._data_layer.layout.filters.splice(index, 1);
        }
    }

    /**
     * Set the filter based on a provided value
     * @fires event:widget_filter_field_action
     */
    _setFilter(value) {
        if (value === null) {
            // On blank or invalid value, remove the filter & warn
            this._value_selector
                .style('border', '1px solid red')
                .style('color', 'red');
            this._clearFilter();
        } else {
            const filter = this._getTarget();
            filter.value = value;
        }
        this.parent_svg.emit(this._event_name, { field: this._field, operator: this._operator, value, filter_id: this._filter_id }, true);
    }

    /** Get the user-entered value, coercing type if necessary. Returns null for invalid or missing values.
     * @return {null|number|string}
     * @private
     */
    _getValue() {
        let value = this._value_selector.property('value');
        if (value === null || value === '') {
            return null;
        }
        if (this._data_type === 'number') {
            value = +value;
            if (Number.isNaN(value)) {
                return null;
            }
        }
        return value;
    }

    update() {
        if (this._value_selector) {
            return;
        }
        this.selector.style('padding', '0 6px');

        // Label
        this.selector
            .append('span')
            .html(this._field_display_html)
            .style('background', '#fff')
            .style('padding-left', '3px');
        // Operator label
        this.selector.append('span')
            .text(this._operator)
            .style('padding', '0 3px')
            .style('background', '#fff');

        this._value_selector = this.selector
            .append('input')
            .attr('size', this.layout.input_size || 4)
            .on('input', debounce(() => {
                // Clear validation state
                this._value_selector
                    .style('border', null)
                    .style('color', null);
                const value = this._getValue();
                this._setFilter(value);
                this.parent_panel.render();
            }, 750));
    }
}

/**
 * The user has asked to download the plot as an SVG image
 *   Note: The widget can optionally be configured to broadcast this event under an alias (layout.custom_event_name)
 *
 * @event widget_save_svg
 * @property {Object} data { filename }
 * @see event:any_lz_event
 */

/**
 * The user has asked to download the plot as a PNG image
 *   Note: The widget can optionally be configured to broadcast this event under an alias (layout.custom_event_name)
 *
 * @event widget_save_png
 * @property {Object} data { filename }
 * @see event:any_lz_event
 */

/**
 * Button to export current plot to an SVG image
 *
 * This widget can only be attached to a plot, not to a panel
 *
 * @alias module:LocusZoom_Widgets~download_svg
 * @see {@link module:LocusZoom_Widgets~BaseWidget} for additional options
 */
class DownloadSVG extends BaseWidget {
    /**
     * @param {string} [layout.button_html="Download SVG"]
     * @param {string} [layout.button_title="Download hi-res image"]
     * @param {string} [layout.filename="locuszoom.svg"] The default filename to use when saving the image
     * @param {string} [layout.custom_event_name='widget_save_svg'] The name of the event that will be emitted when the button is clicked
     */
    constructor(layout, parent) {
        super(layout, parent);
        this._filename = this.layout.filename || 'locuszoom.svg';
        this._button_html = this.layout.button_html || 'Save SVG';
        this._button_title = this.layout.button_title || 'Download hi-res image';
        this._event_name = layout.custom_event_name || 'widget_save_svg';

        if (this.parent_panel) {
            throw new Error(`The "${layout.type}" widget is designed to download the whole plot as an image, so it can only be attached to the top (plot) level`);
        }
    }

    update() {
        if (this.button) {
            return this;
        }
        this.button = new Button(this)
            .setColor(this.layout.color)
            .setHtml(this._button_html)
            .setTitle(this._button_title)
            .setOnMouseover(() => {
                this.button.selector
                    .classed('lz-toolbar-button-gray-disabled', true)
                    .html('Preparing Image');
                this._getBlobUrl().then((url) => {
                    const old = this.button.selector.attr('href');
                    if (old) {
                        // Clean up old url instance to prevent memory leaks
                        URL.revokeObjectURL(old);
                    }
                    this.button.selector
                        .attr('href', url)
                        .classed('lz-toolbar-button-gray-disabled', false)
                        .classed('lz-toolbar-button-gray-highlighted', true)
                        .html(this._button_html);
                });
            })
            .setOnMouseout(() => {
                this.button.selector.classed('lz-toolbar-button-gray-highlighted', false);
            });
        this.button.show();
        this.button.selector
            .attr('href-lang', 'image/svg+xml')
            .attr('download', this._filename)
            .on('click', () => this.parent_svg.emit(this._event_name, { filename: this._filename }, true));
        return this;
    }

    /**
     * Extract all CSS rules whose selectors directly reference elements under the root node
     * @param {Element} root
     * @return {string}
     * @private
     */
    _getCSS(root) {
        // Hack: this method is based on text matching the rules on a given node; it doesn't handle, eg ancestors.
        // Since all LZ cssRules are written as "svg .classname", we need to strip the parent selector prefix in order
        // to extract CSS.
        const ancestor_pattern = /^svg\.lz-locuszoom\s*/;

        // Extract all relevant CSS Rules by iterating through all available stylesheets
        let extractedCSSText = '';
        for (let i = 0; i < document.styleSheets.length; i++) {
            const s = document.styleSheets[i];
            try {
                if (!s.cssRules) {
                    continue;
                }
            } catch ( e ) {
                if (e.name !== 'SecurityError') {
                    throw e;
                } // for Firefox
                continue;
            }
            let cssRules = s.cssRules;
            for (let i = 0; i < cssRules.length; i++) {
                // FIXME: We could write smaller SVGs by extracting only the exact CSS rules for this plot. However,
                //   extracting rules (including parent selectors) is a finicky process
                // Instead just fetch all LZ plot rules, under a known hardcoded parent selector.
                const rule = cssRules[i];
                const is_match = (rule.selectorText && rule.selectorText.match(ancestor_pattern));
                if (is_match) {
                    extractedCSSText += rule.cssText;
                }
            }
        }
        return extractedCSSText;
    }

    _appendCSS( cssText, element ) {
        // Append styles to the constructed SVG DOM node
        var styleElement = document.createElement('style');
        styleElement.setAttribute('type', 'text/css');
        styleElement.innerHTML = cssText;
        var refNode = element.hasChildNodes() ? element.children[0] : null;
        element.insertBefore( styleElement, refNode );
    }

    /**
     * Get the target dimensions for the rendered image.
     *
     * For non-vector displays, these dimensions will yield ~300 DPI image for an 8" wide print figure.
     * @return {number[]}
     * @private
     */
    _getDimensions() {
        let { width, height } = this.parent_plot.svg.node().getBoundingClientRect();
        const target_width = 2400;
        const rescale = target_width / width;
        return [rescale * width, rescale * height];
    }

    _generateSVG () {
        return new Promise((resolve) => {
            // Copy the DOM node so that we can modify the image for publication
            let copy = this.parent_plot.svg.node().cloneNode(true);
            copy.setAttribute('xlink', 'http://www.w3.org/1999/xlink');
            copy = d3.select(copy);

            // Remove unnecessary elements
            copy.selectAll('g.lz-curtain').remove();
            copy.selectAll('g.lz-mouse_guide').remove();
            // Convert units on axis tick dy attributes from ems to pixels
            copy.selectAll('g.tick text').each(function() {
                const dy = +(d3.select(this).attr('dy').substring(-2).slice(0, -2)) * 10;
                d3.select(this).attr('dy', dy);
            });
            // Pull the svg into a string and add the contents of the locuszoom stylesheet
            // Don't add this with d3 because it will escape the CDATA declaration incorrectly
            const serializer = new XMLSerializer();

            copy = copy.node();

            // Firefox has issues saving the SVG in certain contexts (esp rendering to canvas) unless a width is given.
            //  See: https://bugzilla.mozilla.org/show_bug.cgi?id=700533
            const [width, height] = this._getDimensions();
            copy.setAttribute('width', width);
            copy.setAttribute('height', height);

            // Add CSS to the node
            this._appendCSS(this._getCSS(copy), copy);
            let svg_markup = serializer.serializeToString(copy);
            resolve(svg_markup);
        });
    }

    /**
     * Converts the SVG string into a downloadable binary object
     * @return {Promise}
     */
    _getBlobUrl() {
        return this._generateSVG().then((markup) => {
            const blob = new Blob([markup], { type: 'image/svg+xml' });
            return URL.createObjectURL(blob);
        });
    }
}

/**
 * Button to export current plot to a PNG image
 *
 * This widget can only be attached to a plot, not to a panel
 *
 * @alias module:LocusZoom_Widgets~download_png
 * @extends module:LocusZoom_Widgets~download_svg
 * @see {@link module:LocusZoom_Widgets~BaseWidget} for additional options
 */
class DownloadPNG extends DownloadSVG {
    /**
     * @param {string} [layout.button_html="Download PNG"]
     * @param {string} [layout.button_title="Download image"]
     * @param {string} [layout.filename="locuszoom.svg"] The default filename to use when saving the image
     * @param {string} [layout.custom_event_name='widget_save_png'] The name of the event that will be emitted when the button is clicked
     * @see {@link module:LocusZoom_Widgets~BaseWidget} for additional options
     */
    constructor(layout, parent) {
        super(...arguments);
        this._filename = this.layout.filename || 'locuszoom.png';
        this._button_html = this.layout.button_html || 'Save PNG';
        this._button_title = this.layout.button_title || 'Download image';
        this._event_name = layout.custom_event_name || 'widget_save_png';
    }

    /**
     * @private
     */
    _getBlobUrl() {
        return super._getBlobUrl().then((svg_url) => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            const [width, height] = this._getDimensions();

            canvas.width = width;
            canvas.height = height;

            return new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => {
                    context.drawImage(image, 0, 0, width, height);
                    // Once canvas rendered, revoke svg blob to avoid memory leaks, and create new url for the canvas
                    URL.revokeObjectURL(svg_url);
                    canvas.toBlob((png) => {
                        resolve(URL.createObjectURL(png));
                    });
                };
                image.src = svg_url;
            });
        });
    }
}

/**
 * Button to remove panel from plot.
 *   NOTE: Will only work on panel widgets.
 * @alias module:LocusZoom_Widgets~remove_panel
 * @param {Boolean} [layout.suppress_confirm=false] If true, removes the panel without prompting user for confirmation
 * @see {@link module:LocusZoom_Widgets~BaseWidget} for additional options
 */
class RemovePanel extends BaseWidget {
    update() {
        if (this.button) {
            return this;
        }
        this.button = new Button(this)
            .setColor(this.layout.color)
            .setHtml('×')
            .setTitle('Remove panel')
            .setOnclick(() => {
                if (!this.layout.suppress_confirm && !confirm('Are you sure you want to remove this panel? This cannot be undone.')) {
                    return false;
                }
                const panel = this.parent_panel;
                panel.toolbar.hide(true);
                d3.select(panel.parent.svg.node().parentNode).on(`mouseover.${panel.getBaseId()}.toolbar`, null);
                d3.select(panel.parent.svg.node().parentNode).on(`mouseout.${panel.getBaseId()}.toolbar`, null);
                return panel.parent.removePanel(panel.id);
            });
        this.button.show();
        return this;
    }
}

/**
 * Button to move panel up relative to other panels (in terms of y-index on the page)
 *   NOTE: Will only work on panel widgets.
 * @alias module:LocusZoom_Widgets~move_panel_up
 * @see {@link module:LocusZoom_Widgets~BaseWidget} for additional options
 */
class MovePanelUp extends BaseWidget {
    update () {
        if (this.button) {
            const is_at_top = (this.parent_panel.layout.y_index === 0);
            this.button.disable(is_at_top);
            return this;
        }
        this.button = new Button(this)
            .setColor(this.layout.color)
            .setHtml('▴')
            .setTitle('Move panel up')
            .setOnclick(() => {
                this.parent_panel.moveUp();
                this.update();
            });
        this.button.show();
        return this.update();
    }
}

/**
 * Button to move panel down relative to other panels (in terms of y-index on the page)
 *   NOTE: Will only work on panel widgets.
 * @alias module:LocusZoom_Widgets~move_panel_down
 * @see {@link module:LocusZoom_Widgets~BaseWidget} for additional options
 */
class MovePanelDown extends BaseWidget {
    update () {
        if (this.button) {
            const is_at_bottom = (this.parent_panel.layout.y_index === this.parent_plot._panel_ids_by_y_index.length - 1);
            this.button.disable(is_at_bottom);
            return this;
        }
        this.button = new Button(this)
            .setColor(this.layout.color)
            .setHtml('▾')
            .setTitle('Move panel down')
            .setOnclick(() => {
                this.parent_panel.moveDown();
                this.update();
            });
        this.button.show();
        return this.update();
    }
}

/**
 * Button to shift plot region forwards or back by a `step` increment provided in the layout
 *
 * This widget can only be attached to a plot, not to a panel
 *
 * @alias module:LocusZoom_Widgets~shift_region
 * @see {@link module:LocusZoom_Widgets~BaseWidget} for additional options
 */
class ShiftRegion extends BaseWidget {
    /**
     * @param {number} [layout.step=50000] The stepsize to change the region by
     * @param {string} [layout.button_html] Label
     * @param {string} [layout.button_title] Mouseover text
     */
    constructor(layout, parent) {
        if (isNaN(layout.step) || layout.step === 0) {
            layout.step = 50000;
        }
        if (typeof layout.button_html !== 'string') {
            layout.button_html = layout.step > 0 ? '>' : '<';
        }

        if (typeof layout.button_title !== 'string') {
            layout.button_title = `Shift region by ${layout.step > 0 ? '+' : '-'}${positionIntToString(Math.abs(layout.step), null, true)}`;
        }
        super(layout, parent);
        if (isNaN(this.parent_plot.state.start) || isNaN(this.parent_plot.state.end)) {
            throw new Error('Unable to add shift_region toolbar widget: plot state does not have region bounds');
        }

        if (this.parent_panel) {
            throw new Error(`The "${layout.type}" widget is designed to change the region for all panels, so it can only be attached to the top (plot) level`);
        }


    }

    update () {
        if (this.button) {
            return this;
        }
        this.button = new Button(this)
            .setColor(this.layout.color)
            .setHtml(this.layout.button_html)
            .setTitle(this.layout.button_title)
            .setOnclick(() => {
                this.parent_plot.applyState({
                    start: Math.max(this.parent_plot.state.start + this.layout.step, 1),
                    end: this.parent_plot.state.end + this.layout.step,
                });
            });
        this.button.show();
        return this;
    }
}

/**
 * Zoom in or out on the plot, centered on the middle of the plot region, by the specified amount
 *
 * This widget can only be attached to a plot, not to a panel
 *
 * @alias module:LocusZoom_Widgets~zoom_region
 * @see {@link module:LocusZoom_Widgets~BaseWidget} for additional options
 */
class ZoomRegion extends BaseWidget {
    /**
     * @param {number} [layout.step=0.2] The fraction to zoom in by (where 1 indicates 100%)
     * @param {string} [layout.button_html] Label
     * @param {string} [layout.button_title] Mouseover text
     */
    constructor(layout, parent) {
        if (isNaN(layout.step) || layout.step === 0) {
            layout.step = 0.2;
        }
        if (typeof layout.button_html != 'string') {
            layout.button_html = layout.step > 0 ? 'z–' : 'z+';
        }
        if (typeof layout.button_title != 'string') {
            layout.button_title = `Zoom region ${layout.step > 0 ? 'out' : 'in'} by ${(Math.abs(layout.step) * 100).toFixed(1)}%`;
        }

        super(layout, parent);
        if (isNaN(this.parent_plot.state.start) || isNaN(this.parent_plot.state.end)) {
            throw new Error('Unable to add zoom_region toolbar widget: plot state does not have region bounds');
        }

        if (this.parent_panel) {
            throw new Error(`The "${layout.type}" widget is designed to change the region for all panels, so it can only be attached to the top (plot) level`);
        }
    }

    update () {
        if (this.button) {
            let can_zoom = true;
            const current_region_scale = this.parent_plot.state.end - this.parent_plot.state.start;
            if (this.layout.step > 0 && !isNaN(this.parent_plot.layout.max_region_scale) && current_region_scale >= this.parent_plot.layout.max_region_scale) {
                can_zoom = false;
            }
            if (this.layout.step < 0 && !isNaN(this.parent_plot.layout.min_region_scale) && current_region_scale <= this.parent_plot.layout.min_region_scale) {
                can_zoom = false;
            }
            this.button.disable(!can_zoom);
            return this;
        }
        this.button = new Button(this)
            .setColor(this.layout.color)
            .setHtml(this.layout.button_html)
            .setTitle(this.layout.button_title)
            .setOnclick(() => {
                const current_region_scale = this.parent_plot.state.end - this.parent_plot.state.start;
                const zoom_factor = 1 + this.layout.step;
                let new_region_scale = current_region_scale * zoom_factor;
                if (!isNaN(this.parent_plot.layout.max_region_scale)) {
                    new_region_scale = Math.min(new_region_scale, this.parent_plot.layout.max_region_scale);
                }
                if (!isNaN(this.parent_plot.layout.min_region_scale)) {
                    new_region_scale = Math.max(new_region_scale, this.parent_plot.layout.min_region_scale);
                }
                const delta = Math.floor((new_region_scale - current_region_scale) / 2);
                this.parent_plot.applyState({
                    start: Math.max(this.parent_plot.state.start - delta, 1),
                    end: this.parent_plot.state.end + delta,
                });
            });
        this.button.show();
        return this;
    }
}

/**
 * Renders button with arbitrary text that, when clicked, shows a dropdown containing arbitrary HTML. This is usually
 *   used as part of coding a custom button, rather than as a standalone widget.
 * NOTE: Trusts content exactly as given. XSS prevention is the responsibility of the implementer.
 * @alias module:LocusZoom_Widgets~menu
 * @param {string} layout.button_html The HTML to render inside the button
 * @param {string} layout.button_title Text to display as a tooltip when hovering over the button
 * @param {string} layout.menu_html The HTML content of the dropdown menu
 */
class Menu extends BaseWidget {
    update() {
        if (this.button) {
            return this;
        }
        this.button = new Button(this)
            .setColor(this.layout.color)
            .setHtml(this.layout.button_html)
            .setTitle(this.layout.button_title);
        this.button.menu.setPopulate(() => {
            this.button.menu.inner_selector.html(this.layout.menu_html);
        });
        this.button.show();
        return this;
    }
}

/**
 * Button to resize panel height to fit available data (eg when showing a list of tracks)
 * @alias module:LocusZoom_Widgets~resize_to_data
 */
class ResizeToData extends BaseWidget {
    /**
     * @param {string} [layout.button_html="Resize to Data"]
     * @param {string} [layout.button_title]
     */
    constructor(layout) {
        super(...arguments);
    }
    update() {
        if (this.button) {
            return this;
        }
        this.button = new Button(this)
            .setColor(this.layout.color)
            .setHtml(this.layout.button_html || 'Resize to Data')
            .setTitle(this.layout.button_title || 'Automatically resize this panel to show all data available')
            .setOnclick(() => {
                this.parent_panel.scaleHeightToData();
                this.update();
            });
        this.button.show();
        return this;
    }
}

/**
 * Button to toggle legend
 * @alias module:LocusZoom_Widgets~toggle_legend
 * @see {@link module:LocusZoom_Widgets~BaseWidget} for additional options
 */
class ToggleLegend extends BaseWidget {
    update() {
        const html = this.parent_panel.legend.layout.hidden ? 'Show Legend' : 'Hide Legend';
        if (this.button) {
            this.button.setHtml(html).show();
            this.parent.position();
            return this;
        }
        this.button = new Button(this)
            .setColor(this.layout.color)
            .setTitle('Show or hide the legend for this panel')
            .setOnclick(() => {
                this.parent_panel.legend.layout.hidden = !this.parent_panel.legend.layout.hidden;
                this.parent_panel.legend.render();
                this.update();
            });
        return this.update();
    }
}


/**
 * @typedef {object} DisplayOptionsButtonConfigField
 * @property {string} display_name The human-readable label for this set of options
 * @property {object} display An object with layout directives that will be merged into the target layer.
 *   The directives should be among those listed in `fields_whitelist` for this widget.
 */

/**
 * The user has chosen a specific display option to show information on the plot
 *   Note: The widget can optionally be configured to broadcast this event under an alias (layout.custom_event_name)
 *
 * @event widget_display_options_choice
 * @property {Object} data {choice} The display_name of the item chosen from the list
 * @see event:any_lz_event
 */

/**
 * Dropdown menu allowing the user to choose between different display options for a single specific data layer
 *  within a panel.
 *
 * This allows controlling how points on a datalayer can be displayed- any display options supported via the layout for the target datalayer. This includes point
 *  size/shape, coloring, etc.
 *
 * This button intentionally limits display options it can control to those available on common plot types.
 *   Although the list of options it sets can be overridden (to control very special custom plot types), this
 *   capability should be used sparingly if at all.
 * @alias module:LocusZoom_Widgets~display_options
 * @see {@link module:LocusZoom_Widgets~BaseWidget} for additional options
 */
class DisplayOptions extends BaseWidget {
    /**
     * @param {string} layout.layer_name Specify the datalayer that this button should affect
     * @param {String} [layout.button_html="Display options..."] Text to display on the toolbar button
     * @param {String} [layout.button_title="Control how plot items are displayed"] Hover text for the toolbar button
     * @param {string} [layout.default_config_display_name] Store the default configuration for this datalayer
     *  configuration, and show a button to revert to the "default" (listing the human-readable display name provided)
     * @param {Array} [layout.fields_whitelist='see code'] The list of presentation fields that this button can control.
     *   This can be overridden if this button needs to be used on a custom layer type with special options.
     *   The whitelist is chosen to be things that are known to be easily modified with few side effects.
     *   When the button is first created, all fields in the whitelist will have their default values saved, so the user can revert to the default view easily.
     * @param {module:LocusZoom_Widgets~DisplayOptionsButtonConfigField[]} layout.options Specify a label and set of layout directives associated
     *  with this `display` option. Display field should include all changes that will be merged to datalayer layout options.
     * @param {string} [layout.custom_event_name='widget_display_options_choice'] The name of the event that will be emitted when an option is selected
     */
    constructor(layout, parent) {
        if (typeof layout.button_html != 'string') {
            layout.button_html = 'Display options...';
        }
        if (typeof layout.button_title != 'string') {
            layout.button_title = 'Control how plot items are displayed';
        }
        super(...arguments);
        this._event_name = layout.custom_event_name || 'widget_display_options_choice';

        // List of layout fields that this button is allowed to control. This ensures that we don't override any other
        //  information (like plot height etc) while changing point rendering
        const allowed_fields = layout.fields_whitelist || ['color', 'fill_opacity', 'filters', 'label', 'legend',
            'point_shape', 'point_size', 'tooltip', 'tooltip_positioning'];

        const dataLayer = this.parent_panel.data_layers[layout.layer_name];
        if (!dataLayer) {
            throw new Error(`Display options could not locate the specified layer_name: '${layout.layer_name}'`);
        }
        const dataLayerLayout = dataLayer.layout;

        // Store default configuration for the layer as a clean deep copy, so we may revert later
        const defaultConfig = {};
        allowed_fields.forEach((name) => {
            const configSlot = dataLayerLayout[name];
            if (configSlot !== undefined) {
                defaultConfig[name] =  deepCopy(configSlot);
            }
        });

        /**
         * Which item in the menu is currently selected. (track for rerendering menu)
         * @member {String}
         * @private
         */
        this._selected_item = 'default';

        // Define the button + menu that provides the real functionality for this toolbar widget

        this.button = new Button(this)
            .setColor(layout.color)
            .setHtml(layout.button_html)
            .setTitle(layout.button_title)
            .setOnclick(() => {
                this.button.menu.populate();
            });
        this.button.menu.setPopulate(() => {
            // Multiple copies of this button might be used on a single LZ page; append unique IDs where needed
            const uniqueID = Math.floor(Math.random() * 1e4).toString();

            this.button.menu.inner_selector.html('');
            const table = this.button.menu.inner_selector.append('table');

            const menuLayout = this.layout;

            const renderRow = (display_name, display_options, row_id) => { // Helper method
                const row = table.append('tr');
                const radioId = `${uniqueID}${row_id}`;
                row.append('td')
                    .append('input')
                    .attr('id', radioId)
                    .attr('type', 'radio')
                    .attr('name', `display-option-${uniqueID}`)
                    .attr('value', row_id)
                    .style('margin', 0) // Override css libraries (eg skeleton) that style form inputs
                    .property('checked', (row_id === this._selected_item))
                    .on('click', () => {
                        // If an option is not specified in these display options, use the original defaults
                        allowed_fields.forEach((field_name) => {
                            const has_option = typeof display_options[field_name] !== 'undefined';
                            dataLayer.layout[field_name] = has_option ? display_options[field_name] : defaultConfig[field_name];
                        });

                        this.parent_svg.emit(this._event_name, { choice: display_name }, true);
                        this._selected_item = row_id;
                        this.parent_panel.render();
                        const legend = this.parent_panel.legend;
                        if (legend) {
                            legend.render();
                        }
                    });
                row.append('td').append('label')
                    .style('font-weight', 'normal')
                    .attr('for', radioId)
                    .text(display_name);
            };
            // Render the "display options" menu: default and special custom options
            const defaultName = menuLayout.default_config_display_name || 'Default style';
            renderRow(defaultName, defaultConfig, 'default');
            menuLayout.options.forEach((item, index) => renderRow(item.display_name, item.display, index));
            return this;
        });
    }

    update() {
        this.button.show();
        return this;
    }
}

/**
 * @typedef {object} SetStateOptionsConfigField
 * @property {string} display_name Human readable name for option label (eg "European")
 * @property value Value to set in plot.state (eg "EUR")
 */

/**
 * An option has been chosen from the set_state dropdown menu
 *   Note: The widget can optionally be configured to broadcast this event under an alias (layout.custom_event_name)
 *
 * @event widget_set_state_choice
 * @property {Object} data { choice_name, choice_value, state_field }
 * @see event:any_lz_event
 */

/**
 * Dropdown menu allowing the user to set the value of a specific `state_field` in plot.state
 * This is useful for things (like datasources) that allow dynamic configuration based on global information in state
 *
 * For example, the LDServer data adapter can use it to change LD reference population (for all panels) after render
 *
 * This widget can only be attached to a plot, not to a panel
 *
 * @alias module:LocusZoom_Widgets~set_state
 * @param {String} [layout.button_html="Set option..."] Text to display on the toolbar button
 * @param {String} [layout.button_title="Choose an option to customize the plot"] Hover text for the toolbar button
 * @param {bool} [layout.show_selected=false] Whether to append the selected value to the button label ("LD Population: ALL")
 * @param {string} [layout.state_field] The name of the field in plot.state that will be set by this button
 * @param {module:LocusZoom_Widgets~SetStateOptionsConfigField[]} layout.options Specify human labels and associated values for the dropdown menu
 * @param {string} [layout.custom_event_name='widget_set_state_choice'] The name of the event that will be emitted when an option is selected
 */
class SetState extends BaseWidget {
    constructor(layout, parent) {
        if (typeof layout.button_html != 'string') {
            layout.button_html = 'Set option...';
        }
        if (typeof layout.button_title != 'string') {
            layout.button_title = 'Choose an option to customize the plot';
        }

        super(layout, parent);

        if (!layout.state_field) {
            throw new Error('Must specify the `state_field` that this widget controls');
        }

        this._event_name = layout.custom_event_name || 'widget_set_state_choice';

        /**
         * Which item in the menu is currently selected. (track for rerendering menu)
         * @member {String}
         * @private
         */
        // The first option listed is automatically assumed to be the default, unless a value exists in plot.state
        this._selected_item = this.parent_plot.state[layout.state_field] || layout.options[0].value;
        if (!layout.options.find((item) => {
            return item.value === this._selected_item;
        })) {
            // Check only gets run at widget creation, but generally this widget is assumed to be an exclusive list of options
            throw new Error('There is an existing state value that does not match the known values in this widget');
        }
        // Define the button + menu that provides the real functionality for this toolbar widget
        this.button = new Button(this)
            .setColor(layout.color)
            .setHtml(layout.button_html + (layout.show_selected ? this._selected_item : ''))
            .setTitle(layout.button_title)
            .setOnclick(() => {
                this.button.menu.populate();
            });
        this.button.menu.setPopulate(() => {
            // Multiple copies of this button might be used on a single LZ page; append unique IDs where needed
            const uniqueID = Math.floor(Math.random() * 1e4).toString();

            this.button.menu.inner_selector.html('');
            const table = this.button.menu.inner_selector.append('table');

            const renderRow = (display_name, value, row_id) => { // Helper method
                const row = table.append('tr');
                const radioId = `${uniqueID}${row_id}`;
                row.append('td')
                    .append('input')
                    .attr('id', radioId)
                    .attr('type', 'radio')
                    .attr('name', `set-state-${uniqueID}`)
                    .attr('value', row_id)
                    .style('margin', 0) // Override css libraries (eg skeleton) that style form inputs
                    .property('checked', (value === this._selected_item))
                    .on('click', () => {
                        const new_state = {};
                        new_state[layout.state_field] = value;
                        this._selected_item = value;
                        this.parent_plot.applyState(new_state);
                        this.button.setHtml(layout.button_html + (layout.show_selected ? this._selected_item : ''));

                        this.parent_svg.emit(this._event_name, { choice_name: display_name, choice_value: value, state_field: layout.state_field }, true);
                    });
                row.append('td').append('label')
                    .style('font-weight', 'normal')
                    .attr('for', radioId)
                    .text(display_name);
            };
            layout.options.forEach((item, index) => renderRow(item.display_name, item.value, index));
            return this;
        });

        // Allow the button to react to external changes so that the menu stays in sync. This assumes a fair bit of
        //  trust in the external code, which you hope uses a state value that matches something known to the
        //  "list of options" defined for this menu.
        //
        // If the plot.state value wouldn't fit the options: on plot creation, the widget breaks with an error
        //  because that was never going to work. But if state != options at a later point, we will quietly let it
        //  happen and the button will just look weird. (strict validation at this stage would break the page after render)
        this._update_listener = this.parent_plot.on('state_changed', (event) => {
            const new_value = event.data[layout.state_field];
            if (new_value !== undefined && new_value !== this._selected_item) {
                this._selected_item = new_value;

                this.button
                    .setHtml(layout.button_html + (layout.show_selected ? this._selected_item : ''));
                this.update();
            }
        });
    }

    update() {
        this.button.show();
        return this;
    }

    destroy(force) {
        // In theory, set_state is a plot-level widget, and so the entire plot is destroyed at same time this button is.
        //  But people copy and paste a lot, so we will demonstrate good practice by cleaning up event listeners.
        this.parent_plot.off('state_changed', this._update_listener);
        return super.destroy(force);
    }
}


export {
    BaseWidget,  // This is used to create subclasses
    Button as _Button, // This is used to create Widgets that contain a button. It actually shouldn't be in the registry because it's not usable directly..
    DisplayOptions as display_options,
    DownloadSVG as download,
    DownloadPNG as download_png,
    FilterField as filter_field,
    Menu as menu,
    MovePanelDown as move_panel_down,
    MovePanelUp as move_panel_up,
    RegionScale as region_scale,
    ResizeToData as resize_to_data,
    SetState as set_state,
    ShiftRegion as shift_region,
    RemovePanel as remove_panel,
    Title as title,
    ToggleLegend as toggle_legend,
    ZoomRegion as zoom_region,
};
