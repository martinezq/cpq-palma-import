export function indexInput(input) {

    let propertyMap = {};

    const allProps = input.configurationIntent.properties.concat(input.configurationIntent.systemProperties);
    allProps.forEach(p => propertyMap[p.uid] = p);
        
    return {
        rawInput: input,
        propertyMap
    }
}