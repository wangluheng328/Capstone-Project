/**
 * Forest plot track, designed for use with PheWAS style datasets.
 *   This is not part of the core LocusZoom library, but can be included as a standalone file.
 *
 * ### Features provided
 * * {@link module:LocusZoom_DataLayers~forest}
 * * {@link module:LocusZoom_DataLayers~category_forest}
 *
 * ### Loading and usage
 * The page must incorporate and load all libraries before this file can be used, including:
 * - LocusZoom
 *
 * To use in an environment without special JS build tooling, simply load the extension file as JS from a CDN (after any dependencies):
 * ```
 * <script src="https://cdn.jsdelivr.net/npm/locuszoom@INSERT_VERSION_HERE/dist/ext/lz-forest-track.min.js" type="application/javascript"></script>
 * ```
 *
 * To use with ES6 modules, the plugin must be loaded and registered explicitly before use:
 * ```
 * import LocusZoom from 'locuszoom';
 * import ForestTrack from 'locuszoom/esm/ext/lz-forest-track';
 * LocusZoom.use(ForestTrack);
 * ```
 *
 * Then use the layouts made available by this extension. (see demos and documentation for guidance)
 *
 * @module
 */
import * as d3 from 'd3';


function install (LocusZoom) {
    const BaseDataLayer = LocusZoom.DataLayers.get('BaseDataLayer');
    const default_layout = {
        point_size: 40,
        point_shape: 'square',
        color: '#888888',
        fill_opacity: 1,
        y_axis: {
            axis: 2,
        },
        id_field: 'id',
        confidence_intervals: {
            start_field: 'ci_start',
            end_field: 'ci_end',
        },
    };

    /**
     * (**extension**) Forest Data Layer
     * Implements a standard forest plot. In order to space out points, any layout using this must specify axis ticks
     *  and extent in advance.
     *
     * If you are using dynamically fetched data, consider using `category_forest` instead.
     * @alias module:LocusZoom_DataLayers~forest
     * @see module:LocusZoom_DataLayers~BaseDataLayer
     * @see {@link module:ext/lz-forest-track} for required extension and installation instructions
     */
    class Forest extends BaseDataLayer {
        /**
         * @param {number|module:LocusZoom_DataLayers~ScalableParameter[]} [layout.point_size=40] The size (area) of the point for each datum
         * @param {string|module:LocusZoom_DataLayers~ScalableParameter[]} [layout.point_shape='square'] Shape of the point for each datum. Supported values map to the d3 SVG Symbol Types (i.e.: "circle", "cross", "diamond", "square", "triangle", "star", and "wye"), plus "triangledown".
         * @param {string|module:LocusZoom_DataLayers~ScalableParameter[]} [layout.color='#888888'] The color of each point
         * @param {number|module:LocusZoom_DataLayers~ScalableParameter[]} [layout.fill_opacity=1] Opacity (0..1) for each datum point
         * @param {string} layout.x_axis.field A field specifying the x-coordinate of the mark (eg square)
         * @param {string} layout.y_axis.field A field specifying the y-coordinate. Use `category_forest` if you just want to
         *  lay out a series of forest markings in order without worrying about this.
         * @param [layout.confidence_intervals.start_field='ci_start'] The field that specifies the start of confidence interval
         * @param [layout.confidence_intervals.end_field='ci_end'] The field that specifies the start of confidence interval
         */
        constructor(layout) {
            layout = LocusZoom.Layouts.merge(layout, default_layout);
            super(...arguments);
        }

        _getTooltipPosition(tooltip) {
            const x_center = this.parent.x_scale(tooltip.data[this.layout.x_axis.field]);
            const y_scale = `y${this.layout.y_axis.axis}_scale`;
            const y_center = this.parent[y_scale](tooltip.data[this.layout.y_axis.field]);

            const point_size = this.resolveScalableParameter(this.layout.point_size, tooltip.data);
            const offset = Math.sqrt(point_size / Math.PI);
            return {
                x_min: x_center - offset,
                x_max: x_center + offset,
                y_min: y_center - offset,
                y_max: y_center + offset,
            };
        }

        /**
         * @fires event:element_clicked
         */
        render() {
            // Apply filters to only render a specified set of points
            const track_data = this._applyFilters();

            const x_scale = 'x_scale';
            const y_scale = `y${this.layout.y_axis.axis}_scale`;

            // Generate confidence interval paths if fields are defined
            if (this.layout.confidence_intervals &&
                this.layout.confidence_intervals.start_field &&
                this.layout.confidence_intervals.end_field) {
                // Generate a selection for all forest plot confidence intervals
                const ci_selection = this.svg.group
                    .selectAll('rect.lz-data_layer-forest.lz-data_layer-forest-ci')
                    .data(track_data, (d) => {
                        return d[this.layout.id_field];
                    });

                const ci_transform = (d) => {
                    let x = this.parent[x_scale](d[this.layout.confidence_intervals.start_field]);
                    let y = this.parent[y_scale](d[this.layout.y_axis.field]);
                    if (isNaN(x)) {
                        x = -1000;
                    }
                    if (isNaN(y)) {
                        y = -1000;
                    }
                    return `translate(${x}, ${y})`;
                };
                const ci_width = (d) => {
                    const {start_field, end_field} = this.layout.confidence_intervals;
                    const scale = this.parent[x_scale];
                    const result =  scale(d[end_field]) - scale(d[start_field]);
                    return Math.max(result, 1);
                };
                const ci_height = 1;
                // Create confidence interval rect elements
                ci_selection.enter()
                    .append('rect')
                    .attr('class', 'lz-data_layer-forest lz-data_layer-forest-ci')
                    .attr('id', (d) => `${this.getElementId(d)}_ci`)
                    .attr('transform', `translate(0, ${isNaN(this.parent.layout.height) ? 0 : this.parent.layout.height})`)
                    .merge(ci_selection)
                    .attr('transform', ci_transform)
                    .attr('width', ci_width) // Math.max(ci_width, 1))
                    .attr('height', ci_height);

                // Remove old elements as needed
                ci_selection.exit()
                    .remove();
            }

            // Generate a selection for all forest plot points
            const points_selection = this.svg.group
                .selectAll('path.lz-data_layer-forest.lz-data_layer-forest-point')
                .data(track_data, (d) => {
                    return d[this.layout.id_field];
                });

            // Create elements, apply class, ID, and initial position
            const initial_y = isNaN(this.parent.layout.height) ? 0 : this.parent.layout.height;

            // Generate new values (or functions for them) for position, color, size, and shape
            const transform = (d) => {
                let x = this.parent[x_scale](d[this.layout.x_axis.field]);
                let y = this.parent[y_scale](d[this.layout.y_axis.field]);
                if (isNaN(x)) {
                    x = -1000;
                }
                if (isNaN(y)) {
                    y = -1000;
                }
                return `translate(${x}, ${y})`;
            };

            const fill = (d, i) => this.resolveScalableParameter(this.layout.color, d, i);
            const fill_opacity = (d, i) => this.resolveScalableParameter(this.layout.fill_opacity, d, i);

            const shape = d3.symbol()
                .size((d, i) => this.resolveScalableParameter(this.layout.point_size, d, i))
                .type((d, i) => {
                    // Legend shape names are strings; need to connect this to factory. Eg circle --> d3.symbolCircle
                    const shape_name = this.resolveScalableParameter(this.layout.point_shape, d, i);
                    const factory_name = `symbol${shape_name.charAt(0).toUpperCase() + shape_name.slice(1)}`;
                    return d3[factory_name] || null;
                });

            points_selection.enter()
                .append('path')
                .attr('class', 'lz-data_layer-forest lz-data_layer-forest-point')
                .attr('id', (d) => this.getElementId(d))
                .attr('transform', `translate(0, ${initial_y})`)
                .merge(points_selection)
                .attr('transform', transform)
                .attr('fill', fill)
                .attr('fill-opacity', fill_opacity)
                .attr('d', shape);

            // Remove old elements as needed
            points_selection.exit()
                .remove();

            // Apply behaviors to points
            this.svg.group
                .on('click.event_emitter', (element_data) => {
                    this.parent.emit('element_clicked', element_data, true);
                }).call(this.applyBehaviors.bind(this));
        }
    }

    /**
     * (**extension**) A y-aligned forest plot in which the y-axis represents item labels, which are dynamically
     *   chosen when data is loaded. Each item is assumed to include both data and confidence intervals.
     *   This allows generating forest plots without defining the layout in advance.
     * @alias module:LocusZoom_DataLayers~category_forest
     * @see module:LocusZoom_DataLayers~BaseDataLayer
     * @see {@link module:ext/lz-forest-track} for required extension and installation instructions
     */
    class CategoryForest extends Forest {
        _getDataExtent(data, axis_config) {
            // In a forest plot, the data range is determined by *three* fields (beta + CI start/end)
            const { confidence_intervals } = this.layout;
            if (confidence_intervals && confidence_intervals.start_field && confidence_intervals.end_field) {
                const min = (d) => +d[confidence_intervals.start_field];
                const max = (d) => +d[confidence_intervals.end_field];
                return [d3.min(data, min), d3.max(data, max)];
            }

            // If there are no confidence intervals set, then range must depend only on a single field
            return super._getDataExtent(data, axis_config);
        }

        getTicks(dimension, config) { // Overrides parent method
            if (!['x', 'y1', 'y2'].includes(dimension)) {
                throw new Error(`Invalid dimension identifier ${dimension}`);
            }

            // Design assumption: one axis (y1 or y2) has the ticks, and the layout says which to use
            // Also assumes that every tick gets assigned a unique matching label
            const axis_num = this.layout.y_axis.axis;
            if (dimension === (`y${axis_num}`)) {
                const category_field = this.layout.y_axis.category_field;
                if (!category_field) {
                    throw new Error(`Layout for ${this.layout.id} must specify category_field`);
                }

                return this.data.map((item, index) => ({ y: index + 1, text: item[category_field] }));
            } else {
                return [];
            }
        }

        applyCustomDataMethods () {
            // Add a synthetic yaxis field to ensure data is spread out on plot. Then, set axis floor and ceiling to
            //  correct extents.
            const field_to_add = this.layout.y_axis.field;
            if (!field_to_add) {
                throw new Error(`Layout for ${this.layout.id} must specify yaxis.field`);
            }

            this.data = this.data.map((item, index) => {
                item[field_to_add] = index + 1;
                return item;
            });
            // Update axis extents based on one label for every point (with a bit of padding above and below)
            this.layout.y_axis.floor = 0;
            this.layout.y_axis.ceiling = this.data.length + 1;
            return this;
        }
    }

    LocusZoom.DataLayers.add('forest', Forest);
    LocusZoom.DataLayers.add('category_forest', CategoryForest);
}

if (typeof LocusZoom !== 'undefined') {
    // Auto-register the plugin when included as a script tag. ES6 module users must register via LocusZoom.use()
    // eslint-disable-next-line no-undef
    LocusZoom.use(install);
}

export default install;
