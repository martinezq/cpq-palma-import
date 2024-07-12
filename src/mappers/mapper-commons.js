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

function moduleName(name) {
    return prefix + standardizeName(name) + '_module';
}

function featureName(name) {
    return standardizeName(name) + '_feature';
}

function variantName(name) {
    return standardizeName(name) + '_variant';
}

function assemblyName(name) {
    return prefix + standardizeName(name) + '_assembly';
}

function assemblyVirtualVariantName(name) {
    return standardizeName(name) + '_variant';
}

function positionName(name) {
    return standardizeName(name) + '_position';
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
    featureName,
    variantName,
    assemblyName,
    assemblyVirtualVariantName,
    positionName,
    attributeName,
    assemblyToPositionName,
    featureToAttributeName,
    attributeCategoryName,
    isNodeOptional
};