import * as R from 'ramda';

import {
    technical_attribute_category_name,
} from './mapper-commons.js';

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
