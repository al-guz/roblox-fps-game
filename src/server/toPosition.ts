import { Workspace } from "@rbxts/services";

export function getCharactersInWorkspace(blacklist?: string) : Model[] {
    const models : Array<Model> = []

    Promise.each(Workspace.GetDescendants(), (instance) => {
        if (instance.IsA("Model") && instance.FindFirstChild("Humanoid") && instance.Name !== blacklist) {
            models.insert(models.size(), instance)
        }
    })

    return models
}

export function getAccessoriesInWorkspace() : Accessory[] {
    const accessories: Accessory[] = []

    Promise.each(Workspace.GetDescendants(), (instance) => {
        if (instance.IsA("Accessory")) {
            accessories.insert(accessories.size(), instance)
        }
    }).await()

    return accessories
}

export function toPosition(start: Vector3, direction: Vector3, raycastParams : RaycastParams | undefined) : [Vector3, boolean, RaycastResult | undefined] {
    // if (!raycastParams) {raycastParams = new RaycastParams()}
    const results = Workspace.Raycast(start, direction, raycastParams)
    if (results) {
        return [results.Position, true, results]
    } else {
        return [start.add(direction).mul(999), false, undefined]
    }
}