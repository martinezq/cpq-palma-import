import * as R from 'ramda';

import * as utils from '../utils.js';

import {
    none_domain_element_name,
    reference_global_feature_name,
    prune_attribute_name,
    technical_attribute_category_name,
    domainName,
    domainElementName,
    moduleNameFromModule,
    featureName,
    assemblyNameFromNode,
    positionNameFromNode,
    assemblyToPositionName,
    attributeName,
    attributeCategoryName,
    assemblyVirtualVariantName,
    isNodeOptional,
    isNodeVariable,
    isNodeFixedQty,
    hasNodeQtyCases,
    isAssemblyNode,
    isAssemblyPositionNode,
    isModulePositionNode,
    isPositionNode,
    lookupPropertyByUid,
    lookupModuleByUid,
    hasProperty
} from './mapper-commons.js';

import { extractAssembly } from './assembly-mapper.js';

export function extractAttributes(node, inputIndexed) {

    function categorizeAttributes(attributes, inputIndexed) {
        attributes = R.clone(attributes);
        
        const tabs = utils.extractNodes(inputIndexed.rawInput.configurationIntent.configuratorUserInterface, n => n.type === 'ConfiguratorTab')

        tabs.forEach(tab => {
            const category = { name: attributeCategoryName(tab.name) };
            const fields = utils.extractNodes(tab.nodes || [], n => n.type === 'ConfiguratorField' && n.content?.type === 'Property');

            const fieldAttributeNames = fields.map(field => {
                const property = lookupPropertyByUid(field.content.propertyUid, inputIndexed);
                return attributeName(property.name);
            })

            fieldAttributeNames.forEach(name => {
                let assemblyAttribute = attributes.find(a => a.name === name);
                assemblyAttribute.category = category;
            });

        });

        return attributes;
    }

    function isAggregatedAttribute(attribute) {
        return attribute.io && attribute.name !== prune_attribute_name;
    }

    function extractSystemAttributes(node) {
        const allProperties = inputIndexed.rawInput.configurationIntent.systemProperties.concat(inputIndexed.rawInput.configurationIntent.properties);

        const systemAttributes = node.type === 'Root' ? allProperties.map(property => ({
            name: attributeName(property.name),
            description: property.name,
            domain: { name: domainName(property.name) },
            io: true,
            category: { name: technical_attribute_category_name }
        })) : [];

        return systemAttributes;
    }

    function extractAttributesAggregatingModuleFeatures(node) {
        
        function mapModulePositionProperty(property, modulePositionNodes) {
            const aggregatedModulePositionNodes = 
                modulePositionNodes
                .filter(modulePositionNode => 
                        hasProperty(lookupModuleByUid(modulePositionNode.realization, inputIndexed), property.uid));

            return {
                name: attributeName(property.name),
                description: property.name,
                domain: { name: domainName(property.name) },
                io: property.unifier,
                aggregationStrategy: property.unifier ? 'Equal' : 'None',
                aggregateList: property.unifier ? aggregatedModulePositionNodes.map(modulePositionNode => ({
                    position: { name: positionNameFromNode(modulePositionNode) },
                    feature: { name: featureName(property.name) }
                })) : [],
                category: { name: technical_attribute_category_name }
            };
        }            

        const modulePositionNodes = node.nodes?.filter(isModulePositionNode) || [];
        const modules = modulePositionNodes.map(node => lookupModuleByUid(node.realization, inputIndexed));
        const modulesPropertiesUniq = R.uniqBy(pr => pr.uid, R.flatten(modules.map(m => m.propertyRelations?.map(pr => lookupPropertyByUid(pr.propertyUid, inputIndexed)) || [])));

        return modulesPropertiesUniq.map(pr => mapModulePositionProperty(pr, modulePositionNodes));
    }

    function extractAttributesUsedInCases(node) {

        function mapCase(caze) {
            return caze.propertyRelations?.map(mapCasePropertyRelation);
        }

        function mapCasePropertyRelation(casePropertyRelation) {
            const property = lookupPropertyByUid(casePropertyRelation.propertyUid, inputIndexed);

            return {
                name: attributeName(property.name),
                description: property.name,
                domain: { name: domainName(property.name) },
                io: true,
                category: { name: technical_attribute_category_name }
            };
        }

        const childrenNodesWithCases = node?.nodes?.filter(childNode => childNode?.cases?.length > 0);
        const caseAttributesNested = childrenNodesWithCases.map(childNode => childNode.cases.map(mapCase));
        const caseAttributes = R.flatten(caseAttributesNested);

        return caseAttributes;
    }

    function extractAttributesControllingVariablePositions(node) {
        const childrenVariableNodes = node?.nodes?.filter(isNodeVariable) || [];
        
        const variableAttributes = childrenVariableNodes.map(sn => ({
            name: attributeName(lookupPropertyByUid(sn.qtyPropertyUid, inputIndexed).name),
            description: lookupPropertyByUid(sn.qtyPropertyUid, inputIndexed).name,
            domain: { name: domainName(lookupPropertyByUid(sn.qtyPropertyUid, inputIndexed).name) },
            io: true,
            category: { name: technical_attribute_category_name }
        }));

        return variableAttributes;
    }

    function generateTechnicalAttributes() {
        const technicalAttributes = [{
            name: prune_attribute_name,
            domain: { name: 'Boolean' },
            io: true,
            category: { name: technical_attribute_category_name }
        }];

        return technicalAttributes;
    }

    function generateAttributesAggregatingUpInAssemblyTree(node) {

        function mapChildAssemblyAttributes(assembly) {
            // example input: { name: 'palma_assy1_assembly', attributes: [ { name: 'attr1', io: false }, { name: 'attr2', io: true }, { name: 'attr3', io: true } ] }
            // example output: [ { name: 'attr2', io: true }, { name: 'attr3', io: true } ]
            const aggregatedAttributes = assembly.attributes.filter(isAggregatedAttribute);

            // example output: [ 
            //  { name: 'attr2', io: true, aggregateList: [ { position: { name: 'assy1_position' }, attribute: { name: 'attr2'} } ] },
            //  { name: 'attr3', io: true, aggregateList: [ { position: { name: 'assy1_position' }, attribute: { name: 'attr3'} } ] } 
            // ]
            const mappedAttributes = aggregatedAttributes.map(attribute => ({
                ...attribute,
                aggregationStrategy: 'Equal',
                aggregateList: [{
                    position: { name: assemblyToPositionName(assembly.name) },
                    attribute: { name: attribute.name }
                }],
                category: { name: technical_attribute_category_name }
            }));

            return mappedAttributes;
        }

        const childrenAssemblyNodes = node.nodes?.filter(isAssemblyPositionNode) || [];
        
        // example output: [ 
        //  { name: 'palma_assy1_assembly', attributes: [ { name: 'attr1', io: false }, { name: 'attr2', io: true }, { name: 'attr3', io: true } ] },
        //  { name: 'palma_assy2_assembly', attributes: [ { name: 'attr3', io: true } ] } 
        // ]
        const childrenAssembliesAfterMapping = childrenAssemblyNodes.map(n => extractAssembly(n, inputIndexed));

        // example output: [ 
        //  [ 
        //      { name: 'attr2', io: true, aggregateList: [ { position: { name: 'assy1_position' }, attribute: { name: 'attr2'} } ] },
        //      { name: 'attr3', io: true, aggregateList: [ { position: { name: 'assy1_position' }, attribute: { name: 'attr3'} } ] } 
        //  ],
        //  [
        //      { name: 'attr3', io: true, aggregateList: [ { position: { name: 'assy2_position' }, attribute: { name: 'attr3'} } ] } 
        //  ]            
        // ]
        const childrenAssemblyAttributesWithDuplicatesNested = childrenAssembliesAfterMapping.map(mapChildAssemblyAttributes);

        // example output: [ 
        //  [ 
        //    { name: 'attr2', io: true, aggregateList: [ { position: { name: 'assy1_position' }, attribute: { name: 'attr2'} } ] },
        //    { name: 'attr3', io: true, aggregateList: [ { position: { name: 'assy1_position' }, attribute: { name: 'attr3'} } ] },
        //    { name: 'attr3', io: true, aggregateList: [ { position: { name: 'assy2_position' }, attribute: { name: 'attr3'} } ] } 
        // ]
        const assemblyAttributesWithDuplicates = R.flatten(childrenAssemblyAttributesWithDuplicatesNested);

        // ok for now, will be grouped in the following steps
        return assemblyAttributesWithDuplicates;
    }
    
     function groupAttributes(allAttributesWithDuplicates) {

        // example input: 
        //  const al1 = { position: { name: 'pos1' }, feature: { name: 'feat1' }} 
        //  const al2 = { position: { name: 'pos2' }, feature: { name: 'feat2' }}
        //  const al3 = { position: { name: 'pos3' }, feature: { name: 'feat3' }}
        //  allAttributesWithDuplicates = [ { name: 'attr1', aggregateList: [ al1 ] }, { name: 'attr2', aggregateList: [ al2 ] }, { name: 'attr1', aggregateList: [ al3 ] } ] 
        // example output: { attr1: [ { name: 'attr1', aggregateList: [ al1 ] }, { name: 'attr1', aggregateList: [ al3 ] } ], attr2: [ { name: 'attr2' }, aggregateList: [ al2 ] ] }
        const attributesMapGroupedByName = R.groupBy(attribute => attribute.name, allAttributesWithDuplicates);

        // example output: [ [ { name: 'attr1', aggregateList: [ al1 ] }, { name: 'attr1', aggregateList: [ al3 ] } ], [ { name: 'attr2', aggregateList: [ al2 ] } ]]
        const attributesGroupedByName = R.values(attributesMapGroupedByName);

        // example output: [ { name: 'attr1', aggregateList: [ al1, al3 ] }, {name: 'attr2', aggregateList: [ al2 ] }]
        const attributesMerged = attributesGroupedByName.map(attributeGroup => {
            const aggregateList = R.uniqBy(x => x, R.flatten(attributeGroup.map(x => x.aggregateList || [])));
            
            return {
                ...attributeGroup[0],
                aggregationStrategy: aggregateList.length > 0 ? 'Equal' : 'None',
                aggregateList
            }
        });

        const attributesSorted = R.sortBy(at => at.name, attributesMerged);

        return attributesSorted;
    }

    const attributesAggregatingModuleFeatures = extractAttributesAggregatingModuleFeatures(node);
    const systemAttributes = extractSystemAttributes(node);
    const attributesUsedInCases = extractAttributesUsedInCases(node);
    const attributesControllingVariablePositions = extractAttributesControllingVariablePositions(node);
    const technicalAttributes = generateTechnicalAttributes();
    const attributesAggregatingUpInAssemblyTree = generateAttributesAggregatingUpInAssemblyTree(node);

    const allAttributesWithDuplicates = 
        systemAttributes
        .concat(attributesAggregatingModuleFeatures)
        .concat(attributesUsedInCases)
        .concat(attributesControllingVariablePositions)
        .concat(technicalAttributes)
        .concat(attributesAggregatingUpInAssemblyTree);


    const attributesNonCategorized = groupAttributes(allAttributesWithDuplicates);

    const attributes = node.type === 'Root' ? categorizeAttributes(attributesNonCategorized, inputIndexed) : attributesNonCategorized;

    return attributes;

}