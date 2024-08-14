const R = require('ramda');

// ----------------------------------------------------------------------------

const prefix = 'palma_';

const constants = {
  references_domain_name: prefix + 'reference_domain',
  references_domain_description: 'Reference',

  none_domain_element_name: 'none',

  none_variant_name: 'none',
  none_variant_description: 'None',

  reference_global_feature_name: 'reference_feature',
  reference_global_feature_description: 'Reference',

  prune_attribute_name: '_prune_attribute',

  technical_attribute_category_name: 'palma_remaining_attributes_category',
  technical_attribute_category_description: 'Remaining attributes'
};

// ----------------------------------------------------------------------------

function standardizeName(name) {
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

function standardizeCodeFromNode(node) {
    let codePart = '';

    if (node.type !== 'Root') {
        codePart = standardizeName((node.code && node.code !== 'n/a') ? node.code : R.take(6, node.uid)).replace(/\_/g, '') + '_';
    }

    return codePart;
}

function domainName(name) {
    return prefix + standardizeName(name) + '_domain';
}

function domainElementName(name) {
    if (name === 'Yes' || name === 'No') {
        return name;
    }
    return standardizeName(name);
}

function referenceValue(v) {
    return v.trim();
}

function domainType({ type, integer, values}) {
    switch(type) {
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

function moduleNameFromModule(module) {
    const codePart = module.code !== 'n/a' ? standardizeName(module.code) + '_' : '';
    return prefix + codePart + standardizeName(module.name) + '_module';
}

function moduleName(name) {
    return prefix + standardizeName(name) + '_module';
}

function featureName(name) {
    return standardizeName(name) + '_feature';
}

function variantName(name) {
    return standardizeName(name) + '_variant';
}

function variantNameFromVariant(variant) {
    const codePart = variant.code !== 'n/a' ? standardizeName(variant.code) + '_' : '';
    return codePart + standardizeName(variant.name) + '_variant';
}

function assemblyName(name) {
    return prefix + standardizeName(name) + '_assembly';
}

function assemblyNameFromNode(node) {
    const codePart = standardizeCodeFromNode(node);

    return prefix + codePart + standardizeName(node.name) + '_assembly';
}

function assemblyVirtualVariantName(name) {
    return standardizeName(name) + '_variant';
}

function positionName(name) {
    return standardizeName(name) + '_position';
}

function positionNameFromNode(node) {
    const codePart = standardizeCodeFromNode(node);
    return codePart + standardizeName(node.name) + '_position';
}

function attributeName(name) {
    return standardizeName(name) + '_attribute';
}

function assemblyToPositionName(name) {
    return name.replace(/_assembly$/, '_position').replace(prefix, '');
}

function featureToAttributeName(name) {
    return name.replace(/_feature$/, '_attribute');
}

function attributeCategoryName(name) {
    return prefix + standardizeName(name) + '_category';
}

// ----------------------------------------------------------------------------

function isNodeOptional(node) {
    return node.optional || node._optionalInherited;
}

// ----------------------------------------------------------------------------

module.exports = {
    ...constants,
    standardizeName,
    domainName,
    domainElementName,
    referenceValue,
    domainType,
    moduleName,
    moduleNameFromModule,
    featureName,
    variantName,
    variantNameFromVariant,
    assemblyName,
    assemblyNameFromNode,
    assemblyVirtualVariantName,
    positionName,
    positionNameFromNode,
    attributeName,
    assemblyToPositionName,
    featureToAttributeName,
    attributeCategoryName,
    isNodeOptional
};