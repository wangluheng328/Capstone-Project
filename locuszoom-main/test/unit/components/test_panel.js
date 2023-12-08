import { assert } from 'chai';
import * as d3 from 'd3';
import sinon from 'sinon';

import {populate} from '../../../esm/helpers/display';
import Plot from '../../../esm/components/plot';
import Panel from '../../../esm/components/panel';
import DataSources from '../../../esm/data';

describe('Panel', function() {
    // Tests
    describe('Constructor', function() {
        beforeEach(function() {
            d3.select('body').append('div').attr('id', 'plot_id');
            const layout = {
                state: {},
                width: 800,
                panels: [],
            };

            this.plot = populate('#plot_id', new DataSources(), layout);
            this.panel = this.plot.panels.association;
        });

        afterEach(function() {
            d3.select('#plot_id').remove();
            this.plot = null;
            this.panel = null;
        });

        it('should fail if panel layout does not specify an ID', function() {
            assert.throws(
                () => this.plot.addPanel({ 'foo': 'bar' }),
                /must specify "id"/,
            );
        });

        it('should throw an error if adding a panel with an ID that is already used', function() {
            this.plot.addPanel({ 'id': 'duplicate', 'foo': 'bar' });
            assert.throws(() => {
                this.plot.addPanel({ 'id': 'duplicate', 'foo2': 'bar2' });
            });
        });
    });

    describe('Geometry Methods', function() {
        beforeEach(function() {
            d3.select('body').append('div').attr('id', 'plot_id');

            const layout = {
                state: {},
                width: 800,
                panels: [
                    { id: 'association', height: 225, data_layers: [] },
                    { id: 'genes', height: 225, data_layers: [] },
                ],
            };

            layout.state = { chr: '1', start: 1, end: 100000 };
            this.plot = populate('#plot_id', new DataSources(), layout);
            this.association_panel = this.plot.panels.association;
            this.genes_panel = this.plot.panels.genes;
        });

        afterEach(function() {
            d3.select('#plot_id').remove();
            this.plot = null;
            this.association_panel = null;
            this.genes_panel = null;
        });

        it('should allow changing dimensions', function() {
            // TODO: What, exactly, is this testing?
            this.association_panel.setDimensions(840, 560);
            assert.equal(this.association_panel.layout.height, 560);

            this.association_panel.setDimensions(9000, -50);
            assert.equal(this.association_panel.layout.height, 560);

            this.association_panel.setDimensions('q', 942);
            assert.equal(this.association_panel.layout.height, 560);
        });

        it('should allow setting origin irrespective of plot dimensions', function() {
            this.plot.setDimensions(500, 600);
            this.association_panel.setOrigin(20, 50);
            assert.equal(this.association_panel.layout.origin.x, 20);
            assert.equal(this.association_panel.layout.origin.y, 50);

            this.association_panel.setOrigin(0, 0);
            assert.equal(this.association_panel.layout.origin.x, 0);
            assert.equal(this.association_panel.layout.origin.y, 0);

            this.association_panel.setOrigin('q', { foo: 'bar' });
            // TODO: consider making bad input handling explicitly
            assert.equal(this.association_panel.layout.origin.x, 0);
            assert.equal(this.association_panel.layout.origin.y, 0);

            this.association_panel.setOrigin(700, 800);
            assert.equal(this.association_panel.layout.origin.x, 700);
            assert.equal(this.association_panel.layout.origin.y, 800);
        });

        it('should allow setting margin, which sets cliparea origin and dimensions', function() {
            this.association_panel.setMargin(1, 2, 3, 4);
            const layout = this.association_panel.layout;
            assert.equal(layout.margin.top, 1);
            assert.equal(layout.margin.right, 2);
            assert.equal(layout.margin.bottom, 3);
            assert.equal(layout.margin.left, 4);
            assert.equal(layout.cliparea.origin.x, 4);
            assert.equal(layout.cliparea.origin.y, 1);
            assert.equal(layout.cliparea.width, this.association_panel.parent.layout.width - (2 + 4));
            assert.equal(layout.cliparea.height, layout.height - (1 + 3));

            this.association_panel.setMargin(0, '12', -17, {foo: 'bar'});
            assert.equal(layout.margin.top, 0);
            assert.equal(layout.margin.right, 12);
            assert.equal(layout.margin.bottom, 3);
            assert.equal(layout.margin.left, 4);
            assert.equal(layout.cliparea.origin.x, 4);
            assert.equal(layout.cliparea.origin.y, 0);

            assert.equal(layout.cliparea.width, this.plot.layout.width - (12 + 4));
            assert.equal(layout.cliparea.height, layout.height - (0 + 3));
        });

        it('should prevent margins from overlapping', function() {
            this.association_panel.setDimensions(500, 500);
            this.association_panel.setMargin(700, 1000, 900, 800);
            assert.equal(this.association_panel.layout.margin.top, 150);
            assert.equal(this.association_panel.layout.margin.right, 350);
            assert.equal(this.association_panel.layout.margin.bottom, 350);
            assert.equal(this.association_panel.layout.margin.left, 150);
        });

        it('should have a method for moving panels up that stops at the top', function() {
            assert.deepEqual(this.plot._panel_ids_by_y_index, ['association', 'genes']);
            assert.equal(this.association_panel.layout.y_index, 0);
            assert.equal(this.genes_panel.layout.y_index, 1);

            this.genes_panel.moveUp();
            assert.deepEqual(this.plot._panel_ids_by_y_index, ['genes', 'association']);
            assert.equal(this.association_panel.layout.y_index, 1);
            assert.equal(this.genes_panel.layout.y_index, 0);

            this.genes_panel.moveUp();
            assert.deepEqual(this.plot._panel_ids_by_y_index, ['genes', 'association']);
            assert.equal(this.association_panel.layout.y_index, 1);
            assert.equal(this.genes_panel.layout.y_index, 0);
        });

        it('should have a method for moving panels down that stops at the bottom', function() {
            assert.deepEqual(this.plot._panel_ids_by_y_index, ['association', 'genes']);
            assert.equal(this.association_panel.layout.y_index, 0);
            assert.equal(this.genes_panel.layout.y_index, 1);

            this.association_panel.moveDown();
            assert.deepEqual(this.plot._panel_ids_by_y_index, ['genes', 'association']);
            assert.equal(this.association_panel.layout.y_index, 1);
            assert.equal(this.genes_panel.layout.y_index, 0);

            this.association_panel.moveDown();
            assert.deepEqual(this.plot._panel_ids_by_y_index, ['genes', 'association']);
            assert.equal(this.association_panel.layout.y_index, 1);
            assert.equal(this.genes_panel.layout.y_index, 0);
        });
    });

    describe('Data Layer Methods', function() {
        beforeEach(function() {
            const layout = {
                width: 800,
                panels: [
                    { id: 'panel0', height: 400 },
                ],
            };
            d3.select('body').append('div').attr('id', 'plot');
            this.plot = populate('#plot', null, layout);
        });

        afterEach(function() {
            d3.select('#plot').remove();
            this.plot = null;
        });

        it('should have a method for adding data layers', function() {
            const panel0 = this.plot.panels.panel0;
            panel0.addDataLayer({ id: 'layerA', type: 'line' });
            panel0.addDataLayer({ id: 'layerB', type: 'line' });

            const layerA = panel0.data_layers.layerA;
            assert.isObject(layerA);
            assert.equal(layerA.id, 'layerA');
            assert.equal(layerA._layout_idx, 0);
            const layerB = panel0.data_layers.layerB;
            assert.isObject(layerB);
            assert.equal(layerB.id, 'layerB');
            assert.equal(layerB._layout_idx, 1);
            assert.deepEqual(panel0._data_layer_ids_by_z_index, ['layerA', 'layerB']);
            assert.equal(typeof this.plot.state[layerA._state_id], 'object');
            assert.equal(typeof this.plot.state[layerB._state_id], 'object');
        });

        it('should have a method for removing data layers by id', function() {
            const panel0 = this.plot.panels.panel0;
            const layerA = panel0.addDataLayer({ id: 'layerA', type: 'line' });
            const layerB = panel0.addDataLayer({ id: 'layerB', type: 'line' });
            const layerC = panel0.addDataLayer({ id: 'layerC', type: 'line' });
            const state_id = layerB._state_id;
            assert.equal(typeof layerB, 'object');
            assert.equal(typeof this.plot.state[state_id], 'object');
            panel0.removeDataLayer('layerB');
            assert.equal(typeof panel0.data_layers.layerB, 'undefined');
            assert.equal(typeof this.plot.state[state_id], 'undefined');
            assert.equal(layerA._layout_idx, 0);
            assert.equal(layerC._layout_idx, 1);
            assert.equal(layerA.layout.z_index, 0);
            assert.equal(layerC.layout.z_index, 1);
            assert.deepEqual(panel0._data_layer_ids_by_z_index, ['layerA', 'layerC']);
        });
    });

    describe('Panel Curtain and Loader', function() {
        beforeEach(function() {
            const datasources = new DataSources();
            this.layout = {
                width: 100,
                resizable: false,
                panels: [{ id: 'test', height: 100 }],
            };
            d3.select('body').append('div').attr('id', 'plot');
            this.plot = populate('#plot', datasources, this.layout);
            this.panel = this.plot.panels.test;
        });

        afterEach(function() {
            d3.select('#plot').remove();
        });

        it('should have a curtain object with show/update/hide methods, a showing boolean, and selectors', function() {
            const curtain = this.panel.curtain;
            assert.isObject(curtain);
            assert.isFalse(curtain.showing);
            assert.isNull(curtain.selector);
            assert.isNull(curtain.content_selector);
        });

        it('should show/hide/update on command and track shown status', function() {
            const curtain = this.panel.curtain;
            assert.isFalse(curtain.showing);
            assert.isNull(curtain.selector);
            assert.isNull(curtain.content_selector);

            curtain.show('test content');
            assert.isTrue(curtain.showing);
            assert.isFalse(curtain.selector.empty());
            assert.isFalse(curtain.content_selector.empty());
            assert.equal(curtain.content_selector.html(), 'test content');

            curtain.hide();
            assert.isFalse(curtain.showing);
            assert.isNull(curtain.selector);
            assert.isNull(curtain.content_selector);
        });

        it('should have a loader object with show/update/animate/setPercentCompleted/hide methods, a showing boolean, and selectors', function() {
            return this.plot.applyState().then(() => {
                const loader = this.panel.loader;
                assert.isObject(this.panel.loader);
                assert.isFalse(loader.showing);
                assert.isNull(loader.selector);
                assert.isNull(loader.content_selector);
                assert.isNull(loader.progress_selector);
            });
        });

        it('should show/hide/update on command and track shown status', function() {
            return this.plot.applyState().then(() => {
                const loader = this.panel.loader;
                assert.isFalse(loader.showing);
                assert.isNull(loader.selector);
                assert.isNull(loader.content_selector);
                assert.isNull(loader.progress_selector);

                loader.show('test content');
                assert.isTrue(loader.showing);
                assert.isFalse(loader.selector.empty());
                assert.isFalse(loader.content_selector.empty());
                assert.equal(loader.content_selector.html(), 'test content');
                assert.isFalse(loader.progress_selector.empty());
                loader.hide();
                assert.isFalse(loader.showing);
                assert.isNull(loader.selector);
                assert.isNull(loader.content_selector);
                assert.isNull(loader.progress_selector);
            });
        });

        it('should allow for animating or showing discrete percentages of completion', function() {
            const loader = this.panel.loader;
            loader.show('test content').animate();
            assert.isTrue(loader.progress_selector.classed('lz-loader-progress-animated'));
            loader.setPercentCompleted(15);
            assert.equal(loader.content_selector.html(), 'test content');
            assert.isFalse(loader.progress_selector.classed('lz-loader-progress-animated'));
            assert.equal(loader.progress_selector.style('width'), '15%');
            loader.update('still loading...', 62);
            assert.equal(loader.content_selector.html(), 'still loading...');
            assert.equal(loader.progress_selector.style('width'), '62%');
            loader.setPercentCompleted(200);
            assert.equal(loader.progress_selector.style('width'), '100%');
            loader.setPercentCompleted(-43);
            assert.equal(loader.progress_selector.style('width'), '1%');
            loader.setPercentCompleted('foo');
            assert.equal(loader.progress_selector.style('width'), '1%');
        });
    });

    describe('Panel Interactions', function() {
        beforeEach(function() {
            this.plot = null;
            this.datasources = new DataSources()
                .add('static', ['StaticJSON', {
                    data: [{ id: 'a', x: 1, y: 2 }, { id: 'b', x: 3, y: 4 }, { id: 'c', x: 5, y: 6 }],
                }]);
            this.layout = {
                width: 100,
                panels: [
                    {
                        id: 'p',
                        height: 100,
                        axes: {
                            x: { label: 'x' },
                            y1: { label: 'y1' },
                        },
                        interaction: {},
                        data_layers: [
                            {
                                id: 'd',
                                type: 'scatter',
                                namespace: { static: 'static' },
                                id_field: 'static:id',
                                z_index: 0,
                                x_axis: {
                                    field: 'static:x',
                                },
                                y_axis: {
                                    axis: 1,
                                    field: 'static:y',
                                },
                            },
                        ],
                    },
                ],
            };
            d3.select('body').append('div').attr('id', 'plot');
        });

        afterEach(function() {
            d3.select('#plot').remove();
            sinon.restore();
            delete this.plot;
            delete this.datasources;
            delete this.layout;
        });

        it ('should have a method for gathering linked panel IDs', function() {
            d3.select('body').append('div').attr('id', 'plot');
            const layout = {
                width: 100,
                panels: [
                    { id: 'p1', interaction: { x_linked: true } },
                    { id: 'p2', interaction: { y1_linked: true } },
                    { id: 'p3', interaction: { y1_linked: true } },
                    { id: 'p4', interaction: { x_linked: true } },
                    { id: 'p5', interaction: { y2_linked: true } },
                    { id: 'p6', interaction: { x_linked: true } },
                    { id: 'p7', interaction: { y1_linked: true } },
                ],
            };
            const plot = populate('#plot', null, layout);
            assert.ok(Array.isArray(plot.panels.p1.getLinkedPanelIds()));
            assert.ok(Array.isArray(plot.panels.p1.getLinkedPanelIds('x')));
            assert.deepEqual(plot.panels.p1.getLinkedPanelIds('x'), ['p4', 'p6']);
            assert.deepEqual(plot.panels.p1.getLinkedPanelIds('y1'), []);
            assert.deepEqual(plot.panels.p3.getLinkedPanelIds('y1'), ['p2', 'p7']);
            assert.deepEqual(plot.panels.p4.getLinkedPanelIds('foo'), []);
            assert.deepEqual(plot.panels.p4.getLinkedPanelIds({}), []);
            assert.deepEqual(plot.panels.p4.getLinkedPanelIds(7), []);
        });

        it('should establish only what interaction mouse event handlers are needed when no interaction layout directives are defined', function() {
            this.plot = populate('#plot', this.datasources, this.layout);
            assert.isUndefined(this.plot.panels.p.svg.container.select('.lz-panel-background').node().__on.find((item) => item.type === 'mousedown' && item.name === 'plot'));
            assert.isDefined(this.plot.svg.node().__on.find((item) => item.type === 'mouseup' && item.name === 'plot'));
            assert.isDefined(this.plot.svg.node().__on.find((item) => item.type === 'mousemove' && item.name === 'plot'));
            // assert.isUndefined(this.plot.panels.p.svg.container.node().__on.find((item) => item.type === 'wheel' && item.name === 'zoom'));
        });

        it('should establish background drag interaction handlers when the layout directive is present', function() {
            this.layout.panels[0].interaction.drag_background_to_pan = true;
            this.plot = populate('#plot', this.datasources, this.layout);
            return Promise.all(this.plot._remap_promises).then(() => {
                assert.isDefined(this.plot.panels.p.svg.container.select('.lz-panel-background').node().__on
                    .find((item) => item.type === 'mousedown' && item.name === 'plot.p.interaction.drag.background' ));
                assert.isDefined(this.plot.svg.node().__on
                    .find((item) => item.type === 'mouseup' && item.name === 'plot'));
                assert.isDefined(this.plot.svg.node().__on
                    .find((item) => item.type === 'mousemove' && item.name === 'plot'));
            });
        });

        it('should establish x tick drag interaction handlers when the layout directives are present', function() {
            this.layout.panels[0].interaction.drag_x_ticks_to_scale = true;
            this.plot = populate('#plot', this.datasources, this.layout);
            return Promise.all(this.plot._remap_promises).then(() => {
                assert.isDefined(this.plot.svg.node().__on
                    .find((item) => item.type === 'mouseup' && item.name === 'plot'));
                assert.isDefined(this.plot.svg.node().__on
                    .find((item) => item.type === 'mousemove' && item.name === 'plot'));
                assert.isDefined(this.plot.panels.p.svg.container.select('.lz-axis.lz-x .tick text').node().__on
                    .find((item) => item.type === 'mousedown' && item.name === 'plot.p.interaction.drag'));
            });
        });

        it('should establish y1 tick drag interaction handlers when the layout directives are present', function() {
            this.layout.panels[0].interaction.drag_y1_ticks_to_scale = true;
            this.plot = populate('#plot', this.datasources, this.layout);
            return Promise.all(this.plot._remap_promises).then(() => {
                assert.isDefined(typeof this.plot.svg.node().__on
                    .find((item) => item.type === 'mouseup' && item.name === 'plot'));
                assert.isDefined(this.plot.svg.node().__on
                    .find((item) => item.type === 'mousemove' && item.name === 'plot'));
                assert.isDefined(this.plot.panels.p.svg.container.select('.lz-axis.lz-y1 .tick text').node().__on
                    .find((item) => item.type === 'mousedown' && item.name === 'plot.p.interaction.drag'));
            });
        });

        it('should establish a zoom interaction handler on the panel when the layout directive is present', function() {
            this.layout.panels[0].interaction.scroll_to_zoom = true;
            this.plot = populate('#plot', this.datasources, this.layout);
            return Promise.all(this.plot._remap_promises).then(() => {
                assert.isDefined(this.plot.panels.p.svg.container.node().__on
                    .find((item) => item.type === 'wheel' && item.name === 'zoom'));
            });
        });

        it.skip('should pan along the x axis when dragging the background', function() {
            this.layout.panels[0]._interaction.drag_background_to_pan = true;
            this.plot = populate('#plot', this.datasources, this.layout);
            return Promise.all(this.plot._remap_promises).then(() => {
                // Simulate click (mousedown) at [ 50, 50 ]
                sinon.stub(d3, 'mouse').callsFake(() => [50, 50]);
                this.plot.loading_data = false; // TODO: Why isn't this already the case?
                this.plot.panels.p.svg.container.select('.lz-panel-background')
                    .dispatch('mousedown');

                const interaction = this.plot._interaction;
                assert.isObject(interaction);
                assert.equal(interaction.panel_id, this.plot.panels.p.id);

                const dragging = interaction.dragging;
                assert.isObject(dragging);
                assert.equal(dragging.method, 'background');
                assert.equal(dragging.start_x, 50);
                assert.equal(dragging.start_y, 50);
                assert.equal(dragging.dragged_x, 0);
                assert.equal(dragging.dragged_y, 0);

                // Simulate drag (mousemove) to [ 25, 50 ] (x -25)
                sinon.stub(d3, 'mouse').callsFake(() => [25, 50]);
                this.plot.svg.node()['__onmousemove.plot']();
                assert.equal(interaction.panel_id, this.plot.panels.p.id);
                assert.equal(dragging.method, 'background');
                assert.equal(dragging.start_x, 50);
                assert.equal(dragging.start_y, 50);
                assert.equal(dragging.dragged_x, -25);
                assert.equal(dragging.dragged_y, 0);
                assert.deepEqual(this.plot.panels.p.x_extent, [2, 6]);
                // Simulate mouseup at new location
                this.plot.svg.node()['__onmouseup.plot']();
                assert.deepEqual(interaction, {});
                assert.equal(this.plot.panels.p.data_layers.d.layout.x_axis.floor, 2);
                assert.equal(this.plot.panels.p.data_layers.d.layout.x_axis.ceiling, 6);
            });
        });

        it.skip('should scale along the x axis when dragging an x tick', function() {
            this.layout.panels[0]._interaction.drag_x_ticks_to_scale = true;
            this.plot = populate('#plot', this.datasources, this.layout);
            return Promise.all(this.plot._remap_promises).then(() => {
                // Simulate click (mousedown) at [ 50, 0 ] (x tick probably doesn't exist there but that's okay)
                sinon.stub(d3, 'mouse').callsFake(() => [50, 0]);
                this.plot.panels.p.svg.container.select('.lz-axis.lz-x .tick text')
                    .dispatch('mousedown');
                const interaction = this.plot._interaction;
                assert.isObject(interaction);
                const dragging = interaction.dragging;
                assert.isObject(dragging);
                assert.equal(dragging.method, 'x_tick');
                assert.equal(dragging.start_x, 50);
                assert.equal(dragging.start_y, 0);
                assert.equal(dragging.dragged_x, 0);
                assert.equal(dragging.dragged_y, 0);
                // Simulate drag (mousemove) to [ 25, 0 ] (x -25)
                sinon.stub(d3, 'mouse').callsFake(() => [25, 50]);
                this.plot.svg.node()['__onmousemove.plot']();
                assert.equal(dragging.method, 'x_tick');
                assert.equal(dragging.start_x, 50);
                assert.equal(dragging.start_y, 0);
                assert.equal(dragging.dragged_x, -25);
                assert.equal(dragging.dragged_y, 0);
                assert.deepEqual(this.plot.panels.p.x_extent, [1, 9]);
                // Simulate mouseup at new location
                this.plot.svg.node()['__onmouseup.plot']();
                assert.deepEqual(interaction, {});
                assert.equal(this.plot.panels.p.data_layers.d.layout.x_axis.floor, 1);
                assert.equal(this.plot.panels.p.data_layers.d.layout.x_axis.ceiling, 9);
            });
        });

        it.skip('should pan along the x axis when shift+dragging an x tick', function() {
            this.layout.panels[0]._interaction.drag_x_ticks_to_scale = true;
            this.plot = populate('#plot', this.datasources, this.layout);
            return Promise.all(this.plot._remap_promises).then(() => {
                const event = {
                    shiftKey: true, preventDefault: function () {
                        return null;
                    },
                };

                // Simulate shift+click (mousedown) at [ 50, 0 ] (x tick probably doesn't exist there but that's okay)
                sinon.stub(d3, 'mouse').callsFake(() => [50, 0]);
                this.plot.panels.p.svg.container.select('.lz-axis.lz-x .tick text').node()['__onmousedown.plot.p.interaction.drag'](event);

                const { _interaction } = this.plot;
                assert.isObject(_interaction);
                const { dragging } = _interaction;
                assert.isObject(dragging);
                assert.equal(dragging.method, 'x_tick');
                assert.equal(dragging.start_x, 50);
                assert.equal(dragging.start_y, 0);
                assert.equal(dragging.dragged_x, 0);
                assert.equal(dragging.dragged_y, 0);

                // Simulate drag (mousemove) to [ 25, 0 ] (x -25)
                sinon.stub(d3, 'mouse').callsFake(() => [25, 0]);
                this.plot.svg.node()['__onmousemove.plot'](event);
                assert.equal(dragging.method, 'x_tick');
                assert.equal(dragging.start_x, 50);
                assert.equal(dragging.start_y, 0);
                assert.equal(dragging.dragged_x, -25);
                assert.equal(dragging.dragged_y, 0);
                assert.deepEqual(this.plot.panels.p.x_extent, [2, 6]);

                // Simulate mouseup at new location
                this.plot.svg.node()['__onmouseup.plot'](event);
                assert.deepEqual(_interaction, {});
                assert.equal(this.plot.panels.p.data_layers.d.layout.x_axis.floor, 2);
                assert.equal(this.plot.panels.p.data_layers.d.layout.x_axis.ceiling, 6);
            });
        });

        it.skip('should scale along the y1 axis when dragging a y1 tick', function() {
            this.layout.panels[0]._interaction.drag_y1_ticks_to_scale = true;
            this.plot = populate('#plot', this.datasources, this.layout);
            return Promise.all(this.plot._remap_promises).then(() => {
                // Simulate click (mousedown) at [ 0, 25 ] (y1 tick probably doesn't exist there but that's okay)
                sinon.stub(d3, 'mouse').callsFake(() => [0, 25]);
                this.plot.panels.p.svg.container.select('.lz-axis.lz-y1 .tick text').node()['__onmousedown.plot.p.interaction.drag']();
                const { interaction } = this.plot;
                assert.isObject(interaction);

                const { dragging } = interaction;
                assert.isObject(dragging);
                assert.equal(dragging.method, 'y1_tick');
                assert.equal(dragging.start_x, 0);
                assert.equal(dragging.start_y, 25);
                assert.equal(dragging.dragged_x, 0);
                assert.equal(dragging.dragged_y, 0);
                // Simulate drag (mousemove) to [ 0, 75 ] (x +50)
                sinon.stub(d3, 'mouse').callsFake(() => [0, 75]);

                this.plot.svg.node()['__onmousemove.plot']();
                assert.equal(dragging.method, 'y1_tick');
                assert.equal(dragging.start_x, 0);
                assert.equal(dragging.start_y, 25);
                assert.equal(dragging.dragged_x, 0);
                assert.equal(dragging.dragged_y, 50);
                assert.deepEqual(this.plot.panels.p.y1_extent, [2, 14.000000000000004]);
                // Simulate mouseup at new location
                this.plot.svg.node()['__onmouseup.plot']();
                assert.deepEqual(interaction, {});
                assert.equal(this.plot.panels.p.data_layers.d.layout.y_axis.floor, 2);
                assert.equal(this.plot.panels.p.data_layers.d.layout.y_axis.ceiling, 14.000000000000004);
            });
        });

        it.skip('should pan along the y axis when shift+dragging a y tick', function() {
            this.layout.panels[0].interaction.drag_y1_ticks_to_scale = true;
            this.plot = populate('#plot', this.datasources, this.layout);
            return Promise.all(this.plot._remap_promises).then(() => {
                const event = {
                    shiftKey: true, preventDefault: function () {
                        return null;
                    },
                };
                // Simulate shift+click (mousedown) at [ 0, 25 ] (y1 tick probably doesn't exist there but that's okay)
                sinon.stub(d3, 'mouse').callsFake(() => [0, 25]);

                this.plot.panels.p.svg.container.select('.lz-axis.lz-y1 .tick text').node()['__onmousedown.plot.p.interaction.drag'](event);
                const interaction = this.plot.interaction;
                assert.isObject(interaction);
                const dragging = interaction.dragging;
                assert.isObject(dragging);
                assert.equal(dragging.method, 'y1_tick');
                assert.equal(dragging.start_x, 0);
                assert.equal(dragging.start_y, 25);
                assert.equal(dragging.dragged_x, 0);
                assert.equal(dragging.dragged_y, 0);
                // Simulate drag (mousemove) to [ 0, 75 ] (x +50)
                sinon.stub(d3, 'mouse').callsFake(() => [0, 75]);

                this.plot.svg.node()['__onmousemove.plot'](event);
                assert.equal(dragging.method, 'y1_tick');
                assert.equal(dragging.start_x, 0);
                assert.equal(dragging.start_y, 25);
                assert.equal(dragging.dragged_x, 0);
                assert.equal(dragging.dragged_y, 50);
                assert.deepEqual(this.plot.panels.p.y1_extent, [4, 8]);
                // Simulate mouseup at new location
                this.plot.svg.node()['__onmouseup.plot'](event);
                assert.deepEqual(interaction, {});
                assert.equal(this.plot.panels.p.data_layers.d.layout.y_axis.floor, 4);
                assert.equal(this.plot.panels.p.data_layers.d.layout.y_axis.ceiling, 8);
            });
        });
    });

    describe('Panel events', function() {
        beforeEach(function() {
            const layout = {
                panels: [
                    { id: 'panel0' },
                ],
            };
            d3.select('body').append('div').attr('id', 'plot');
            this.plot = populate('#plot', null, layout);
            this.panel = this.plot.panels.panel0;
        });

        afterEach(function() {
            d3.select('#plot').remove();
            this.plot = null;
        });

        it('should send events packaged with source and data', function() {
            const spy = sinon.spy();
            this.panel.on('element_clicked', spy);
            this.panel.emit('element_clicked', { something: 1 });

            assert.ok(spy.calledWith({
                sourceID: 'plot.panel0',
                target: this.panel,
                data: {something:1},
            }));
        });

        it('should bubble events to plot and preserve event source + data when expected', function() {
            const panel_spy = sinon.spy();
            const plot_spy = sinon.spy();

            this.plot.on('element_clicked', plot_spy);
            this.panel.on('element_clicked', panel_spy);

            this.panel.emit('element_clicked', {something: 1}, true);

            const expectedEvent = { sourceID: 'plot.panel0', target: this.panel, data: { something: 1 } };

            assert.ok(plot_spy.calledOnce, 'Plot event was fired');
            assert.ok(plot_spy.calledWith(expectedEvent), 'Plot called with expected event');
            assert.ok(panel_spy.calledOnce, 'Panel event was fired');
            assert.ok(panel_spy.calledWith(expectedEvent), 'Panel called with expected event');
        });

        it('should bubble events to plot if a plot-level listener is defined (even if there is no listener on the panel', function () {
            const plot_spy = sinon.spy();

            this.plot.on('element_clicked', plot_spy);
            this.panel.emit('element_clicked', {something: 1}, true);

            assert.isUndefined(this.panel._event_hooks['element_clicked'], 'Panel listener is not defined');
            assert.isDefined(this.plot._event_hooks['element_clicked'], 'Plot listener is defined');
            assert.equal(this.plot._event_hooks['element_clicked'].length, 1, 'Plot listener is defined and attached');

            assert.ok(plot_spy.calledOnce, 'Plot event was bubbled up even though there is no listener on the panel');
        });

        it('should bubble events to plot (overloaded no-data call signature)', function() {
            const panel_spy = sinon.spy();
            const plot_spy = sinon.spy();

            this.plot.on('element_clicked', plot_spy);
            this.panel.on('element_clicked', panel_spy);

            // When only two arguments are specified, with last one a boolean
            this.panel.emit('element_clicked', true);

            const expectedEvent = { sourceID: 'plot.panel0', target: this.panel, data: null };

            assert.ok(plot_spy.calledOnce, 'Plot event was fired');
            assert.ok(plot_spy.calledWith(expectedEvent), 'Plot called with expected event');
            assert.ok(panel_spy.calledOnce, 'Panel event was fired');
            assert.ok(panel_spy.calledWith(expectedEvent), 'Panel called with expected event');
        });

        it('should not bubble events to plot when not expected', function() {
            // "No data" call signature
            const panel_nodata_spy = sinon.spy();
            const plot_nodata_spy = sinon.spy();

            this.plot.on('element_clicked', plot_nodata_spy);
            this.panel.on('element_clicked', panel_nodata_spy);

            this.panel.emit('element_clicked', false);

            const expectedEvent = { sourceID: 'plot.panel0', target: this.panel, data: null };

            assert.ok(plot_nodata_spy.notCalled, 'Plot event should not be fired');
            assert.ok(panel_nodata_spy.calledOnce, 'Panel event was fired');
            assert.ok(panel_nodata_spy.calledWith(expectedEvent), 'Panel called with expected event');

            // "Has data" call signature
            const panel_withdata_spy = sinon.spy();
            const plot_withdata_spy = sinon.spy();
            this.panel.on('element_clicked', panel_withdata_spy);
            this.panel.emit('element_clicked', {something: 1}, false);

            const expectedDataEvent = { sourceID: 'plot.panel0', target: this.panel, data: { something: 1 } };

            assert.ok(plot_withdata_spy.notCalled, 'Plot event (with data) should not be not fired');
            assert.ok(panel_withdata_spy.calledOnce, 'Panel event (with data) was fired');
            assert.ok(panel_withdata_spy.calledWith(expectedDataEvent), 'Panel event (with data) called with expected event');
        });

        it('allows event listeners to be removed / cleaned up individually', function() {
            const listener_handle = this.panel.on('element_clicked', function () {
            });
            assert.equal(this.panel._event_hooks['element_clicked'].length, 1, 'Registered event listener');

            this.panel.off('element_clicked', listener_handle);
            assert.equal(this.panel._event_hooks['element_clicked'].length, 0, 'De-registered event listener');
        });

        it('allows event listeners to be removed / cleaned up all at once', function() {
            // Register two events!
            this.panel.on('element_clicked', function() {});
            this.panel.on('element_clicked', function() {});
            assert.equal(this.panel._event_hooks['element_clicked'].length, 2, 'Registered event listeners');

            this.panel.off('element_clicked');
            assert.equal(this.panel._event_hooks['element_clicked'].length, 0, 'De-registered event listener');
        });

        it('should scope the value of this to wherever the listener was attached, unless overridden', function() {
            let call_count = 0;
            this.plot.on('element_clicked', function() {
                assert.ok(this instanceof Plot, 'Plot listener is bound to plot');
                call_count += 1;
            });
            this.panel.on('element_clicked', function(event) {
                assert.ok(this instanceof Panel, 'Panel listener is bound to panel');
                call_count += 1;
            });

            // Any manually provided binding context will override the one used by default. For example, an event
            //  listener could be used to trigger changes to a viewmodel for a different widget
            const bind_context = {
                someInstanceMethod: function () {
                },
            };
            this.panel.on('element_clicked', function () {
                assert.deepEqual(this, bind_context, 'Manually bound context overrides defaults');
                call_count += 1;
            }.bind(bind_context));

            this.panel.emit('element_clicked', true);
            assert.equal(call_count, 3, 'All listener handlers were called as expected');
        });
    });
});
