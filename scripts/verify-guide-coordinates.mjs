import { readFile } from "node:fs/promises"

const source = await readFile("app/_components/LocalGuideMap.tsx", "utf8")
const entries = [...source.matchAll(/\{ name: "([^"]+)", category: "([^"]+)", area: "([^"]+)".*?lat: (-?\d+(?:\.\d+)?), lng: (-?\d+(?:\.\d+)?)/g)]
  .map(([, name, category, area, lat, lng]) => ({ name, category, area, lat: Number(lat), lng: Number(lng) }))

const duplicateNames = entries
  .map(({ name }) => name.toLocaleLowerCase())
  .filter((name, index, values) => values.indexOf(name) !== index)
const invalidCoordinates = entries.filter(({ lat, lng }) => !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)

if (duplicateNames.length || invalidCoordinates.length) {
  throw new Error(`Invalid guide data: duplicates=${[...new Set(duplicateNames)].join(", ") || "none"}; invalid=${invalidCoordinates.map(({ name }) => name).join(", ") || "none"}`)
}

console.log(JSON.stringify({ poiCount: entries.length, areas: [...new Set(entries.map(({ area }) => area))], categories: [...new Set(entries.map(({ category }) => category))] }, null, 2))
