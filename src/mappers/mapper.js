import * as R from 'ramda';

import * as utils from '../utils.js';
import { extractAssemblies, optimizeAssemblies } from './assembly-mapper.js';
import {
    references_domain_name,
    references_domain_description,
    none_domain_element_name,
    none_variant_name,
    none_variant_description,
    reference_global_feature_name,
    reference_global_feature_description,
    technical_attribute_category_name,
    technical_attribute_category_description,
    domainName,
    domainElementName,
    referenceValue,
    domainType,
    moduleNameFromModule,
    featureName,
    variantNameFromVariant,
    attributeCategoryName,
    isNodeOptional
} from './mapper-commons.js';

// ----------------------------------------------------------------------------

export function palmaToTacton(input) {

    input = applyInheritance(input);

    const fullAssemblies = extractAssemblies(input);
    const optimizedAssemblies = optimizeAssemblies(fullAssemblies);
    
    return {
        domains: extractDomains(input),
        categories: generateAttributeCategories(input),
        globalFeatures: generateGlobalFeatures(input),        
        modules: extractModules(input),
        assemblies: optimizedAssemblies //.filter(a => a.name === 'palma_li_ion_pack_assembly')
    };
}

// ----------------------------------------------------------------------------

function applyInheritance(input) {
    const copy = R.clone(input);

    function applyInheritanceToNode(node, ctx = {}) {

        node._parentNode = ctx.parent;

        if (ctx.optional) {
            node._optionalInherited = true;
        } else {
            ctx.optional = node.optional;
        }

        ctx.parent = node;
        
        node.nodes?.forEach(n => applyInheritanceToNode(n, ctx));
    }

    copy.configurationIntent.productStructure.forEach(n => applyInheritanceToNode(n));

    return copy;
}

// ----------------------------------------------------------------------------

function extractDomains(input) {

    const systemDomains = input.configurationIntent.systemProperties.map(p => ({
        name: domainName(p.name),
        description: p.name,
        type: 'Enum',
        enumElementList: p.values.map(v => ({
            name: domainElementName(v.value),
            description: v.value
        }))
    }));

    const productDomains = input.configurationIntent.properties
        .map(p => ({
            name: domainName(p.name),
            description: p.name,
            type: domainType(p),
            enumElementList: domainType(p) === 'Enum' ? p.values.map(v => ({
                name: domainElementName(v.value),
                description: v.value,
                value: p.integer ? v.value : undefined
            })) : undefined,
            booleanYes: domainType(p) === 'Boolean' ? { name: 'Yes' } : undefined,
            booleanNo: domainType(p) === 'Boolean' ? { name: 'No' } : undefined,
            integerRange: domainType(p) === "Integer" ? { min: p.values[0].minValue, max: p.values[0].maxValue } : undefined,
            floatRange: domainType(p) === "Float" ? { min: p.values[0].minValue, max: p.values[0].maxValue } : undefined,
            valueType: (domainType(p) === 'Enum' && p.integer) ? 'Integer' : undefined
        }));

    const references = [none_domain_element_name].concat(R.uniq(R.flatten(input.configurationIntent.modules.map(m => m.variants?.map(v => v.reference))).filter(r => Boolean(r))));

    const referenceDomain = {
        name: references_domain_name,
        description: references_domain_description,
        type: 'Enum',
        enumElementList: references.map(r => ({
            name: referenceValue(r)
        }))
    };

    return systemDomains.concat(productDomains).concat([referenceDomain]);
}

// ----------------------------------------------------------------------------

function generateAttributeCategories(input) {

    const tabs = utils.extractNodes(input.configurationIntent.configuratorUserInterface, n => n.type === 'ConfiguratorTab');

    return tabs.map(t => ({
        name: attributeCategoryName(t.name),
        description: t.name
    })).concat([{
        name: technical_attribute_category_name,
        description: technical_attribute_category_description
    }]);
}

function generateGlobalFeatures() {
    return [{
        name: reference_global_feature_name,
        description: reference_global_feature_description,
        domain: { name: references_domain_name },
        initialValue: 'unspecified'
    }];
}

// ----------------------------------------------------------------------------

function extractModules(input) {
    
    function lookupProperty({propertyUid}) {
        const allProps = input.configurationIntent.properties.concat(input.configurationIntent.systemProperties);
        return allProps.find(p => p.uid === propertyUid);
    }

    function lookupNodesByRealizationUid(realizationUid, nodes, parentNode, buf = []) {
        if (!nodes || nodes.length === 0) {
            return buf;
        }

        const matchedNodes = nodes.filter(n => n.type === 'ModuleInstanceNode' && n.realization === realizationUid);

        matchedNodes.forEach(n => buf.push({ node: n, parentNode }));

        nodes.map(node => lookupNodesByRealizationUid(realizationUid, node.nodes, node, buf));

        return buf;
    }

    function extractModule(m) {
        const nodes = lookupNodesByRealizationUid(m.uid, input.configurationIntent.productStructure);
        const anyNodeIsOptional = Boolean(nodes.find(({ node, parentNode }) => isNodeOptional(node, parentNode)));

        let variants = m.variants?.map(v => extractModuleVariant(v, m)) || [];

        if(anyNodeIsOptional || true) {
            const globalFeatureValues = [{
                feature: { name: reference_global_feature_name },
                value: 'unspecified'
            }];
    
            const standardFeatureValues = [{
                feature: { name: 'isNonStandard' },
                value: 'unspecified'
            }];

            variants.unshift({
                name: none_variant_name,
                description: none_variant_description,
                values: (m.propertyRelations || []).map(pr => ({
                    feature: { name: featureName(lookupProperty(pr).name) },
                    value: 'unspecified'
                })).concat(globalFeatureValues).concat(standardFeatureValues)
            });
        }

        return {
            name: moduleNameFromModule(m),
            description: m.name,
            features: m.propertyRelations?.map(pr => ({
                name: featureName(lookupProperty(pr).name),
                description: lookupProperty(pr).name,
                domain: { name: domainName(lookupProperty(pr).name) }
            })),
            variants
        };
    }

    function extractModuleVariant(v, m) {
        const localFeatureValues = v.propertyRelations.map(pr => ({
            feature: { name: featureName(lookupProperty(pr).name) },
            value: pr.valueRelations.map(vr => vr.value ? domainElementName(vr.value) : 'unspecified').join(';')
        }));

        const missingModuleFeatureValues = 
            (m.propertyRelations || []).filter(mpr => !v.propertyRelations?.find(vpr => vpr.propertyUid === mpr.propertyUid))
            .map(pr => ({
                feature: { name: featureName(lookupProperty(pr).name) },
                value: 'unspecified'
            }));

        const globalFeatureValues = [{
            feature: { name: reference_global_feature_name },
            value: referenceValue(v.reference) || none_domain_element_name
        }];

        const standardFeatureValues = [{
            feature: { name: 'isNonStandard' },
            value: 'unspecified'
        }];

        return {
            name: variantNameFromVariant(v),
            description: v.name,
            values: localFeatureValues.concat(missingModuleFeatureValues).concat(globalFeatureValues).concat(standardFeatureValues)
        };
    }

    return input.configurationIntent.modules.map(m => extractModule(m));
}
