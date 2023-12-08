import {assert} from 'chai';
import Field from '../../../esm/data/field';

describe('Field resolver', function () {
    it('should correctly parse name-only field string into components', function () {
        const f = new Field('foo');
        assert.equal(f.full_name, 'foo');
        assert.equal(f.field_name, 'foo');
        assert.isArray(f.transformations);
        assert.equal(f.transformations.length, 0);
    });

    it('should correctly parse namespaced field string into components', function () {
        const f = new Field('foo:bar');
        assert.equal(f.full_name, 'foo:bar');
        assert.equal(f.field_name, 'foo:bar');
        assert.isArray(f.transformations);
        assert.equal(f.transformations.length, 0);
    });

    it('should correctly parse namespaced field string with single transformation into components', function () {
        const f = new Field('foo:bar|scinotation');
        assert.equal(f.full_name, 'foo:bar|scinotation');
        assert.equal(f.field_name, 'foo:bar');
        assert.isArray(f.transformations);
        assert.equal(f.transformations.length, 1);
        assert.isFunction(f.transformations[0]);
    });

    it('should correctly parse namespaced field string with multiple transformations into components', function () {
        const f = new Field('foo:bar|scinotation|htmlescape');
        assert.equal(f.full_name, 'foo:bar|scinotation|htmlescape');

        assert.equal(f.field_name, 'foo:bar');
        assert.isArray(f.transformations);
        assert.equal(f.transformations.length, 2);
        assert.isFunction(f.transformations[0]);
        assert.isFunction(f.transformations[1]);
    });

    it('should resolve a value when passed a data object', function () {
        const d = { 'foo:bar': 123 };
        const f = new Field('foo:bar');
        const v = f.resolve(d);
        assert.equal(v, 123);
    });

    it('should use annotations (extra_fields) by exact field name, iff no value is present in point data', function () {
        const d = { 'foo:bar': 123, 'foo:my_annotation': 13 };
        const f = new Field('my_annotation');
        const v = f.resolve(d, { 'my_annotation': 12 });
        assert.equal(v, 12);
    });

    it('should apply arbitrarily many transformations in the order defined', function () {
        const d = { 'foo:bar': 123 };
        const f = new Field('foo:bar|neglog10|htmlescape|urlencode');
        const v = f.resolve(d);
        assert.equal(v, '-2.0899051114393976');
        assert.equal(d['foo:bar|neglog10|htmlescape|urlencode'], '-2.0899051114393976', 'Value is cached for future lookups');
    });

    it('should compose two transformations of the same type', function () {
        const d = { 'foo:pvalue': 10 };
        const f = new Field('foo:pvalue|log10|log10');
        const v = f.resolve(d);
        assert.equal(v, 0);
    });

    it('should compose two different numeric transformations left to right', function () {
        const d = { 'foo:pvalue': 0.5 };
        const f = new Field('foo:pvalue|neglog10|log10');
        const v = f.resolve(d);
        assert.equal(v, -0.5213902276543249);
    });
});
