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

import { indexInput } from './input-indexer.js';
import { extractPositions } from './assembly-position-mapper.js';
import { extractAttributes } from './assembly-attribute-mapper.js';
import { extractRules } from './assembly-rule-mapper.js';

// ----------------------------------------------------------------------------

export function extractAssembly(node, inputIndexed) {
    // console.log(node.name);

    return {
        name: assemblyNameFromNode(node),
        description: node.name,
        attributes: extractAttributes(node, inputIndexed),
        positions: extractPositions(node, inputIndexed),
        rules: extractRules(node, inputIndexed),
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

// ----------------------------------------------------------------------------

export function extractAssemblies(input) {
   
    const inputIndexed = indexInput(input);

    function extractAssembliesRecursively(nodes, buf = []) {
        if (!nodes || nodes.length === 0) {
            return buf;
        }

        const newList = nodes.filter(isAssemblyNode).map(n => extractAssembly(n, inputIndexed));

        newList.forEach(n => buf.push(n));

        R.flatten(nodes.map(node => extractAssembliesRecursively(node.nodes, buf)));

        return buf
    }

    // -----------------------------------------------------------------------

    return extractAssembliesRecursively(input.configurationIntent.productStructure);

}

// ----------------------------------------------------------------------------


