import { expect } from 'chai';
import { _test } from '../../src/mappers/assembly-attribute-mapper.js';

const {
    categorizeAttributes,
    isAggregatedAttribute,
    extractSystemAttributes,
    extractAttributesAggregatingModuleFeatures,
    extractAttributesUsedInCases,
    extractAttributesControllingVariablePositions,
    generateTechnicalAttributes,
    generateAttributesAggregatingUpInAssemblyTree,
    groupAttributes
} = _test;

describe('extractSystemAttributes', () => {

    let inputIndexed;

    beforeEach(() => {
        // Set up the initial mock data for inputIndexed
        inputIndexed = {
            rawInput: {
                configurationIntent: {
                    systemProperties: [
                        { name: 'systemAttr1' },
                        { name: 'systemAttr2' }
                    ],
                    properties: [
                        { name: 'propertyAttr1' },
                        { name: 'propertyAttr2' }
                    ]
                }
            }
        };
    });

    it('should return system attributes for Root node type', () => {
        const node = { type: 'Root' };

        const result = extractSystemAttributes(node, inputIndexed);

        console.log(JSON.stringify(result, null, 2));

        const expectedAttributes = [
            {
                "name": "systemattr1_attribute",
                "description": "systemAttr1",
                "domain": {
                    "name": "palma_systemattr1_domain"
                },
                "io": true,
                "category": {
                    "name": "palma_remaining_attributes_category"
                }
            },
            {
                "name": "systemattr2_attribute",
                "description": "systemAttr2",
                "domain": {
                    "name": "palma_systemattr2_domain"
                },
                "io": true,
                "category": {
                    "name": "palma_remaining_attributes_category"
                }
            },
            {
                "name": "propertyattr1_attribute",
                "description": "propertyAttr1",
                "domain": {
                    "name": "palma_propertyattr1_domain"
                },
                "io": true,
                "category": {
                    "name": "palma_remaining_attributes_category"
                }
            },
            {
                "name": "propertyattr2_attribute",
                "description": "propertyAttr2",
                "domain": {
                    "name": "palma_propertyattr2_domain"
                },
                "io": true,
                "category": {
                    "name": "palma_remaining_attributes_category"
                }
            }
        ];

        expect(result).to.deep.equal(expectedAttributes);
    });

    it('should return an empty array for non-Root node type', () => {
        const node = { type: 'NonRoot' };

        const result = extractSystemAttributes(node, inputIndexed);

        expect(result).to.deep.equal([]);
    });

    it('should handle empty systemProperties and properties lists', () => {
        inputIndexed.rawInput.configurationIntent.systemProperties = [];
        inputIndexed.rawInput.configurationIntent.properties = [];

        const node = { type: 'Root' };

        const result = extractSystemAttributes(node, inputIndexed);

        expect(result).to.deep.equal([]);
    });

    // Additional tests can be added here to cover more edge cases or specific scenarios

});

describe('extractAttributesAggregatingModuleFeatures', () => {
    
    let inputIndexed;
    let node;

    beforeEach(() => {
        // Set up the initial mock data for inputIndexed and node
        inputIndexed = {
            rawInput: {
                configurationIntent: {
                    properties: [
                        { uid: 'prop1', name: 'property1', unifier: true },
                        { uid: 'prop2', name: 'property2', unifier: false }
                    ]
                }
            }
        };

        node = {
            nodes: [
                { type: 'ModulePositionNode', realization: 'module1' },
                { type: 'ModulePositionNode', realization: 'module2' }
            ]
        };
    });

    it('should return attributes aggregating module features correctly', () => {
        // Mock lookupModuleByUid to return dummy modules with properties
        const lookupModuleByUid = (uid, inputIndexed) => ({
            propertyRelations: [
                { propertyUid: 'prop1' },
                { propertyUid: 'prop2' }
            ]
        });

        // Mock hasProperty to simulate property existence
        const hasProperty = (module, uid) => module.propertyRelations.some(pr => pr.propertyUid === uid);

        // Mock other dependencies
        const positionNameFromNode = (node) => `position_${node.realization}`;
        const featureName = (name) => `feature_${name}`;
        const attributeName = (name) => `attr_${name}`;
        const technical_attribute_category_name = 'Technical';

        const result = extractAttributesAggregatingModuleFeatures(node, inputIndexed);

        const expectedAttributes = [
            {
                name: 'attr_property1',
                description: 'property1',
                domain: { name: 'property1' },
                io: true,
                aggregationStrategy: 'Equal',
                aggregateList: [
                    { position: { name: 'position_module1' }, feature: { name: 'feature_property1' } },
                    { position: { name: 'position_module2' }, feature: { name: 'feature_property1' } }
                ],
                category: { name: technical_attribute_category_name }
            },
            {
                name: 'attr_property2',
                description: 'property2',
                domain: { name: 'property2' },
                io: false,
                aggregationStrategy: 'None',
                aggregateList: [],
                category: { name: technical_attribute_category_name }
            }
        ];

        expect(result).to.deep.equal(expectedAttributes);
    });

    it('should handle empty module position nodes', () => {
        node.nodes = [];

        const result = extractAttributesAggregatingModuleFeatures(node, inputIndexed);

        expect(result).to.deep.equal([]);
    });

    it('should handle missing properties in the inputIndexed', () => {
        inputIndexed.rawInput.configurationIntent.properties = [];

        const result = extractAttributesAggregatingModuleFeatures(node, inputIndexed);

        expect(result).to.deep.equal([]);
    });

    // Add any additional tests as needed
});