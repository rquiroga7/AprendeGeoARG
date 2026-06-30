import provincesList from './provinces.json'

const cache = {}

export function getProvinces() {
  return provincesList
}

export function getProvinceName(key) {
  const p = provincesList.find(p => p.key === key)
  return p ? p.name : key
}

export async function loadProvinceData(provinceKey) {
  if (cache[provinceKey]) return cache[provinceKey]
  const mod = await import(`./provinces/${provinceKey}.json`)
  cache[provinceKey] = mod.default
  return mod.default
}

export function getDeptTerm(provinceKey, plural = false, capitalize = false) {
  const isBA = provinceKey === 'buenos_aires'
  let term
  if (plural) term = isBA ? 'partidos' : 'departamentos'
  else term = isBA ? 'partido' : 'departamento'
  if (capitalize) term = term.charAt(0).toUpperCase() + term.slice(1)
  return term
}

export function computeLevelSizes(totalDepartments) {
  const numLevels = Math.min(6, Math.max(1, Math.floor(totalDepartments / 4)))
  const sizes = []
  for (let i = 1; i <= numLevels; i++) {
    const size = Math.round(i * totalDepartments / numLevels)
    if (!sizes.includes(size) && size >= 1) {
      sizes.push(size)
    }
  }
  if (sizes[sizes.length - 1] !== totalDepartments) {
    sizes[sizes.length - 1] = totalDepartments
  }
  return sizes
}
