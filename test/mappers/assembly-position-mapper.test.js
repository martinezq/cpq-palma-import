import { expect } from 'chai';
import { _test } from '../../src/mappers/assembly-position-mapper.js';
import {
    extractPositions,
} from '../../src/mappers/assembly-position-mapper.js';

const { extractPositionMinQty, extractPositionMaxQty } = _test;

describe('extractPositionMinQty', () => {
    it('should return 0 for optional nodes', () => {
        const node = { cases: [], quantity: 5, optional: true };
        expect(extractPositionMinQty(node)).to.equal(0);
    });

    it('should return 0 for variable nodes', () => {
        const node = { cases: [], quantity: 5, variable: true, qtyPropertyUid: 'id123' };
        expect(extractPositionMinQty(node)).to.equal(0);
    });

    it('should return the minimum quantity from cases', () => {
        const node = { cases: [{ quantity: 10 }, { quantity: 5 }, { quantity: 20 }], quantity: 5 };
        expect(extractPositionMinQty(node)).to.equal(5);
    });

    it('should return the node quantity if no cases are present', () => {
        const node = { cases: [], quantity: 7 };
        expect(extractPositionMinQty(node)).to.equal(7);
    });
});

describe('extractPositionMaxQty', () => {
    it('should return 999999 for variable nodes', () => {
        const node = { cases: [], quantity: 5, variable: true, qtyPropertyUid: 'id123' };
        expect(extractPositionMaxQty(node)).to.equal(999999);
    });

    it('should return the maximum quantity from cases', () => {
        const node = { cases: [{ quantity: 10 }, { quantity: 5 }, { quantity: 20 }], quantity: 5 };
        expect(extractPositionMaxQty(node)).to.equal(20);
    });

    it('should return the node quantity if no cases are present', () => {
        const node = { cases: [], quantity: 8 };
        expect(extractPositionMaxQty(node)).to.equal(8);
    });
});

describe('extractPositions', () => {
    const mockInputIndexed = {
        rawInput: {
            configurationIntent: {
                modules: [
                    { uid: 'module1', code: 'MOD001', name: 'Main Module' },
                    { uid: 'module2', code: 'MOD002', name: 'Secondary Module' }
                ]
            }
        }
    };

    it('should correctly extract positions from nodes', () => {
        const node = {
            uid: 'node1',
            nodes: [
                {
                    uid: 'node11',
                    type: 'ModuleInstanceNode',
                    name: 'Position 1',
                    realization: 'module1',
                    cases: [{ quantity: 10 }, { quantity: 20 }],
                    quantity: 15
                },
                {
                    uid: 'node12',
                    code: 'Node 12a',
                    type: 'LibraryInstanceNode',
                    name: 'Position 2',
                    cases: [{ quantity: 5 }],
                    quantity: 8
                }
            ]
        };

        const result = extractPositions(node, mockInputIndexed);

        expect(result).to.deep.equal([
            {
                name: 'node11_position_1_position',
                description: 'Position 1',
                module: { name: 'palma_mod001_main_module_module' },
                assembly: undefined,
                qtyMin: 10,
                qtyMax: 20
            },
            {
                name: 'node12a_position_2_position',
                description: 'Position 2',
                module: undefined,
                assembly: { name: 'palma_node12a_position_2_assembly' },
                qtyMin: 5,
                qtyMax: 5
            }
        ]);
    });

    it('should return an empty array if there are no position nodes', () => {
        const node = {
            nodes: [
                {
                    type: 'NonPositionNode',
                    name: 'Not a Position'
                }
            ]
        };

        const result = extractPositions(node, mockInputIndexed);

        expect(result).to.deep.equal([]);
    });

    it('should handle a mix of assembly and module position nodes', () => {
        const node = {
            nodes: [
                {
                    uid: 'node11',
                    type: 'ModuleInstanceNode',
                    name: 'Module Position',
                    realization: 'module2',
                    cases: [{ quantity: 2 }],
                    quantity: 3
                },
                {
                    uid: 'node12',
                    type: 'LibraryInstanceNode',
                    name: 'Assembly Position',
                    cases: [{ quantity: 4 }],
                    quantity: 6
                }
            ]
        };

        const result = extractPositions(node, mockInputIndexed);

        expect(result).to.deep.equal([
            {
                name: 'node11_module_position_position',
                description: 'Module Position',
                module: { name: 'palma_mod002_secondary_module_module' },
                assembly: undefined,
                qtyMin: 2,
                qtyMax: 2
            },
            {
                name: 'node12_assembly_position_position',
                description: 'Assembly Position',
                module: undefined,
                assembly: { name: 'palma_node12_assembly_position_assembly' },
                qtyMin: 4,
                qtyMax: 4
            }
        ]);
    });

    it('should handle nodes with missing or empty cases', () => {
        const node = {
            nodes: [
                {
                    uid: 'node11',
                    type: 'ModuleInstanceNode',
                    name: 'Module Position',
                    realization: 'module1',
                    quantity: 7
                },
                {
                    uid: 'node12',
                    type: 'LibraryInstanceNode',
                    name: 'Assembly Position',
                    quantity: 9
                }
            ]
        };

        const result = extractPositions(node, mockInputIndexed);

        expect(result).to.deep.equal([
            {
                name: 'node11_module_position_position',
                description: 'Module Position',
                module: { name: 'palma_mod001_main_module_module' },
                assembly: undefined,
                qtyMin: 7,
                qtyMax: 7
            },
            {
                name: 'node12_assembly_position_position',
                description: 'Assembly Position',
                module: undefined,
                assembly: { name: 'palma_node12_assembly_position_assembly' },
                qtyMin: 9,
                qtyMax: 9
            }
        ]);
    });
});
