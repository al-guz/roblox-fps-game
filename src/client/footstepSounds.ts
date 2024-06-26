const sfx: {[id: string] : string} = {
    "DiamondPlate": "rbxassetid://9064974448",
    "Grass": "rbxassetid://9060100945",
}

export function findSFX(material: string) : string {
    return sfx[material]
}

export function enumToString(enum_: Enum.Material) : string {
    const tostring_ = tostring(enum_)
    const split = tostring_.split(".")
    return split[split.size()-1]
}