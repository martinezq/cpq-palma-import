import * as R from 'ramda';

// ----------------------------------------------------------------------------

const prefix = 'palma_';

export const references_domain_name = prefix + 'reference_domain';
export const references_domain_description = 'Reference';

export const none_domain_element_name = 'none';

export const none_variant_name = 'none';
export const none_variant_description = 'None';

export const reference_global_feature_name = 'reference_feature';
export const reference_global_feature_description = 'Reference';

export const prune_attribute_name = '_prune_attribute';

export const technical_attribute_category_name = 'palma_remaining_attributes_category';
export const technical_attribute_category_description = 'Remaining attributes';

// ----------------------------------------------------------------------------

export function standardizeName(name) {
    return (name || '-')
        .replace(/\+/g, 'plus')
        .replace(/\</g, 'lt')
        .replace(/\>/g, 'gt')
        .replace(/[^a-zA-Z0-9\.]+/g, '_')
        .replace(/\_+$/g, '')
        .replace(/^\_+/g, '')
        .replace(/^$/g, '_missing')
        .toLowerCase();
}

export function standardizeCodeFromNode(node) {
    let codePart = '';

    if (node.type !== 'Root') {
        codePart = standardizeName((node.code && node.code !== 'n/a') ? node.code : R.take(6, node.uid)).replace(/\_/g, '') + '_';
    }

    return codePart;
}

export function domainName(name) {
    return prefix + standardizeName(name) + '_domain';
}

export function domainElementName(name) {
    if (name === 'Yes' || name === 'No') {
        return name;
    }
    return standardizeName(name);
}

export function referenceValue(v) {
    return v.trim();
}

export function domainType({ type, integer, values }) {
    switch (type) {
        case 'LIST': return 'Enum';
        case 'DISCRETE': return 'Enum';
        case 'YESNO': return 'Boolean';
        case 'RANGE':
            if (integer) {
                return 'Integer';
            } else {
                return 'Float';
            }
        default: return 'String';
    }
}

export function moduleNameFromModule(module) {
    const codePart = module.code !== 'n/a' ? standardizeName(module.code) + '_' : '';
    return prefix + codePart + standardizeName(module.name) + '_module';
}

export function moduleName(name) {
    return prefix + standardizeName(name) + '_module';
}

export function featureName(name) {
    return standardizeName(name) + '_feature';
}

export function variantName(name) {
    return standardizeName(name) + '_variant';
}

export function variantNameFromVariant(variant) {
    const codePart = variant.code !== 'n/a' ? standardizeName(variant.code) + '_' : '';
    return codePart + standardizeName(variant.name) + '_variant';
}

export function assemblyName(name) {
    return prefix + standardizeName(name) + '_assembly';
}

export function assemblyNameFromNode(node) {
    const codePart = standardizeCodeFromNode(node);

    return prefix + codePart + standardizeName(node.name) + '_assembly';
}

export function assemblyVirtualVariantName(name) {
    return standardizeName(name) + '_variant';
}

export function positionName(name) {
    return standardizeName(name) + '_position';
}

export function positionNameFromNode(node) {
    const codePart = standardizeCodeFromNode(node);
    return codePart + standardizeName(node.name) + '_position';
}

export function attributeName(name) {
    return standardizeName(name) + '_attribute';
}

export function assemblyToPositionName(name) {
    return name.replace(/_assembly$/, '_position').replace(prefix, '');
}

export function featureToAttributeName(name) {
    return name.replace(/_feature$/, '_attribute');
}

export function attributeCategoryName(name) {
    return prefix + standardizeName(name) + '_category';
}

// ----------------------------------------------------------------------------

export function isNodeOptional(node) {
    return node.optional || node._optionalInherited;
}

export function isPositionNode(node) {
    return isAssemblyPositionNode(node) || isModulePositionNode(node);
}

export function isAssemblyNode(node) {
    return node.type === 'ModuleSetNode' || node.type === 'Root' || node.type === 'LibraryInstanceNode';
}

export function isAssemblyPositionNode(node) {
    return node.type === 'ModuleSetNode' || node.type === 'LibraryInstanceNode';
}

export function isModulePositionNode(node) {
    return node.type === 'ModuleInstanceNode';
}

export function hasProperty(module, propertyUid) {
    return Boolean(module?.propertyRelations?.find(pr => pr.propertyUid === propertyUid));
}

export function isNodeVariable(node) {
    return node.variable && Boolean(node.qtyPropertyUid)
}

export function hasNodeQtyCases(node) {
    return node.cases?.length > 0;
}

export function isNodeFixedQty(node) {
    return !isNodeVariable(node) && !hasNodeQtyCases(node) && !isNodeOptional(node);
}

// ----------------------------------------------------------------------------

export function lookupPropertyByUid(propertyUid, inputIndexed) {
    if (!inputIndexed) {
        throw 'input indexed required'
    }
    return inputIndexed.propertyMap[propertyUid];
}

export function lookupModuleByUid(moduleUid, inputIndexed) {
    if (!inputIndexed) {
        throw 'input indexed required'
    }
    return inputIndexed.rawInput.configurationIntent.modules.find(m => m.uid === moduleUid);
}