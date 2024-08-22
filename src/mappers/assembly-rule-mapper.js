import * as R from 'ramda';

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

export function extractRules(node, inputIndexed) {

    function buildConstraintFromCases(node) {
        return node.cases?.map(c => buildConstraintFromCase(node, c));
    }

    function buildConstraintFromCase(node, c) {
        const module = lookupModuleByUid(node.realization, inputIndexed);

        const conditions = 
            c.propertyRelations
            ?.filter(pr => pr.valueRelations?.length > 0)
            ?.map(pr => {
                const property = lookupPropertyByUid(pr.propertyUid, inputIndexed);
            
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
        const qtyProperty = lookupPropertyByUid(node.qtyPropertyUid, inputIndexed);
        
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
            [attributeName(lookupPropertyByUid(p.uid, inputIndexed).name)]
            .concat(p.propertyRelations?.map(pr => attributeName(lookupPropertyByUid(pr.propertyUid, inputIndexed).name)) || []);
        
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

    const rulesFromSystemProperties = node.type === 'Root' ? buildCombinationTablesFromSystemProperties(inputIndexed.rawInput.configurationIntent.systemProperties) : [];

    const rules = rulesFromSystemProperties
        .concat(rulesFromVariablePositions)
        .concat(rulesFromCases)
        .concat(rulesForNoneVariants)
        .concat(rulesForOptionality);

    return rules;

}