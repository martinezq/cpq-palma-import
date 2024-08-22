export function processNodesRecursively(nodes, fn, ctx = {}) {
    nodes.forEach(node => {
        fn(node, ctx);
        processNodesRecursively(node.nodes || [], fn, ctx);
    });
}

export function extractNodes(nodes, fn) {
    let ctx = { result: [] };
    processNodesRecursively(nodes, n => {
        const ok = Boolean(fn(n));
        if (ok) {
            ctx.result.push(n);
        }
    }, ctx);
    return ctx.result;
}

export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
