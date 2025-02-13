import {expect} from './header';
import {resolvePath as resolve, PathErrorCode, PathInput, tokenizePath} from '../src';

describe('for an empty string', () => {
    it('must fail correctly', () => {
        const target = {};
        expect(resolve(target, '')).to.eql({
            chain: [''],
            scope: target,
            options: undefined,
            idx: -1,
            errorCode: PathErrorCode.emptyName
        });
    });
});

describe('for an empty array', () => {
    it('must report correctly', () => {
        // this is to ensure that an advanced result validator can handle such case correctly:
        expect(resolve(null, [])).to.eql({
            chain: [],
            scope: null,
            options: undefined,
            idx: -1,
            exists: true,
            value: undefined
        });
    });
});

describe('one property', () => {
    describe('this', () => {
        it('must resolve any value', () => {
            expect(resolve.call(undefined, null, 'this')).to.eql({
                chain: ['this'],
                scope: undefined,
                options: undefined,
                idx: 0,
                exists: true,
                value: undefined
            });
            expect(resolve.call(null, null, 'this')).to.eql({
                chain: ['this'],
                scope: null,
                options: undefined,
                idx: 0,
                exists: true,
                value: null
            });
            expect(resolve.call(123, null, 'this')).to.eql({
                chain: ['this'],
                scope: 123,
                options: undefined,
                idx: 0,
                exists: true,
                value: 123
            });
        });
    });
    describe('for primitive types', () => {
        it('must call functions with context', () => {
            const scope1 = 123;
            expect(resolve(scope1, 'toExponential')).to.eql({
                chain: ['toExponential'],
                scope: scope1,
                options: undefined,
                idx: 0,
                exists: true,
                value: '1.23e+2'
            });
            const scope2 = 'test';
            expect(resolve(scope2, 'length')).to.eql({
                chain: ['length'],
                scope: scope2,
                options: undefined,
                idx: 0,
                exists: true,
                value: 4
            });
        });
    });
    describe('for missing object properties', () => {
        it('must resolve with undefined', () => {
            const scope = {};
            expect(resolve(scope, 'one')).to.eql({
                chain: ['one'],
                scope,
                options: undefined,
                idx: 0,
                exists: false,
                value: undefined
            });
        });
    });
    describe('for missing primitive properties', () => {
        it('must resolve with undefined', () => {
            const scope = 123;
            expect(resolve(scope, 'one')).to.eql({
                chain: ['one'],
                scope,
                options: undefined,
                idx: 0,
                exists: false,
                value: undefined
            });
        });
    });
    describe('for functions', () => {
        it('must invoke correctly', () => {
            const obj1 = {one: () => 123};
            expect(resolve(obj1, 'one')).to.eql({
                chain: ['one'],
                scope: obj1,
                options: undefined,
                idx: 0,
                exists: true,
                value: 123
            });
            const obj2 = {
                one: 123, getValue() {
                    return this.one;
                }
            };
            expect(resolve(obj2, 'getValue')).to.eql({
                chain: ['getValue'],
                scope: obj2,
                options: undefined,
                idx: 0,
                exists: true,
                value: 123
            });
        });
    });
});

describe('multiple properties', () => {
    describe('for valid simple names', () => {
        it('must resolve', () => {
            const obj1 = {one: {two: 12}};
            expect(resolve(obj1, 'one.two')).to.eql({
                chain: ['one', 'two'],
                scope: obj1,
                options: undefined,
                idx: 1,
                exists: true,
                value: 12
            });
            const obj2 = {one: {two: {three: 123}}};
            expect(resolve(obj2, 'one.two.three')).to.eql({
                chain: ['one', 'two', 'three'],
                scope: obj2,
                options: undefined,
                idx: 2,
                exists: true,
                value: 123
            });
        });
    });
    describe('for invalid simple names', () => {
        it('must resolve', () => {
            const obj1 = {};
            expect(resolve(obj1, 'one.two')).to.eql({
                chain: ['one', 'two'],
                scope: obj1,
                options: undefined,
                idx: 0,
                errorCode: PathErrorCode.stopped
            });
            const obj2 = {one: {}};
            expect(resolve(obj2, 'one.two.three.four')).to.eql({
                chain: ['one', 'two', 'three', 'four'],
                scope: obj2,
                options: undefined,
                idx: 1,
                errorCode: PathErrorCode.stopped
            });
        });
    });
    describe('for context names', () => {
        it('must resolve one property', () => {
            const obj1 = {one: 1};
            expect(resolve.call(obj1, obj1, 'this.one')).to.eql({
                chain: ['this', 'one'],
                scope: obj1,
                options: undefined,
                idx: 1,
                exists: true,
                value: 1
            });
            expect(resolve.call(obj1, null, 'this.one')).to.eql({
                chain: ['this', 'one'],
                scope: obj1,
                options: undefined,
                idx: 1,
                exists: true,
                value: 1
            });
        });
        it('must resolve any chain', () => {
            const obj1 = {one: {two: 12}};
            expect(resolve.call(obj1, obj1, 'this.one.two')).to.eql({
                chain: ['this', 'one', 'two'],
                scope: obj1,
                options: undefined,
                idx: 2,
                exists: true,
                value: 12
            });
        });
    });
    describe('for this in the wrong place', () => {
        it('must be reported', () => {
            const obj = {one: 1};
            expect(resolve(obj, 'one.this')).to.eql({
                chain: ['one', 'this'],
                scope: obj,
                options: undefined,
                idx: 0,
                errorCode: PathErrorCode.invalidThis
            });
        });
    });
});

describe('for special function', () => {
    it('must fail for async', () => {
        const obj = {value: async () => ({one: 123})};
        expect(resolve(obj, ['value', 'one'])).to.eql({
            chain: ['value', 'one'],
            scope: obj,
            options: undefined,
            idx: -1,
            errorCode: PathErrorCode.asyncValue
        });
    });
    it('must fail for generators', () => {
        const obj = {
            value: function* () {
                return {one: 123};
            }
        };
        expect(resolve(obj, ['value', 'one'])).to.eql({
            chain: ['value', 'one'],
            scope: obj,
            options: undefined,
            idx: -1,
            errorCode: PathErrorCode.genValue
        });
    });
});

describe('nested functions', () => {
    it('must resolve recursively', () => {
        const obj = {
            scope: {
                value: 123
            },
            first() {
                return this.second;
            },
            second() {
                return this.third.bind(this.scope);
            },
            third() {
                return (this as any).value;
            }
        };
        expect(resolve(obj, 'first')).to.eql({
            chain: ['first'],
            scope: obj,
            options: undefined,
            idx: 0,
            exists: true,
            value: 123
        });
    });
});

describe('complex', () => {
    it('must resolve everything', () => {
        const obj = {
            value: 123,
            getThis() {
                return this;
            },
            getValue() {
                return this.value;
            }
        };
        expect(resolve.call(obj, null, 'this.getThis.getValue')).to.eql({
            chain: ['this', 'getThis', 'getValue'],
            scope: obj,
            options: undefined,
            idx: 2,
            exists: true,
            value: 123
        });
    });
});

describe('with options', () => {
    describe('when ignoreFunctions is set', () => {
        it('must use functions as values', () => {
            function tst() {

            }

            tst.value = 123;
            const target = {tst};
            expect(resolve(target, 'tst.value', {ignoreFunctions: true})).to.eql({
                chain: ['tst', 'value'],
                scope: target,
                options: {ignoreFunctions: true},
                idx: 1,
                exists: true,
                value: 123
            });
        });
    });

    describe('when ownProperties is set', () => {
        const tst = {value: 123};
        Object.setPrototypeOf(tst, {inherited: 321});
        const target = {tst};

        it('must not resolve inherited properties', () => {
            expect(resolve(target, 'tst.inherited', {ownProperties: true})).to.eql({
                chain: ['tst', 'inherited'],
                scope: target,
                options: {ownProperties: true},
                idx: 1,
                exists: false,
                value: undefined
            });
        });

        it('must resolve for own properties', () => {
            expect(resolve(target, 'tst.value', {ownProperties: true})).to.eql({
                chain: ['tst', 'value'],
                scope: target,
                options: {ownProperties: true},
                idx: 1,
                exists: true,
                value: 123
            });
        });
    });
});

describe('for array indexes', () => {
    it('must support zeros', () => {
        const t1 = [123];
        expect(resolve(t1, [0])).to.eql({
            chain: [0],
            scope: t1,
            options: undefined,
            idx: 0,
            exists: true,
            value: 123
        });
        const input: PathInput = [1, 1, 0];
        const t2 = [1, [2, [3]]];
        expect(resolve(t2, input)).to.eql({
            chain: [1, 1, 0],
            scope: t2,
            options: undefined,
            idx: 2,
            exists: true,
            value: 3
        });
    });
	  it('must support negative indexes', () => {
				const t1 = ['a', 'b', 'c', 'd'];
				expect(resolve(t1, [-2])).to.eql({
						chain: [-2],
						scope: t1,
						options: undefined,
						idx: 0,
						exists: true,
						value: 'c',
				}); 
				const t2 = ['a', ['b', ['c', 'd']]];
				expect(resolve(t2, [-1, -1, -2])).to.eql({
						chain: [-1, -1, -2],
						scope: t2,
						options: undefined,
						idx: 2,
						exists: true,
						value: 'c',
				});
		});
});

describe('tokenizePath', () => {
    it('must handle an empty string', () => {
        expect(tokenizePath('')).to.eql([]);
    });
    it('must handle short syntax', () => {
        expect(tokenizePath('a')).to.eql(['a']); // one small letter
        expect(tokenizePath('Z')).to.eql(['Z']); // one capital letter
        expect(tokenizePath('_')).to.eql(['_']); // underscore
        expect(tokenizePath('$')).to.eql(['$']); // dollar
        expect(tokenizePath('0')).to.eql(['0']); // zero
        expect(tokenizePath('-1')).to.eql(['-1']); // negative one 
    });
    it('must handle a simple path', () => {
        expect(tokenizePath('a.b.c')).to.eql(['a', 'b', 'c']);
        expect(tokenizePath('abc.1._.$')).to.eql(['abc', '1', '_', '$']);
    });
    it('must handle simple indexes', () => {
        expect(tokenizePath('[0]')).to.eql(['0']);
        expect(tokenizePath('[-1]')).to.eql(['-1']);
        expect(tokenizePath('[0][1][2]')).to.eql(['0', '1', '2']);
        expect(tokenizePath('["a"]')).to.eql(['a']);
        expect(tokenizePath('["abc"]')).to.eql(['abc']);
        expect(tokenizePath('[\'a\']')).to.eql(['a']);
        expect(tokenizePath('[\'abc\']')).to.eql(['abc']);
    });
    it('must handle complex indexes', () => {
        expect(tokenizePath('["a.b"]')).to.eql(['a.b']);
        expect(tokenizePath('1["a.b"].2')).to.eql(['1', 'a.b', '2']);
        expect(tokenizePath('["one two"].last')).to.eql(['one two', 'last']);
        expect(tokenizePath(`['1.two.$_'].last`)).to.eql(['1.two.$_', 'last']);
    });
    it('must skip extra spaces correctly', () => {
        expect(tokenizePath('[ "a.b" ]')).to.eql(['a.b']);
        expect(tokenizePath('[ " a . b " ]')).to.eql([' a . b ']);
        expect(tokenizePath('[ 0 ]')).to.eql(['0']);
        expect(tokenizePath('[ 123 ]')).to.eql(['123']);
    });
    it('must handle index with quotes', () => {
        expect(tokenizePath(`["a'b"]`)).to.eql([`a'b`]);
        expect(tokenizePath(`['a"b']`)).to.eql([`a"b`]);
    });
    it('must handle any complex scenario', () => {
        expect(tokenizePath(`$[ "a'b" ].6[ 0 ]`)).to.eql(['$', `a'b`, '6', '0']);
    });
});
