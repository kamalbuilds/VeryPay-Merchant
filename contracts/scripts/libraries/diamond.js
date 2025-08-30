/* global ethers */

const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 }

// Get function selectors from ABI
function getSelectors(contract) {
  const signatures = Object.keys(contract.interface.functions)
  const selectors = signatures.reduce((acc, val) => {
    if (val !== 'init(bytes)') {
      acc.push(contract.interface.getFunction(val).selector)
    }
    return acc
  }, [])
  selectors.contract = contract
  selectors.remove = remove
  selectors.get = get
  return selectors
}

// Get function selector from function signature
function getSelector(func) {
  const abiInterface = new ethers.Interface([func])
  return abiInterface.getFunction(func).selector
}

// Used with getSelectors to remove selectors from an array of selectors
// functionNames argument is an array of function signatures
function remove(functionNames) {
  const selectors = this.filter((v) => {
    for (const functionName of functionNames) {
      if (v === this.contract.interface.getFunction(functionName).selector) {
        return false
      }
    }
    return true
  })
  selectors.contract = this.contract
  selectors.remove = this.remove
  selectors.get = this.get
  return selectors
}

// Used with getSelectors to get selectors from an array of selectors
// functionNames argument is an array of function signatures
function get(functionNames) {
  const selectors = this.filter((v) => {
    for (const functionName of functionNames) {
      if (v === this.contract.interface.getFunction(functionName).selector) {
        return true
      }
    }
    return false
  })
  selectors.contract = this.contract
  selectors.remove = this.remove
  selectors.get = this.get
  return selectors
}

// Remove selectors using an array of signatures
function removeSelectors(selectors, signatures) {
  const iface = new ethers.Interface(signatures.map(v => 'function ' + v))
  const removeSelectors = signatures.map(v => iface.getFunction(v).selector)
  selectors = selectors.filter(v => !removeSelectors.includes(v))
  return selectors
}

// Find a particular address position in the return value of diamondLoupe.facets()
function findAddressPositionInFacets(facetAddress, facets) {
  for (let i = 0; i < facets.length; i++) {
    if (facets[i].facetAddress === facetAddress) {
      return i
    }
  }
}

exports.getSelectors = getSelectors
exports.getSelector = getSelector
exports.FacetCutAction = FacetCutAction
exports.remove = remove
exports.removeSelectors = removeSelectors
exports.findAddressPositionInFacets = findAddressPositionInFacets