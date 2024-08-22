import * as R from 'ramda';
import {
    moduleNameFromModule,
    assemblyNameFromNode,
    positionNameFromNode,
    isNodeOptional,
    isNodeVariable,
    isPositionNode,
    isModulePositionNode,
    isAssemblyPositionNode,
    isNodeFixedQty,
    lookupModuleByUid
} from './mapper-commons.js';

export function extractPositions(node, inputIndexed) {
    
    const positionNodes = node.nodes?.filter(isPositionNode) || [];

    return positionNodes.map(pn => ({
        name: positionNameFromNode(pn),
        description: pn.name,
        module: isModulePositionNode(pn) ? { name: moduleNameFromModule(lookupModuleByUid(pn.realization, inputIndexed))} : undefined,
        assembly: isAssemblyPositionNode(pn) ? { name: assemblyNameFromNode(pn)} : undefined,
        qtyMin: extractPositionMinQty(pn),
        qtyMax: extractPositionMaxQty(pn)
    }));
}

function extractPositionMinQty(positionNode) {
    if (isNodeOptional(positionNode) || isNodeVariable(positionNode)) return 0;

    if (positionNode.cases.length > 0) {
        const casesMinQty = positionNode.cases?.map(c => c.quantity)?.reduce(R.min, 999999);
        if (casesMinQty !== undefined) return casesMinQty;
    }

    return positionNode.quantity;
}

function extractPositionMaxQty(positionNode) {
    if (isNodeVariable(positionNode)) return 999999;

    if (positionNode.cases.length > 0) {
        const casesMaxQty = positionNode.cases?.map(c => c.quantity).reduce(R.max, 0);
        if (casesMaxQty !== undefined) return casesMaxQty;
    }

    return positionNode.quantity;
}

// ----------------------------------------------------------------------------

export const _test = {
    extractPositionMaxQty,
    extractPositionMinQty
};