import * as R from 'ramda';

import * as utils from '../utils.js';

import {
    none_domain_element_name,
    reference_global_feature_name,
    prune_attribute_name,
    technical_attribute_category_name,
    domainName,
    domainElementName,
    referenceValue,
    domainType,
    moduleName,
    moduleNameFromModule,
    featureName,
    variantName,
    assemblyName,
    assemblyNameFromNode,
    positionName,
    positionNameFromNode,
    assemblyToPositionName,
    attributeName,
    attributeCategoryName,
    assemblyVirtualVariantName,
    isNodeOptional
} from './mapper-commons.js';

// ----------------------------------------------------------------------------

export function extractAssemblies(input) {
    
    let propertyMap;

    // -----------------------------------------------------------------------

    function lookupPropertyByUid(propertyUid) {
        if (propertyMap === undefined) {
            propertyMap = {};
            const allProps = input.configurationIntent.properties.concat(input.configurationIntent.systemProperties);
            allProps.forEach(p => propertyMap[p.uid] = p);
        }
        
        return propertyMap[propertyUid];
    }

    function lookupModuleByUid(moduleUid) {
        return input.configurationIntent.modules.find(m => m.uid === moduleUid);
    }

    // -----------------------------------------------------------------------

    function mapNode(node) {
        // console.log(node.name);

        return {
            name: assemblyNameFromNode(node),
            description: node.name,
            attributes: extractAttributes(node),
            positions: extractPositions(node),
            rules: extractRules(node),
            variantEnabled: true,
            virtualVariant: {
                name: assemblyVirtualVariantName(node.name),
                description: node.name,
                values: [{
                    feature: { name: 'isNonStandard' },
                    value: 'No'
                },
                {
                    feature: { name: reference_global_feature_name },
                    value: none_domain_element_name
                }]
            }
        };
    }

    // -----------------------------------------------------------------------

    function extractPositions(node) {
        
        function extractPositionMinQty(positionNode) {
            if (isNodeOptional(positionNode) || isNodeVariable(positionNode)) return 0;

            const casesMinQty = positionNode.cases?.map(c => c.quantity).reduce(R.min, 999999);
            if (casesMinQty !== undefined) return casesMinQty;

            return positionNode.quantity;
        }

        function extractPositionMaxQty(positionNode) {
            if (isNodeVariable(positionNode)) return 999999;

            const casesMaxQty = positionNode.cases?.map(c => c.quantity).reduce(R.max, 0);
            if (casesMaxQty !== undefined) return casesMaxQty;

            return positionNode.quantity;
        }
        
        const positionNodes = node.nodes?.filter(isPositionNode) || [];

        return positionNodes.map(pn => ({
            name: positionNameFromNode(pn),
            description: pn.name,
            module: isModulePositionNode(pn) ? { name: moduleNameFromModule(lookupModuleByUid(pn.realization))} : undefined,
            assembly: isAssemblyPositionNode(pn) ? { name: assemblyNameFromNode(pn)} : undefined,
            qtyMin: extractPositionMinQty(pn),
            qtyMax: extractPositionMaxQty(pn)
        }));
    }

    // -----------------------------------------------------------------------
    
    function extractAttributes(node) {

        function categorizeAttributes(attributes, input) {
            attributes = R.clone(attributes);
            
            const tabs = utils.extractNodes(input.configurationIntent.configuratorUserInterface, n => n.type === 'ConfiguratorTab')

            tabs.forEach(tab => {
                const category = { name: attributeCategoryName(tab.name) };
                const fields = utils.extractNodes(tab.nodes || [], n => n.type === 'ConfiguratorField' && n.content?.type === 'Property');

                const fieldAttributeNames = fields.map(field => {
                    const property = lookupPropertyByUid(field.content.propertyUid);
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
            const allProperties = input.configurationIntent.systemProperties.concat(input.configurationIntent.properties);

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
                            hasProperty(lookupModuleByUid(modulePositionNode.realization), property.uid));
    
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
            const modules = modulePositionNodes.map(node => lookupModuleByUid(node.realization));
            const modulesPropertiesUniq = R.uniqBy(pr => pr.uid, R.flatten(modules.map(m => m.propertyRelations?.map(pr => lookupPropertyByUid(pr.propertyUid)) || [])));
    
            return modulesPropertiesUniq.map(pr => mapModulePositionProperty(pr, modulePositionNodes));
        }

        function extractAttributesUsedInCases(node) {

            function mapCase(caze) {
                return caze.propertyRelations?.map(mapCasePropertyRelation);
            }

            function mapCasePropertyRelation(casePropertyRelation) {
                const property = lookupPropertyByUid(casePropertyRelation.propertyUid);

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
                name: attributeName(lookupPropertyByUid(sn.qtyPropertyUid).name),
                description: lookupPropertyByUid(sn.qtyPropertyUid).name,
                domain: { name: domainName(lookupPropertyByUid(sn.qtyPropertyUid).name) },
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
            const childrenAssembliesAfterMapping = childrenAssemblyNodes.map(mapNode);

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

        const attributes = node.type === 'Root' ? categorizeAttributes(attributesNonCategorized, input) : attributesNonCategorized;

        return attributes;

    }

    // -----------------------------------------------------------------------

    function extractRules(node) {

        function buildConstraintFromCases(node) {
            return node.cases?.map(c => buildConstraintFromCase(node, c));
        }
    
        function buildConstraintFromCase(node, c) {
            const module = lookupModuleByUid(node.realization);
    
            const conditions = 
                c.propertyRelations
                ?.filter(pr => pr.valueRelations?.length > 0)
                ?.map(pr => {
                    const property = lookupPropertyByUid(pr.propertyUid);
                
                    const isModuleFeature = hasProperty(module, pr.propertyUid)
                    let name;
                    
                    if (isModuleFeature) {
                        name = positionNameFromNode(node) + '.' + featureName(property.name);
                    } else {
                        name = attributeName(property.name);
                    }
    
                    const values = pr.valueRelations?.map(vr => domainElementName(vr.value));
    
                    return `${name} in {${values.join(',')}}`;
                    
                })?.join(' and ');
            
            return conditions ? `(${prune_attribute_name} in {No} and ${conditions})->${positionNameFromNode(node)}.qty=${c.quantity}` : undefined;
        }
    
        function buildConstraintForNoneVariant(node) {
            const name = positionNameFromNode(node);
            return `${name}.variant in {none}<->${name}.qty=0`;
        }
    
        function buildConstraintForVariableQty(node) {
            const qtyProperty = lookupPropertyByUid(node.qtyPropertyUid);
            
            if (node.variable && !qtyProperty) {
                throw `Can't find qty variable property: ${node.propertyUid}`;
            }
    
            return `${positionNameFromNode(node)}.qty=0 or ${positionNameFromNode(node)}.qty=${attributeName(qtyProperty.name)}.number`;
        }
    
        function buildConstraintsForOptionality(node) {
            const positionNodes = node.nodes.filter(isPositionNode);
    
            const positionConstraints = R.flatten(positionNodes.map(n => {
                const operator = (n.optional || n.variable) ? '->' : '<->';
                const isAssembly = isAssemblyPositionNode(n);
                
                return [
                    `${prune_attribute_name} in {Yes}${operator}${positionNameFromNode(n)}.qty=0`,
                    isNodeFixedQty(n) ? `${prune_attribute_name} in {No}<->${positionNameFromNode(n)}.qty=${n.quantity}` : undefined,
                    isAssembly ? `${positionNameFromNode(n)}.${prune_attribute_name} in {Yes}<->${positionNameFromNode(n)}.qty=0` : undefined
                ].filter(x => x !== undefined);
            }));
    
            if (!node._parentNode) {
                return positionConstraints.concat([`${prune_attribute_name} in {No}`]);
            }
    
            return positionConstraints;
        }
    
        function buildCombinationTablesFromSystemProperties(systemProperties) {
            return systemProperties.map(p => buildCombinationTableFromSystemProperties(p));
        }
    
        function buildCombinationTableFromSystemProperties(p) {
    
            const columns = 
                [attributeName(lookupPropertyByUid(p.uid).name)]
                .concat(p.propertyRelations?.map(pr => attributeName(lookupPropertyByUid(pr.propertyUid).name)) || []);
            
            const rows = p.values.map(v => {
                const values = 
                    (p.propertyRelations || [])
                    .map(pr => v.propertyRelations.find(vpr => vpr.propertyUid === pr.propertyUid))
                    .map(vpr => vpr?.valueRelations?.map(vr => vr.value ? domainElementName(vr.value) : 'unspecified').join(';') || 'unspecified');
                            
                return {
                    values: [domainElementName(v.value)].concat(values)
                }
            }); 
    
            return {
                type: "Combination",
                ruleGroup: 'Palma (combinations)',
                combination: {
                    columns,
                    rows
                }
            };
        }

        const rulesFromVariablePositions = node?.nodes?.filter(isNodeVariable)?.map(n => ({
            type: 'Constraint',
            ruleGroup: 'Palma (variable qty)',
            constraint: buildConstraintForVariableQty(n)
        }));

        const rulesForNoneVariants = node?.nodes?.filter(isModulePositionNode)?.filter(n => isNodeOptional(n, node))?.map(n => ({
            type: 'Constraint',
            ruleGroup: 'Palma (none variants)',
            constraint: buildConstraintForNoneVariant(n)
        }));

        const rulesForOptionality = buildConstraintsForOptionality(node).map(constraint => ({
            type: 'Constraint',
            ruleGroup: 'Palma (prune control)',
            constraint
        }));

        const caseSubNodes = node?.nodes?.filter(hasNodeQtyCases);

        const constraintsFromCases = R.flatten(caseSubNodes.filter(sn => !sn.variable).map(sn => buildConstraintFromCases(sn))).filter(c => c !== undefined);
        const rulesFromCases = constraintsFromCases.map(constraint => ({
            type: 'Constraint',
            ruleGroup: 'Palma (cases qty)',
            constraint
        }));

        const rulesFromSystemProperties = node.type === 'Root' ? buildCombinationTablesFromSystemProperties(input.configurationIntent.systemProperties) : [];

        const rules = rulesFromSystemProperties
            .concat(rulesFromVariablePositions)
            .concat(rulesFromCases)
            .concat(rulesForNoneVariants)
            .concat(rulesForOptionality);

        return rules;

    }

    // -----------------------------------------------------------------------

    function extractAssembliesRecursively(nodes, buf = []) {
        if (!nodes || nodes.length === 0) {
            return buf;
        }

        const newList = nodes.filter(isAssemblyNode).map(mapNode);

        newList.forEach(n => buf.push(n));

        R.flatten(nodes.map(node => extractAssembliesRecursively(node.nodes, buf)));

        return buf
    }

    // -----------------------------------------------------------------------

    return extractAssembliesRecursively(input.configurationIntent.productStructure);

}

// ----------------------------------------------------------------------------

export function optimizeAssemblies(assemblies) {
   
    assemblies = R.clone(assemblies);

    let assembliesByName = {};
    assemblies.forEach(a => assembliesByName[a.name] = a);

    function hasUpperAssemblies(assembly) {
        return findUpperAssemblies(assembly).length > 0;
    }

    function hasLowerAssemblies(assembly) {
        return Boolean(assembly.positions.find(p => p.assembly));
    }

    function findUpperAssemblies(assembly) {
        return assemblies.filter(a => a.positions.find(p => p.assembly?.name === assembly.name));
    }

    function findLowerAssemblies(assembly) {
        return assembly.positions.filter(p => p.assembly).map(p => assembliesByName[p.assembly.name]);
    }
    
    function optimizeAssembly(assembly) {
        
        function isAttributeUsedInConstraint(attribute, constraint) {
            return constraint.indexOf(attribute.name) > -1;
        }

        function isAttributeUsedInCombination(attribute, combination) {
            return Boolean(combination.columns.find(col => col === attribute.name));
        }


        function isAttributeNeeded(attribute) {
            const aggregatesSomething = attribute.aggregateList?.length > 1;
            const isAggregated = 
                findUpperAssemblies(assembly)
                .find(u => u.attributes.find(ua => ua.aggregateList.find(uaal => uaal.attribute?.name === attribute.name)))

            const constraintCandidates = assembly.rules?.filter(r => r.type === 'Constraint')?.map(r => r.constraint) || [];
            const usedInConstraints = constraintCandidates.filter(c => isAttributeUsedInConstraint(attribute, c));
            const isUsedInConstraints = usedInConstraints?.length > 0;

            const combinationCandidates = assembly.rules?.filter(r => r.type === 'Combination')?.map(r => r.combination) || [];
            const usedInCombinations = combinationCandidates.filter(c => isAttributeUsedInCombination(attribute, c));
            const isUsedInCombinations = usedInCombinations?.length > 0;

            const isUsedInUi = attribute.category.name !== technical_attribute_category_name;

            // if (isAggregated) {
            //     console.log(attribute.name, 'is aggregated');
            // }

            // if (isUsedInConstraints) {
            //     console.log(assembly.name, attribute.name, usedInConstraints);
            // }

            // if (isUsedInCombinations) {
            //     console.log(assembly.name, attribute.name, usedInCombinations);
            // }

            return aggregatesSomething || isAggregated || isUsedInConstraints || isUsedInCombinations || isUsedInUi;             
        }

        const attributes = assembly.attributes.filter(attribute => isAttributeNeeded(attribute))
        assembly.attributes = attributes;

        const lowerAssemblies = findLowerAssemblies(assembly);

        lowerAssemblies.forEach(optimizeAssembly);
    }

    const topAssemblies = assemblies.filter(a => !hasUpperAssemblies(a));

    topAssemblies.forEach(a => optimizeAssembly(a));

    const output = assemblies;

    return output;
}

// ----------------------------------------------------------------------------

function isPositionNode(node) {
    return isAssemblyPositionNode(node) || isModulePositionNode(node);
}

function isAssemblyNode(node) {
    return node.type === 'ModuleSetNode' || node.type === 'Root' || node.type === 'LibraryInstanceNode';
}

function isAssemblyPositionNode(node) {
    return node.type === 'ModuleSetNode' || node.type === 'LibraryInstanceNode';
}

function isModulePositionNode(node) {
    return node.type === 'ModuleInstanceNode';
}

function hasProperty(module, propertyUid) {
    return Boolean(module?.propertyRelations?.find(pr => pr.propertyUid === propertyUid));
}

function isNodeVariable(node) {
    return node.variable && Boolean(node.qtyPropertyUid)
}

function hasNodeQtyCases(node) {
    return node.cases?.length > 0;
}

function isNodeFixedQty(node) {
    return !isNodeVariable(node) && !hasNodeQtyCases(node) && !isNodeOptional(node);
}
