const { GraphQLClient, gql } = require('graphql-request');

function createClient(endpoint, authorization) {
    const gqlClient = new GraphQLClient(endpoint, { headers: { authorization } });

    return {
        createDomains: (variables) => handleErrors(gqlClient.request(createDomains, variables).then(r => r.result || r)),
        createGlobalFeatures: (variables) => handleErrors(gqlClient.request(createGlobalFeatures, variables).then(r => r.result || r)),
        createAttributeCategories: (variables) => handleErrors(gqlClient.request(createAttributeCategories, variables).then(r => r.result || r)),
        createModule: (variables) => handleErrors(gqlClient.request(createModule, variables).then(r => r.result || r)),
        createModules: (variables) => handleErrors(gqlClient.request(createModules, variables).then(r => r.result || r)),
        createModulesAsync: (variables) => handleErrors(gqlClient.request(createModulesAsync, variables).then(r => r.result || r)),
        createAssemblies: (variables) => handleErrors(gqlClient.request(createAssemblies, variables).then(r => r.result || r)),
        createAssembly: (variables) => handleErrors(gqlClient.request(createAssembly, variables).then(r => r.result || r)),
        job: (variables) => handleErrors(gqlClient.request(job, variables).then(r => r.result || r)),
    };
}

function handleErrors(promise) {
    return promise
        .catch(e => {
            console.log('ERROR', e);
            return Promise.reject(e);
        })
}

// QUERIES

const createGlobalFeatures = gql`
    mutation($globalFeatures: [FeatureInput]!) {
        upsertGlobalFeatures(features: $globalFeatures) {
            id
        }
    }
`;

const createAttributeCategories = gql`
    mutation($categories: [AssemblyAttributeCategoryInput]!) {
        upsertAttributeCategories(categories: $categories) {
            name
        }
    }
`;

const createDomains = gql`
    mutation($domains: [DomainInput]!) {
        upsertDomains(domains: $domains) {
            id
        }
    }
`;

const createModule = gql`
    mutation($module: ModuleInput!) {
        upsertModule(module: $module) {
            id
        }
    }
`;


const createModules = gql`
    mutation($modules: [ModuleInput]!) {
        upsertModules(modules: $modules) {
            id
        }
    }
`;

const createModulesAsync = gql`
    mutation($modules: [ModuleInput]!) {
        upsertModulesAsync(modules: $modules)
    }
`;


const createAssemblies = gql`
    mutation($assemblies: [AssemblyInput]!) {
        upsertAssemblies(assemblies: $assemblies) {
            id
        }
    }
`;

const createAssembly = gql`
    mutation($assembly: AssemblyInput!) {
        upsertAssembly(assembly: $assembly) {
            id
        }
    }
`;

const job = gql`
    query($id: ID!) {
        job(id: $id) {
            id
            status
            error
        }
    }
`;

module.exports = {
    createClient
}