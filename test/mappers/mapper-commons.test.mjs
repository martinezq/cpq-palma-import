import { expect } from 'chai';  // Import Chai's expect function

import { 
    standardizeName, 
    standardizeCodeFromNode, 
    domainName, 
    domainElementName, 
    referenceValue, 
    domainType, 
    moduleNameFromModule, 
    moduleName, 
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
} from '../../src/mappers/mapper-commons.js';

// ----------------------------------------------------------------------------
// Test cases for standardizeName
describe('standardizeName', () => {
    it('should replace special characters and convert to lowercase', () => {
        expect(standardizeName('Test+Name<>')).to.equal('testplusnameltgt');
    });

    it('should handle empty input', () => {
        expect(standardizeName('')).to.equal('_missing');
    });

    it('should trim underscores at the beginning and end', () => {
        expect(standardizeName('_Test_Name_')).to.equal('test_name');
    });
});

// ----------------------------------------------------------------------------
// Test cases for standardizeCodeFromNode
describe('standardizeCodeFromNode', () => {
    it('should standardize the node code', () => {
        const node = { type: 'Child', code: 'Test+Code', uid: '123456' };
        expect(standardizeCodeFromNode(node)).to.equal('testpluscode_');
    });

    it('should use node uid if code is n/a', () => {
        const node = { type: 'Child', code: 'n/a', uid: '123456' };
        expect(standardizeCodeFromNode(node)).to.equal('123456_');
    });

    it('should return empty string if node type is Root', () => {
        const node = { type: 'Root', code: 'Test+Code', uid: '123456' };
        expect(standardizeCodeFromNode(node)).to.equal('');
    });
});

// ----------------------------------------------------------------------------
// Test cases for domainName
describe('domainName', () => {
    it('should generate a domain name with prefix', () => {
        expect(domainName('My Domain')).to.equal('palma_my_domain_domain');
    });
});

// ----------------------------------------------------------------------------
// Test cases for domainElementName
describe('domainElementName', () => {
    it('should return "Yes" or "No" as is', () => {
        expect(domainElementName('Yes')).to.equal('Yes');
        expect(domainElementName('No')).to.equal('No');
    });

    it('should standardize other names', () => {
        expect(domainElementName('Test Element')).to.equal('test_element');
    });
});

// ----------------------------------------------------------------------------
// Test cases for referenceValue
describe('referenceValue', () => {
    it('should trim the input value', () => {
        expect(referenceValue('  Test Value  ')).to.equal('Test Value');
    });
});

// ----------------------------------------------------------------------------
// Test cases for domainType
describe('domainType', () => {
    it('should return Enum for LIST type', () => {
        expect(domainType({ type: 'LIST' })).to.equal('Enum');
    });

    it('should return Boolean for YESNO type', () => {
        expect(domainType({ type: 'YESNO' })).to.equal('Boolean');
    });

    it('should return Integer for RANGE type with integer', () => {
        expect(domainType({ type: 'RANGE', integer: true })).to.equal('Integer');
    });

    it('should return Float for RANGE type without integer', () => {
        expect(domainType({ type: 'RANGE', integer: false })).to.equal('Float');
    });

    it('should return String for other types', () => {
        expect(domainType({ type: 'OTHER' })).to.equal('String');
    });
});

// ----------------------------------------------------------------------------
// Test cases for moduleNameFromModule
describe('moduleNameFromModule', () => {
    it('should generate module name with code and name', () => {
        const module = { code: 'MOD123', name: 'Test Module' };
        expect(moduleNameFromModule(module)).to.equal('palma_mod123_test_module_module');
    });

    it('should omit code if it is n/a', () => {
        const module = { code: 'n/a', name: 'Test Module' };
        expect(moduleNameFromModule(module)).to.equal('palma_test_module_module');
    });
});

// ----------------------------------------------------------------------------
// Test cases for moduleName
describe('moduleName', () => {
    it('should generate module name with prefix', () => {
        expect(moduleName('My Module')).to.equal('palma_my_module_module');
    });
});

// ----------------------------------------------------------------------------
// Test cases for featureName
describe('featureName', () => {
    it('should generate feature name', () => {
        expect(featureName('Feature 1')).to.equal('feature_1_feature');
    });
});

// ----------------------------------------------------------------------------
// Test cases for variantName
describe('variantName', () => {
    it('should generate variant name', () => {
        expect(variantName('Variant A')).to.equal('variant_a_variant');
    });
});

// ----------------------------------------------------------------------------
// Test cases for variantNameFromVariant
describe('variantNameFromVariant', () => {
    it('should generate variant name with code and name', () => {
        const variant = { code: 'VAR123', name: 'Variant A' };
        expect(variantNameFromVariant(variant)).to.equal('var123_variant_a_variant');
    });

    it('should omit code if it is n/a', () => {
        const variant = { code: 'n/a', name: 'Variant A' };
        expect(variantNameFromVariant(variant)).to.equal('variant_a_variant');
    });
});

// ----------------------------------------------------------------------------
// Test cases for assemblyName
describe('assemblyName', () => {
    it('should generate assembly name with prefix', () => {
        expect(assemblyName('My Assembly')).to.equal('palma_my_assembly_assembly');
    });
});

// ----------------------------------------------------------------------------
// Test cases for assemblyNameFromNode
describe('assemblyNameFromNode', () => {
    it('should generate assembly name with code and name', () => {
        const node = { type: 'Child', code: 'ASM123', name: 'Assembly X', uid: '654321' };
        expect(assemblyNameFromNode(node)).to.equal('palma_asm123_assembly_x_assembly');
    });

    it('should use node uid if code is n/a', () => {
        const node = { type: 'Child', code: 'n/a', name: 'Assembly X', uid: '654321' };
        expect(assemblyNameFromNode(node)).to.equal('palma_654321_assembly_x_assembly');
    });
});

// ----------------------------------------------------------------------------
// Test cases for assemblyVirtualVariantName
describe('assemblyVirtualVariantName', () => {
    it('should generate virtual variant name', () => {
        expect(assemblyVirtualVariantName('Virtual Variant')).to.equal('virtual_variant_variant');
    });
});

// ----------------------------------------------------------------------------
// Test cases for positionName
describe('positionName', () => {
    it('should generate position name', () => {
        expect(positionName('Position A')).to.equal('position_a_position');
    });
});

// ----------------------------------------------------------------------------
// Test cases for positionNameFromNode
describe('positionNameFromNode', () => {
    it('should generate position name with code and name', () => {
        const node = { type: 'Child', code: 'POS123', name: 'Position X', uid: '987654' };
        expect(positionNameFromNode(node)).to.equal('pos123_position_x_position');
    });

    it('should use node uid if code is n/a', () => {
        const node = { type: 'Child', code: 'n/a', name: 'Position X', uid: '987654' };
        expect(positionNameFromNode(node)).to.equal('987654_position_x_position');
    });
});

// ----------------------------------------------------------------------------
// Test cases for attributeName
describe('attributeName', () => {
    it('should generate attribute name', () => {
        expect(attributeName('Attribute A')).to.equal('attribute_a_attribute');
    });
});

// ----------------------------------------------------------------------------
// Test cases for assemblyToPositionName
describe('assemblyToPositionName', () => {
    it('should replace _assembly suffix with _position', () => {
        expect(assemblyToPositionName('palma_my_assembly_assembly')).to.equal('my_assembly_position');
    });
});

// ----------------------------------------------------------------------------
// Test cases for featureToAttributeName
describe('featureToAttributeName', () => {
    it('should replace _feature suffix with _attribute', () => {
        expect(featureToAttributeName('feature_1_feature')).to.equal('feature_1_attribute');
    });
});

// ----------------------------------------------------------------------------
// Test cases for attributeCategoryName
describe('attributeCategoryName', () => {
    it('should generate attribute category name', () => {
        expect(attributeCategoryName('Category X')).to.equal('palma_category_x_category');
    });
});

// ----------------------------------------------------------------------------
// Test cases for isNodeOptional
describe('isNodeOptional', () => {
    it('should return true if node is optional', () => {
        const node = { optional: true, _optionalInherited: false };
        expect(isNodeOptional(node)).to.be.true;
    });

    it('should return true if node is inherited as optional', () => {
        const node = { optional: false, _optionalInherited: true };
        expect(isNodeOptional(node)).to.be.true;
    });

    it('should return false if node is not optional', () => {
        const node = { optional: false, _optionalInherited: false };
        expect(isNodeOptional(node)).to.be.false;
    });
});
