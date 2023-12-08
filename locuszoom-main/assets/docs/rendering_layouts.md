---
title: Layouts and Visualization Options
toc: true
toc-title: Table of Contents
---

# Overview
LocusZoom provides a rich set of features for visualizing and comparing genetic data, including by comparing multiple datasets within the same plot. It does so by embracing a configuration-driven model that decouples content ([data adapters](data_retrieval.html)) from presentation (data layers).
 
Although the individual pieces are [documented](../) in depth, many of the most interesting features arise from combining those pieces together in new ways. *Layouts* are the "glue" that connects pieces together, as well as being the primary means through which plots and data sources are created and configured.

At the simplest, a layout is a JSON-serializable object that describes every customizable feature of a LocusZoom plot. A layout should only ever contain scalar values, arrays, and objects - no functions! 

# Your first plot: defining how to render data
We provide a set of built-in layouts for rendering common types of LocusZoom plots. If your field names match the assumptions of the [UMich Portaldev API](https://portaldev.sph.umich.edu/docs/api/v1/), you should be able to create common types of visualization with very little modification.

```javascript
// Define the layout
const layout = LocusZoom.Layouts.get(
    'plot', 
    'standard_association', 
    { state: { genome_build: 'GRCh37', chr: 10, start: 114550452, end: 115067678} }
);
// Use the layout to render the plot (with data sources defined from the previous guide)
const plot = LocusZoom.populate('#lz-plot', data_sources, layout);
```

Highly customized LocusZoom usages may create their own layout from scratch, but it is much more common to start with a pre-existing layout. 

## Understanding the example
In the example above, a pre-defined layout is retrieved from the *registry* of common options: `LocusZoom.Layouts`. This registry is organized by type of building block (plot, panel, data layer, etc), and the specific layout requested is the "classic" LocusZoom plot (called `standard_association`). See the [developer documentation](../api/module-LocusZoom_Layouts.html) for a full list of the pre-defined options, or introspect the currently available options in the javascript console using the following command:

`LocusZoom.Layouts.list()`

The final argument used to retrieve the layout above is an object containing "overrides": values that, if present, will replace the default configuration. In this case, we do not override any display options, but we do provide *state* information that controls what is shown: specifically, a default set of region coordinates that define the region for the first plot added to the page.

Running these commands in the JS developer console will allow you to examine the entire layout in detail. Introspecting the behavior of the plot is an extremely powerful tool for learning and debugging!

# Composition of pieces
The key to rendering multiple kinds of data is *composition*. LocusZoom provides a broad set of reusable building blocks, which can be stacked on top of each other (data layers), or adjacent (panels). New developers often begin by inspecting the entire layout at once (top-down), but breaking it into individual pieces (reading the layout "bottom-up") is much more effective (and less intimidating). Oftentimes, you can achieve the customizations you want by modifying only a few options. 
 
Understanding the basic building blocks is key to customizing a rendering for your needs. 
See: [Getting started](index.html) for a guide to these building blocks and how they are arranged, or skip to "how to read a layout" below.

## Plugins via a central registry
LocusZoom supports plugins without additional installation code, via a central *registry* that tracks available features. For example, the known data rendering options are registered in `LocusZoom.DataLayers`.

A layout object does not define code or new features: layouts are simple JSON-serializable configuration objects that spell out how to use existing rendering types. Custom data sources, layers, or scale functions must be defined before use. The dependence on the central registry means that code features (like a particular type of data layer or scale function) are requested by name, as strings. 

In order to ensure that each rendering is totally isolated and de-coupled, all **layouts must be JSON-serializable**. Simple types like strings, objects, numbers, and lists are allowed, but a layout cannot contain code. At plot creation, LocusZoom will interpret the layout and locate the features you request by name.

# Working with layouts
## How to read a layout
A good way to practice reading layouts (as a combination of several pieces) is to look at the [source code](https://github.com/statgen/locuszoom/blob/master/esm/layouts/index.js) where standard layouts are defined. Consider the `standard_association` plot:

```js
LocusZoom.Layouts.add('plot', 'standard_association', {
    state: {},
    width: 800,
    responsive_resize: true,
    min_region_scale: 20000,
    max_region_scale: 1000000,
    toolbar: LocusZoom.Layouts.get('toolbar_widgets', 'standard_plot'),
    panels: [
        LocusZoom.Layouts.get('panel', 'association', { height: 225 }),
        LocusZoom.Layouts.get('panel', 'genes', { height: 225 })
    ]
});
```

In this view, we have abstracted away all the details of what is plotted, and we can just see the basic pieces: this plot has two panels (association data and genes data) that are displayed separately on the same screen. At the plot level, each panel is 225px high, so the total plot height will be the sum of panels (450 px); if more panels are added, the plot height will increase to match. The actual details of what to render are defined as nested layouts (association and genes panels), and the registry also contains predefined options for each of these smaller pieces- `LocusZoom.Layouts.get(...)` returns a JSON object.  

Although the layout could be defined as a single giant object (top-down view of everything at once), defining it in terms of reusable building blocks (bottom up) makes it much easier to read and see boundaries. 

Note that this layout is added to the registry using `LocusZoom.Layouts.add(...)`. We will cover this in "working with the registry", below.

### Will this layout work with my data?
LocusZoom has two pieces: content and presentation. By default, the default data layers are designed to work with the field names (and formats) used by the [UMich Portaldev API](https://portaldev.sph.umich.edu/docs/api/v1/#overview-of-api-endpoints). If your data source returns a different payload format, field names, or notation conventions, you may need to modify a pre-existing layout in order to plot that data.

Consider this fragment of the standard association data layer, shown below: 

```js
LocusZoom.Layouts.add('data_layer', 'association_pvalues', {
    namespace: { 'assoc': 'assoc', 'ld': 'ld' },
    type: 'scatter',
    id_field: 'assoc:variant',
    x_axis: {
        field: 'assoc:position'
    }
});
```

Key things to notice are:

1. The data layer will see all of the fields provided by the relevant data sources/adapters. Each field will be prefixed by the "local namespace" for that data (eg if both `assoc` and `ld` provide a field called `id`, both will be present and distinct in the joined data: `assoc:id` and `ld:id`)
2. This layout is generic: the use of namespaces means "given association data from somewhere". See "using namespaces" below.
3. Other sections of the layout (such as `x_axis`) can reference the fields requested, using the same syntax.

You will sometimes see fields referenced elsewhere with an additional syntax, like `assoc:variant|htmlescape`. The `|htmlescape` is a [*transform*](../api/module-LocusZoom_TransformationFunctions.html) that affects value display. Transforms can be applied anywhere that a field value is used.

Every data layer in the registry will contain an automatically-defined property called `_auto_fields`, describing the names of all fields expected by this layout object. This is a quick guide for a developer who wants to see a summary of what data is used.

### renameFields: resolving tiny differences in naming
Sometimes, an existing layout is very close to the format of your data, but there are very small cosmetic differences. For example, your API might send a field `variant_name` instead of `variant`.

In this case, a helper function is provided this will recursively rename every usage of a specified field name in a layout:

```javascript
// For abstract layouts
layout = LocusZoom.Layouts.renameField(layout, 'assoc:old_name', 'assoc:new_name');

// For concrete layouts
layout = LocusZoom.Layouts.renameField(layout, 'my_assoc:old_name', 'my_assoc:new_name');

// To remove a transformation function that is no longer interesting. (must be done in a separate step; otherwise transforms will be preserved after the rename)
// The last argument (warn_transforms) suppresses the JS console message that tells you when a rename would affect a field that uses transforms. After all, in this case, that's sort of the point.
layout = LocusZoom.Layouts.renameField(layout, 'assoc:pvalue|neg_log10', 'assoc:pvalue', false);
```

> NOTE: Sometimes, the differences in data/field names are more than cosmetic: for example, renaming `pvalue|neg_log10` to `log_pvalue|neg_log10` would not make sense. This helper method will attempt to warn you if template transformation functions are being used on the field you are changing, so that you can ensure that the resulting layouts uses your data in a way that fits the intended meaning.

> Over time, LocusZoom will become more stringent about what field names it expects to receive. As such, it may make more sense to rename certain fields from the server to match the layout (rather than renaming the layout to match the data). (the `_annotateRecords` method of a custom adapter can be used for this purpose) Most fields work either way; some, like `log_pvalue`, are a special case. 

## Working with the Registry
Typically, LocusZoom layouts are loaded via the registry, a set of pre-made reusable layouts. The act of fetching a layout converts it from the abstract definition to one that works with a specific dataset.  

Since the registry just returns JSON-serializable objects, you could create a plot or panel configuration by hand. But this is often tedious, and using the registry will save you from writing many lines of boilerplate code. 

### What pieces are available?

To see the list of pre-defined layouts (as well as any custom ones you have created):
```js
> LocusZoom.Layouts.list();
{plot: Array(4), panel: Array(7), data_layer: Array(9), toolbar: Array(4), toolbar_widgets: Array(1), tooltip: Array(5) }
```

This will return a top level representation of the available types, showing the available categories. Note that even data layers are composed of smaller building blocks. This lets you use individual parts of a representation (like association tooltips) without committing to the other design choices for a common piece (like the association layer). 

Asking for just the plots shows a list of specific options. Typically, we try to provide example pages that use (most) of the layouts that come with LocusZoom; see the [example gallery](http://statgen.github.io/locuszoom/) to preview how these layouts would look.
 
```js
> LocusZoom.Layouts.list('plot');
(4) ["standard_association", "association_catalog", "standard_phewas", "interval_association"]
```

You may find that the example gallery performs additional customizations on a layout, so this can be a source of ideas. Typically, we try very hard to not make major changes in a layout that is widely in use. Any backwards-incompatible changes will usually be identified in the [release notes](https://github.com/statgen/locuszoom/releases).  


### Modifying all (or part) of a layout
If you are building your own API aimed at use with LocusZoom, then the path of least resistance is to use the same field names as the pre-defined layouts.
 
The most straightforward way to modify a layout is to pass just a few overrides. This works will for simple values (like strings), or keys of nested objects:

Consider an association plot, where the only requested change is to use the right side y-axis (2) instead of the left side y-axis (1, the default). This can be accomplished by adding a key to the third argument of `LocusZoom.Layouts.get(...)`. Note how the other existing options are preserved.

```js
> LocusZoom.Layouts.get('data_layer', 'association_pvalues', { namespace: { assoc: 'my_dataset_1' }, y_axis: { axis: 2 } } );
{ 
  y_axis: { axis: 2, field: "my_dataset_1:log_pvalue", floor: 0, upper_buffer: 0.1, min_extent: [0, 10] }
}
```

The "modifications" object does not work as well for compound values, like a list, because this behavior is not well defined: changing the 5th element of a list could mean replacement, removal, or minor additions to fields... etc. In practice, this is quite often relevant... because panels and data layers are specified as lists. (order matters)
 
For complex scenarios like adding toolbar buttons or overriding the panels/data layers in a plot, you can build your own layout using all or some of the pieces of the layouts registry. One trick that is commonly used in the LocusZoom.js source code is to modify just one part of an existing array field via *self-calling functions* that immediately return a new, modified object. (this creates the modifications in-place, without leaving any temporary variables around afterwards) Eg, for a toolbar that adds just one extra button to an existing layout:

```js
{
    toolbar: (function () {
        var base = LocusZoom.Layouts.get('toolbar', 'standard_panel');
        base.widgets.push({
            type: 'toggle_legend',
            position: 'right'
        });
        return base;
    })() // Function calls itself immediately, so "toolbar" is set to the return value
}
```

Currently, modifying every level of a deeply nested layout is not an ideal process. Although the above trick (combined with our efforts at backwards compatibility) makes the process possible without copying hundreds of lines of code, we are exploring other, more ergonomic ways to customize layouts in the future. 

> TIP: When modifying one option from a list (like changing the label of a toolbar button), it is tempting to address it using simple JavaScript operations, like `widgets[0].button_html += 'something'`. However, this becomes very hard to read and maintain over time: if someone adds a new button to the start of the list, it will not be obvious that the meaning of `button[0]` has changed (or what the correct meaning should be). Try to use clear variable names like `const display_options = button[0]` to convey intent, and override the smallest reusable piece possible. Layouts are defined from the bottom up, not the top down!

## Nested rule example: scalable parameters
Each key in a layout object corresponds to a set of options supported by the thing that the configuration is intended to control. For example, scatter plots provide simple options that obey exactly one rule (like what to show on the x-axis), but there are also *scalable* parameters like `point_size` and `point_shape`, in which case several rules can be tried in sequence until the first non-null result is found.

Consider the rules below: in a classic LocusZoom plot, points are colored by LD information, or shown in grey if no LD information is available.

```javascript
const data_layer = { 
    ...options,
    color: [
    {
        // Name of a function specified in `LocusZoom.ScaleFunctions`
        scale_function: 'if',
        // The field whose value will be passed to the scale function
        field: 'lz_is_ld_refvar',
        // Options that will be passed to the scale function; see documentation for available options
        parameters: {
            field_value: 1,
            then: '#9632b8',
        },
    },
    {
        scale_function: 'numerical_bin',
        field: 'ld:correlation',
        parameters: {
            breaks: [0, 0.2, 0.4, 0.6, 0.8],
            values: ['#357ebd', '#46b8da', '#5cb85c', '#eea236', '#d43f3a'],
        },
    },
    '#B8B8B8',
]
}
```

Common scalable parameters include point size, color, and shape. The full developer documentation marks which parameters are scalable for each data layer rendering type, and describes the options that can be used with each scaling function rule.

Custom scaling functions may be defined as follows:

```javascript
LocusZoom.ScaleFunctions.add('myfunction', (parameters, field_value) => calculated_result_or_null); 
```

## Documentation by example
Composition of smaller pieces is a powerful strategy- but it also means that no single documentation page can explain every feature (because important behavior emerges when two building blocks are combined). As such, examples are a key and explicit part of how LocusZoom usage is documented. 

We encourage you to look at the builtin layouts (via the JS console, or [source code](https://github.com/statgen/locuszoom/blob/master/esm/layouts/index.js)) as a guide to "what works", and the [example gallery](http://statgen.github.io/locuszoom/) (with [example code](https://github.com/statgen/locuszoom/tree/develop/examples)) to see what options look like in practice.  The full [developer documentation](../api) enumerates every possible layout configuration option for each plot, panel, data layer rendering type, or rule.

Lastly: LocusZoom works with evolving datasets, and pieces were contributed by different authors. For every hard and fast "rule", there is always an exception! If you find gaps in the documentation, please contact the developers (or [mailing list](https://groups.google.com/forum/#!forum/locuszoom)) and we will make improvements. 

# Advanced use cases
## Plotting more than one study
It is often desirable to draw comparisons between two studies- eg, by plotting two association tracks (panels) on the same page. This means that you will need to create two association panel layouts, and each one will need to know where to find the relevant data for that track.
 
In LocusZoom, this is accomplished via *namespaces*.

### Using namespaces
A namespaced layout (usually for panels and below) is one that identifies where to find the relevant data. Due to how separation of concerns works, this requires coordination between the data sources (content) and the layout (presentation).

Consider the following example, which plots two association studies and a genes track:

```js
// Other standard sources (genes, LD) omitted for clarity
data_sources
  .add("assoc_study1", ["AssociationLZ", {url: "/api/association/", source: 1 }])
  .add("assoc_study2", ["AssociationLZ", {url: "/api/association/", source: 2 }])
  .add("gene", ["GeneLZ", { url: apiBase + "annotation/genes/", build: 'GRCh37' }]);
```

```js
// This outer call to Layouts.get() will ensure that namespaces are applied, and the returned result is a concrete 
//   layout ready for use in drawing a plot with specific data sets. 
const plot_layout = LocusZoom.Layouts.get('plot', 'standard_association', { // Override select fields of a pre-made layout 
    responsive_resize: true,
    panels: [
        LocusZoom.Layouts.get('panel', 'association', {
            namespace: { assoc: 'assoc_study1' }, // This is the key piece. It says "for this panel, and its child data layers, look for the association data in a datasource called "assoc_study1".
            height: 400,
            id: 'assoc_study1', // Give each panel a unique ID
            title: { text: 'Study 1' },
        }),
        LocusZoom.Layouts.get('panel', 'association', {
            namespace: { assoc: 'assoc_study2' },
            height: 400,
            id: 'assoc_study2',
            title: { text: 'Study 2' },
        }),
        // Even though genes are part of the original "standard association plot" layout, overriding the panels array means replacing *all* of the panels.
        LocusZoom.Layouts.get('panel', 'genes', { height: 400 })  // The layout provides a built-in default: "look for gene data in an adapter called gene". In this example, the default matches what sources were defined, so we don't need to override it.
    ]
});
```

Namespaces are the only thing that needs to be changed in order to use a layout with a different source of data. Internally, things are referred to via the "local" name. Eg given `{ assoc: 'assoc_study2' }`, individual fields would be referenced as `assoc:some_field`, no matter where the data actually came from.


### Adding panels
The above example demonstrates how to add multiple studies at the time of plot creation. However, sites like the T2D Portal have many datasets, and it can be helpful to let the user interactively choose which other panels to show after first render. New panels can be added dynamically! When doing so, the plot will grow to accommodate the new panel.

```js
// This creates a new configuration object
var extra_panel_layout = LocusZoom.Layouts.get('panel', 'association', {
    namespace: { assoc: 'assoc_study3' },
    id: 'assoc_study3',
    title: { text: 'Study 3' },
    y_index: -1 // Special option used by addPanel: inserts this study right before the genes track
});

// Must add both data sources and panels
existing_datasources
  .add("assoc_study3", ["AssociationLZ", {url: "/api/association/", source: 3 }]);

const new_panel = existing_plot.addPanel(extra_panel_layout); // Adds the panel and redraws plot
```

## Layouts also control behavior
In this guide, we have mostly focused on Layouts as a tool for controlling how data is rendered. However, layouts also provide configuration directives to enable powerful behaviors such as zooming, matching, and filtering. See the [guide to interactivity](interactivity.html) for details.

## Where to find more information
 We also provide other tools (such as [LocalZoom](https://github.com/statgen/localzoom/blob/master/src/util/lz-helpers.js)), which demonstrate higher-order concepts like adding multiple panels to the same plot. Note that this code base is very heavily oriented around the idea of composition, with functions like `createStudyLayout`, `createStudyTabixSources`, and `addPanels`. Instead of defining the entire layout, this structure is focused on creating each piece required and combining them as appropriate. The same process is used to create layouts for the first study track as for the fourth.
